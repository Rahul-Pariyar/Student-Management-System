from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count, Q, Avg
from django.utils import timezone

from .models import AttendanceSession, AttendanceRecord, AttendanceSummary
from .serializers import (
    AttendanceSessionSerializer, AttendanceRecordSerializer,
    BulkAttendanceSerializer, AttendanceSummarySerializer,
)
from academic.models import (
    TeacherSubjectAssignment, StudentEnrollment, Class, Subject,
)
from accounts.api_views_new import IsAdmin, IsTeacher


# ─── Attendance Sessions ─────────────────────────────────────────

class SessionListCreate(generics.ListCreateAPIView):
    serializer_class = AttendanceSessionSerializer
    filterset_fields = ['teacher_assignment', 'date', 'is_completed']

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceSession.objects.select_related(
            'teacher_assignment__subject',
            'teacher_assignment__class_assigned',
            'teacher_assignment__teacher__user',
        ).order_by('-date', '-start_time')

        if user.user_type == 'teacher':
            return qs.filter(teacher_assignment__teacher=user.teacher_profile)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacher()]
        return [permissions.IsAuthenticated()]


class SessionDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = AttendanceSession.objects.all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsTeacher]


# ─── Attendance Records ──────────────────────────────────────────

class RecordList(generics.ListAPIView):
    serializer_class = AttendanceRecordSerializer
    filterset_fields = ['session', 'student', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceRecord.objects.select_related(
            'session__teacher_assignment__subject', 'student__user'
        )
        if user.user_type == 'student':
            return qs.filter(student=user.student_profile)
        elif user.user_type == 'teacher':
            return qs.filter(session__teacher_assignment__teacher=user.teacher_profile)
        elif user.user_type == 'parent':
            children = user.parent_profile.children.all()
            return qs.filter(student__in=children)
        return qs


# ─── Bulk Mark Attendance ─────────────────────────────────────────

class BulkMarkAttendanceView(APIView):
    """Create a session and mark attendance for all students at once."""
    permission_classes = [IsTeacher]

    @transaction.atomic
    def post(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ta = generics.get_object_or_404(
            TeacherSubjectAssignment, pk=data['teacher_assignment']
        )

        session = AttendanceSession.objects.create(
            teacher_assignment=ta,
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            topic_covered=data.get('topic_covered', ''),
            notes=data.get('notes', ''),
            is_completed=True,
        )

        records_created = []
        for rec in data['records']:
            record = AttendanceRecord.objects.create(
                session=session,
                student_id=rec['student'],
                status=rec['status'],
                remarks=rec.get('remarks', ''),
            )
            records_created.append(record)

        return Response({
            'session': AttendanceSessionSerializer(session).data,
            'records_count': len(records_created),
        }, status=status.HTTP_201_CREATED)


# ─── Students for a Teacher Assignment ────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def students_for_assignment(request):
    """Return enrolled students for a given teacher_assignment_id."""
    ta_id = request.query_params.get('teacher_assignment')
    if not ta_id:
        return Response({'detail': 'teacher_assignment param required.'}, status=400)

    ta = generics.get_object_or_404(TeacherSubjectAssignment, pk=ta_id)
    enrollments = StudentEnrollment.objects.filter(
        class_enrolled=ta.class_assigned, is_active=True
    ).select_related('student__user')

    students = [
        {
            'id': e.student.id,
            'name': str(e.student),
            'student_id': e.student.student_id,
        }
        for e in enrollments
    ]
    return Response(students)


# ─── View Attendance (filtered by role) ───────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def view_attendance(request):
    """View attendance records, filtered appropriately by user role."""
    user = request.user
    subject_id = request.query_params.get('subject')
    class_id = request.query_params.get('class')
    student_id = request.query_params.get('student')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    qs = AttendanceRecord.objects.select_related(
        'session__teacher_assignment__subject',
        'session__teacher_assignment__class_assigned',
        'session__teacher_assignment__teacher__user',
        'student__user',
    )

    if user.user_type == 'student':
        qs = qs.filter(student=user.student_profile)
    elif user.user_type == 'teacher':
        qs = qs.filter(session__teacher_assignment__teacher=user.teacher_profile)
    elif user.user_type == 'parent':
        children = user.parent_profile.children.all()
        qs = qs.filter(student__in=children)
        if student_id:
            qs = qs.filter(student_id=student_id)

    if subject_id:
        qs = qs.filter(session__teacher_assignment__subject_id=subject_id)
    if class_id:
        qs = qs.filter(session__teacher_assignment__class_assigned_id=class_id)
    if date_from:
        qs = qs.filter(session__date__gte=date_from)
    if date_to:
        qs = qs.filter(session__date__lte=date_to)

    qs = qs.order_by('-session__date', '-session__start_time')
    return Response(AttendanceRecordSerializer(qs[:200], many=True).data)


# ─── Attendance Reports ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def attendance_reports(request):
    """Aggregated attendance reports by class/subject."""
    user = request.user
    class_id = request.query_params.get('class')
    subject_id = request.query_params.get('subject')

    sessions = AttendanceSession.objects.all()
    if user.user_type == 'teacher':
        sessions = sessions.filter(teacher_assignment__teacher=user.teacher_profile)
    if class_id:
        sessions = sessions.filter(teacher_assignment__class_assigned_id=class_id)
    if subject_id:
        sessions = sessions.filter(teacher_assignment__subject_id=subject_id)

    total_sessions = sessions.count()
    records = AttendanceRecord.objects.filter(session__in=sessions)
    total_records = records.count()
    present_count = records.filter(status__in=['present', 'late']).count()
    avg_pct = round(present_count / total_records * 100, 2) if total_records else 0

    # Per-student breakdown
    student_stats = []
    student_ids = records.values_list('student', flat=True).distinct()
    for sid in student_ids[:50]:
        s_records = records.filter(student_id=sid)
        s_total = s_records.count()
        s_present = s_records.filter(status__in=['present', 'late']).count()
        student_stats.append({
            'student_id': sid,
            'student_name': str(s_records.first().student) if s_records.exists() else '',
            'total': s_total,
            'present': s_present,
            'percentage': round(s_present / s_total * 100, 2) if s_total else 0,
        })

    return Response({
        'total_sessions': total_sessions,
        'average_attendance': avg_pct,
        'students': student_stats,
    })
