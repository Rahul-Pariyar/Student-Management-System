from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models, transaction
from django.db.models import Avg
from django_filters.rest_framework import DjangoFilterBackend
from tenants.mixins import TenantQuerysetMixin, get_request_tenant

from .models import ExamType, Examination, ExamResult, InternalComponent, InternalMark, ResultPublication
from .serializers import (
    ExamTypeSerializer, ExaminationSerializer, ExaminationCreateSerializer,
    ExamResultSerializer, BulkResultSerializer, InternalMarkSerializer,
    BulkInternalMarkSerializer, ResultPublicationSerializer,
)
from academic.models import StudentEnrollment, TeacherSubjectAssignment
from fees.models import StudentFee
from accounts.api_views_new import IsAdmin, IsTeacher, IsStudent, BlockImpersonation


# ─── Exam Types ───────────────────────────────────────────────────

class ExamTypeListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    queryset = ExamType.objects.all()
    serializer_class = ExamTypeSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Examinations ─────────────────────────────────────────────────

class ExaminationListCreate(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['subject', 'class_for', 'exam_type']
    search_fields = ['name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExaminationCreateSerializer
        return ExaminationSerializer

    def get_queryset(self):
        user = self.request.user
        tenant = get_request_tenant(self.request)
        qs = Examination.objects.select_related(
            'exam_type', 'subject', 'class_for', 'created_by'
        ).order_by('-exam_date')

        if tenant:
            qs = qs.filter(exam_type__tenant=tenant)

        if user.user_type == 'teacher':
            assigned = TeacherSubjectAssignment.objects.filter(
                teacher=user.teacher_profile
            ).values_list('subject', 'class_assigned')
            from django.db.models import Q
            q = Q()
            for subj, cls in assigned:
                q |= Q(subject_id=subj, class_for_id=cls)
            return qs.filter(q) if q else qs.none()
        elif user.user_type == 'student':
            enrollment = user.student_profile.get_current_enrollment()
            if enrollment:
                return qs.filter(class_for=enrollment.class_enrolled)
            return qs.none()
        elif user.user_type == 'parent':
            children = user.parent_profile.children.all()
            class_ids = StudentEnrollment.objects.filter(
                student__in=children, is_active=True
            ).values_list('class_enrolled', flat=True)
            return qs.filter(class_for__in=class_ids)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class ExaminationDetail(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = Examination.objects.select_related('exam_type', 'subject', 'class_for', 'created_by')
        if tenant:
            qs = qs.filter(exam_type__tenant=tenant)
        return qs

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ExaminationCreateSerializer
        return ExaminationSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Exam Results ─────────────────────────────────────────────────

class ResultListView(generics.ListAPIView):
    serializer_class = ExamResultSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['examination', 'student', 'is_passed', 'grade']
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def get_queryset(self):
        user = self.request.user
        qs = ExamResult.objects.select_related(
            'examination__subject', 'examination__exam_type',
            'student__user', 'entered_by__user',
        ).order_by('-created_at')

        if user.user_type == 'student':
            # Fee-blocking: only show results if no unpaid fees
            has_unpaid = StudentFee.objects.filter(
                student=user.student_profile,
                payment_status__in=['pending', 'partial', 'overdue'],
            ).exists()
            if has_unpaid:
                return qs.none()
            enrollment = user.student_profile.get_current_enrollment()
            if not enrollment:
                return qs.none()
            # Only published results: exam_type+class must be published
            published_types = ResultPublication.objects.filter(
                class_for=enrollment.class_enrolled,
                is_published=True,
            ).values_list('exam_type_id', flat=True)
            return qs.filter(
                student=user.student_profile,
                examination__class_for=enrollment.class_enrolled,
                examination__exam_type_id__in=published_types,
            )
        elif user.user_type == 'teacher':
            assigned = TeacherSubjectAssignment.objects.filter(
                teacher=user.teacher_profile
            ).values_list('subject', 'class_assigned')
            from django.db.models import Q
            q = Q()
            for subj, cls in assigned:
                q |= Q(examination__subject_id=subj, examination__class_for_id=cls)
            return qs.filter(q) if q else qs.none()
        elif user.user_type == 'parent':
            children = user.parent_profile.children.all()
            student_id = self.request.query_params.get('student')
            if student_id:
                has_unpaid = StudentFee.objects.filter(
                    student_id=student_id,
                    payment_status__in=['pending', 'partial', 'overdue'],
                ).exists()
                if has_unpaid:
                    return qs.none()
                # Only published results for the child's class
                child_enrollment = StudentEnrollment.objects.filter(
                    student_id=student_id, is_active=True
                ).first()
                if child_enrollment:
                    published_types = ResultPublication.objects.filter(
                        class_for=child_enrollment.class_enrolled,
                        is_published=True,
                    ).values_list('exam_type_id', flat=True)
                    return qs.filter(
                        student_id=student_id,
                        examination__class_for=child_enrollment.class_enrolled,
                        examination__exam_type_id__in=published_types,
                    )
                return qs.none()
            return qs.filter(
                student__in=children,
                examination__exam_type_id__in=ResultPublication.objects.filter(
                    is_published=True,
                ).values_list('exam_type_id', flat=True),
            )
        return qs


class ResultDetail(generics.RetrieveAPIView):
    queryset = ExamResult.objects.all()
    serializer_class = ExamResultSerializer
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]


# ─── Bulk Enter Results ───────────────────────────────────────────

class BulkEnterResultsView(APIView):
    """Enter results for multiple students in one exam."""
    permission_classes = [IsTeacher, BlockImpersonation]

    @transaction.atomic
    def post(self, request, exam_id):
        exam = generics.get_object_or_404(Examination, pk=exam_id)
        serializer = BulkResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        results_created = []
        for item in serializer.validated_data['results']:
            result, _ = ExamResult.objects.update_or_create(
                examination=exam,
                student_id=item['student'],
                defaults={
                    'marks_obtained': item['marks_obtained'],
                    'remarks': item.get('remarks', ''),
                    'entered_by': request.user.teacher_profile,
                },
            )
            results_created.append(result)

        return Response({
            'exam': ExaminationSerializer(exam).data,
            'results_count': len(results_created),
        }, status=status.HTTP_201_CREATED)


# ─── Result Stats for an Exam ─────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def exam_result_stats(request, exam_id):
    tenant = get_request_tenant(request)
    qs = Examination.objects.all()
    if tenant:
        qs = qs.filter(exam_type__tenant=tenant)
    exam = generics.get_object_or_404(qs, pk=exam_id)
    results = ExamResult.objects.filter(examination=exam)

    total = results.count()
    passed = results.filter(is_passed=True).count()
    avg = results.aggregate(avg=Avg('marks_obtained'))['avg'] or 0

    grade_dist = {}
    for r in results:
        grade_dist[r.grade] = grade_dist.get(r.grade, 0) + 1

    return Response({
        'exam_id': exam.id,
        'exam_name': exam.name,
        'total_students': total,
        'passed': passed,
        'failed': total - passed,
        'pass_percentage': round(passed / total * 100, 2) if total else 0,
        'average_marks': round(float(avg), 2),
        'grade_distribution': grade_dist,
    })


# ─── Internal Marks ───────────────────────────────────────────

class InternalMarksView(APIView):
    """
    GET  /examination/exams/<exam_id>/internal-marks/?student=<id>
         Returns all internal marks for an exam (optionally filtered by student).
    POST /examination/exams/<exam_id>/internal-marks/
         Bulk upsert internal marks for multiple students.
         Payload: { results: [ { student: id, marks: { component_id: value, ... }, remarks: "" } ] }
         After saving, recomputes ExamResult.marks_obtained = internal_total + external_marks.
    """
    permission_classes = [IsTeacher, BlockImpersonation]

    def get(self, request, exam_id):
        exam = generics.get_object_or_404(Examination, pk=exam_id)
        qs = InternalMark.objects.filter(
            component__examination=exam
        ).select_related('component', 'student__user')
        student_id = request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return Response(InternalMarkSerializer(qs, many=True).data)

    @transaction.atomic
    def post(self, request, exam_id):
        exam = generics.get_object_or_404(Examination, pk=exam_id)
        if not exam.has_internal:
            return Response({'detail': 'This exam does not use internal marks.'}, status=400)

        serializer = BulkInternalMarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        components = {str(c.id): c for c in exam.internal_components.all()}
        teacher = request.user.teacher_profile

        for item in serializer.validated_data['results']:
            student_id = item['student']
            marks_dict = item.get('marks', {})
            remarks = item.get('remarks', '')

            internal_total = 0
            for comp_id_str, mark_val in marks_dict.items():
                comp = components.get(str(comp_id_str))
                if not comp:
                    continue
                mark_val = min(float(mark_val), comp.max_marks)
                InternalMark.objects.update_or_create(
                    component=comp,
                    student_id=student_id,
                    defaults={'marks_obtained': mark_val, 'entered_by': teacher},
                )
                internal_total += mark_val

            # Recompute ExamResult if external marks already entered
            try:
                result = ExamResult.objects.get(examination=exam, student_id=student_id)
                if result.external_marks is not None:
                    result.marks_obtained = internal_total + float(result.external_marks)
                    result.remarks = remarks or result.remarks
                    result.save()
            except ExamResult.DoesNotExist:
                pass

        return Response({'detail': 'Internal marks saved.'}, status=status.HTTP_200_OK)


class ExternalMarksView(APIView):
    permission_classes = [IsTeacher, BlockImpersonation]

    @transaction.atomic
    def post(self, request, exam_id):
        exam = generics.get_object_or_404(Examination, pk=exam_id)
        if not exam.has_internal:
            return Response({'detail': 'Use /enter-results/ for exams without internal marks.'}, status=400)

        data = request.data.get('results', [])
        teacher = request.user.teacher_profile

        for item in data:
            student_id = item['student']
            ext = float(item['external_marks'])
            remarks = item.get('remarks', '')

            # Sum existing internal marks for this student
            internal_total = float(
                InternalMark.objects.filter(
                    component__examination=exam,
                    student_id=student_id,
                ).aggregate(total=models.Sum('marks_obtained'))['total'] or 0
            )

            final = internal_total + ext
            ExamResult.objects.update_or_create(
                examination=exam,
                student_id=student_id,
                defaults={
                    'marks_obtained': final,
                    'external_marks': ext,
                    'remarks': remarks,
                    'entered_by': teacher,
                },
            )

        return Response({'detail': 'External marks saved.'}, status=status.HTTP_200_OK)


# ─── Result Publications ──────────────────────────────────────────

class ResultPublicationListView(generics.ListAPIView):
    """
    List publication records for a given class, showing one row per exam type
    that has at least one exam for that class.
    GET /examination/classes/<class_id>/publications/
    """
    serializer_class = ResultPublicationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        class_id = self.kwargs['class_id']
        return ResultPublication.objects.filter(class_for_id=class_id).select_related('exam_type', 'class_for', 'published_by')

    def list(self, request, *args, **kwargs):
        class_id = self.kwargs['class_id']
        # Find all exam types that have exams for this class
        exam_types = ExamType.objects.filter(
            examination__class_for_id=class_id
        ).distinct()

        # Get existing publication records
        existing = {
            pub.exam_type_id: pub
            for pub in ResultPublication.objects.filter(class_for_id=class_id).select_related('exam_type', 'published_by')
        }

        # Build response: one entry per exam type
        result = []
        for et in exam_types:
            pub = existing.get(et.id)
            if pub:
                result.append(ResultPublicationSerializer(pub).data)
            else:
                # Virtual unpublished record
                result.append({
                    'id': None,
                    'exam_type': et.id,
                    'exam_type_name': et.name,
                    'class_for': int(class_id),
                    'class_name': None,
                    'is_published': False,
                    'published_by': None,
                    'published_by_name': None,
                    'published_at': None,
                })
        return Response(result)


class ResultPublicationToggleView(APIView):
    """
    POST /examination/classes/<class_id>/publications/<exam_type_id>/toggle/
    Creates or updates the publication record and toggles is_published.
    """
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, class_id, exam_type_id):
        tenant = get_request_tenant(request)
        # Verify exam_type belongs to this tenant
        et_qs = ExamType.objects.all()
        if tenant:
            et_qs = et_qs.filter(tenant=tenant)
        exam_type = generics.get_object_or_404(et_qs, pk=exam_type_id)
        pub, _ = ResultPublication.objects.get_or_create(
            exam_type=exam_type,
            class_for_id=class_id,
        )
        pub.is_published = not pub.is_published
        if pub.is_published:
            from django.utils import timezone
            pub.published_by = request.user
            pub.published_at = timezone.now()
        else:
            pub.published_by = None
            pub.published_at = None
        pub.save()
        return Response(ResultPublicationSerializer(pub).data)
