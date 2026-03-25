from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from attendance.models import AttendanceRecord
from tenants.mixins import TenantQuerysetMixin
from tenants.mixins import get_request_tenant

from .models import (
    AcademicYear, Department, Course, Subject, Class,
    StudentEnrollment, TeacherSubjectAssignment,
    Assignment, AssignmentSubmission,
)
from .serializers import (
    AcademicYearSerializer, DepartmentSerializer,
    CourseSerializer, SubjectSerializer,
    ClassSerializer, ClassDetailSerializer,
    StudentEnrollmentSerializer, TeacherSubjectAssignmentSerializer,
    AssignmentSerializer, AssignmentCreateSerializer,
    AssignmentSubmissionSerializer, SubmissionCreateSerializer,
    GradeSubmissionSerializer,
)
from accounts.api_views_new import IsAdmin, IsTeacher, IsStudent


# ─── Academic Year ────────────────────────────────────────────────

class AcademicYearListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    queryset = AcademicYear.objects.all().order_by('-start_date')
    serializer_class = AcademicYearSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class AcademicYearDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdmin]


# ─── Department ───────────────────────────────────────────────────

class DepartmentListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class DepartmentDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdmin]


# ─── Course ───────────────────────────────────────────────────────

class CourseListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = CourseSerializer
    filterset_fields = ['department']
    search_fields = ['name', 'code']
    tenant_field = 'department__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Course.objects.select_related('department').order_by('name')
        if tenant:
            qs = qs.filter(department__tenant=tenant)
        return qs

    def perform_create(self, serializer):
        # Course has no direct tenant FK — tenant is inherited via department
        serializer.save()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class CourseDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]
    tenant_field = 'department__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Course.objects.all()
        if tenant:
            qs = qs.filter(department__tenant=tenant)
        return qs


# ─── Subject ──────────────────────────────────────────────────────

class SubjectListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = SubjectSerializer
    filterset_fields = ['course', 'year', 'semester']
    search_fields = ['name', 'code']
    tenant_field = 'course__department__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Subject.objects.select_related('course').order_by('course', 'year', 'semester', 'name')
        if tenant:
            qs = qs.filter(course__department__tenant=tenant)
        return qs

    def perform_create(self, serializer):
        serializer.save()  # tenant inherited via course → department

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class SubjectDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [IsAdmin]
    tenant_field = 'course__department__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Subject.objects.all()
        if tenant:
            qs = qs.filter(course__department__tenant=tenant)
        return qs


# ─── Class ────────────────────────────────────────────────────────

class ClassListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = ClassSerializer
    filterset_fields = ['course', 'academic_year', 'year', 'semester']
    search_fields = ['name', 'section']
    tenant_field = 'academic_year__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Class.objects.select_related(
            'course', 'academic_year', 'class_teacher__user'
        ).order_by('name')
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        return qs

    def perform_create(self, serializer):
        serializer.save()  # tenant inherited via academic_year

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class ClassDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClassDetailSerializer
    permission_classes = [IsAdmin]
    tenant_field = 'academic_year__tenant'

    def get_queryset(self):
        tenant = self.get_tenant()
        qs = Class.objects.all()
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        return qs


# ─── Student Enrollment ──────────────────────────────────────────

class EnrollmentListCreate(generics.ListCreateAPIView):
    serializer_class = StudentEnrollmentSerializer
    filterset_fields = ['class_enrolled', 'is_active', 'student']

    def get_queryset(self):
        user = self.request.user
        tenant = user.tenant
        qs = StudentEnrollment.objects.select_related(
            'student__user', 'class_enrolled__course'
        )
        if tenant:
            qs = qs.filter(class_enrolled__academic_year__tenant=tenant)
        if user.user_type == 'student':
            return qs.filter(student=user.student_profile)
        elif user.user_type == 'teacher':
            class_ids = TeacherSubjectAssignment.objects.filter(
                teacher=user.teacher_profile
            ).values_list('class_assigned', flat=True)
            return qs.filter(class_enrolled__in=class_ids)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class EnrollmentDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentEnrollment.objects.all()
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsAdmin]


# ─── Enrollment Report ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def enrollment_report(request):
    tenant = get_request_tenant(request)
    courses = Course.objects.all()
    if tenant:
        courses = courses.filter(department__tenant=tenant)
    report = []
    for course in courses:
        classes = Class.objects.filter(course=course)
        class_data = []
        total = 0
        active = 0
        for cls in classes:
            enrolled = StudentEnrollment.objects.filter(class_enrolled=cls)
            active_count = enrolled.filter(is_active=True).count()
            class_data.append({
                'class_id': cls.id,
                'class_name': str(cls),
                'total': enrolled.count(),
                'active': active_count,
            })
            total += enrolled.count()
            active += active_count
        report.append({
            'course_id': course.id,
            'course_name': str(course),
            'total_enrolled': total,
            'active_enrolled': active,
            'classes': class_data,
        })
    return Response(report)


# ─── Teacher Subject Assignment ───────────────────────────────────

class TeacherAssignmentListCreate(generics.ListCreateAPIView):
    serializer_class = TeacherSubjectAssignmentSerializer
    filterset_fields = ['teacher', 'class_assigned', 'academic_year']

    def get_queryset(self):
        user = self.request.user
        tenant = get_request_tenant(self.request)
        qs = TeacherSubjectAssignment.objects.select_related(
            'teacher__user', 'subject', 'class_assigned', 'academic_year'
        )
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        if user.user_type == 'teacher':
            return qs.filter(teacher=user.teacher_profile)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class TeacherAssignmentDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = TeacherSubjectAssignment.objects.all()
    serializer_class = TeacherSubjectAssignmentSerializer
    permission_classes = [IsAdmin]


# ─── Assignment ───────────────────────────────────────────────────

class AssignmentListCreate(generics.ListCreateAPIView):
    filterset_fields = ['subject', 'class_assigned', 'assignment_type', 'is_active']
    search_fields = ['title']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AssignmentCreateSerializer
        return AssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        tenant = get_request_tenant(self.request)
        qs = Assignment.objects.select_related(
            'subject', 'class_assigned', 'teacher__user'
        ).order_by('-assigned_date')

        # Always scope to tenant first
        if tenant:
            qs = qs.filter(class_assigned__academic_year__tenant=tenant)

        if user.user_type == 'teacher':
            return qs.filter(teacher=user.teacher_profile)
        elif user.user_type == 'student':
            enrollment = user.student_profile.get_current_enrollment()
            if enrollment:
                return qs.filter(class_assigned=enrollment.class_enrolled, is_active=True)
            return qs.none()
        return qs

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user.teacher_profile)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacher()]
        return [permissions.IsAuthenticated()]


class AssignmentDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = Assignment.objects.all()
        if tenant:
            qs = qs.filter(class_assigned__academic_year__tenant=tenant)
        return qs

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsTeacher()]
        return [permissions.IsAuthenticated()]


# ─── Assignment Submissions ───────────────────────────────────────

class SubmissionListCreate(generics.ListCreateAPIView):
    filterset_fields = ['assignment']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SubmissionCreateSerializer
        return AssignmentSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        tenant = get_request_tenant(self.request)
        qs = AssignmentSubmission.objects.select_related(
            'assignment', 'student__user', 'graded_by__user'
        )
        if tenant:
            qs = qs.filter(assignment__class_assigned__academic_year__tenant=tenant)
        if user.user_type == 'student':
            return qs.filter(student=user.student_profile)
        elif user.user_type == 'teacher':
            return qs.filter(assignment__teacher=user.teacher_profile)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user.student_profile)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStudent()]
        return [permissions.IsAuthenticated()]


class SubmissionDetail(generics.RetrieveAPIView):
    queryset = AssignmentSubmission.objects.all()
    serializer_class = AssignmentSubmissionSerializer


class GradeSubmissionView(APIView):
    """Teacher grades a submission."""
    permission_classes = [IsTeacher]

    def post(self, request, pk):
        submission = generics.get_object_or_404(AssignmentSubmission, pk=pk)
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission.marks_obtained = serializer.validated_data['marks_obtained']
        submission.feedback = serializer.validated_data.get('feedback', '')
        submission.graded_by = request.user.teacher_profile
        submission.graded_at = timezone.now()
        submission.save()
        return Response(AssignmentSubmissionSerializer(submission).data)


# ─── Teacher Class Students ───────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def teacher_class_students(request, class_id):
    """Get students in a class with attendance stats."""
    cls = generics.get_object_or_404(Class, pk=class_id)
    enrollments = StudentEnrollment.objects.filter(
        class_enrolled=cls, is_active=True
    ).select_related('student__user')

    students = []
    for e in enrollments:
        records = AttendanceRecord.objects.filter(student=e.student)
        total = records.count()
        present = records.filter(status__in=['present', 'late']).count()
        students.append({
            'student_id': e.student.id,
            'name': str(e.student),
            'attendance_pct': round(present / total * 100, 2) if total else 0,
            'total_sessions': total,
            'present': present,
        })
    return Response(students)


# ─── Dropdown helpers (for forms) ─────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def courses_by_department(request):
    dept_id = request.query_params.get('department')
    if dept_id:
        courses = Course.objects.filter(department_id=dept_id)
    else:
        courses = Course.objects.all()
    return Response(CourseSerializer(courses, many=True).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def classes_by_course(request):
    course_id = request.query_params.get('course')
    if course_id:
        classes = Class.objects.filter(course_id=course_id)
    else:
        classes = Class.objects.all()
    return Response(ClassSerializer(classes, many=True).data)
