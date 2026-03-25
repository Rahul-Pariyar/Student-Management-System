from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import (
    User, AdminProfile, StudentProfile, TeacherProfile,
    ParentProfile, ParentTeacherMessage,
)
from .serializers import (
    UserSerializer, UserMinimalSerializer, UserCreateSerializer,
    ChangePasswordSerializer, AdminResetPasswordSerializer,
    AdminProfileSerializer, StudentProfileSerializer,
    StudentProfileCreateSerializer, TeacherProfileSerializer,
    TeacherProfileCreateSerializer, ParentProfileSerializer,
    ParentProfileCreateSerializer,
    MessageSerializer, MessageCreateSerializer,
)
from academic.models import (
    Course, Subject, Assignment, AssignmentSubmission,
    StudentEnrollment, TeacherSubjectAssignment, AcademicYear,
)
from attendance.models import AttendanceRecord, AttendanceSession
from fees.models import StudentFee
from examination.models import Examination
from tenants.mixins import get_request_tenant


# ─── Permission helpers ──────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Super admin impersonating counts as admin
        if request.user.user_type == 'super_admin' and hasattr(request, 'impersonated_tenant'):
            return True
        return request.user.user_type == 'admin'


class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'teacher'


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'student'


class IsParent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'parent'


def is_impersonating(request):
    """True when a super admin is acting inside a tenant via impersonation."""
    return (
        request.user.is_authenticated
        and request.user.user_type == 'super_admin'
        and hasattr(request, 'impersonated_tenant')
    )


class ImpersonationReadOnly(permissions.BasePermission):
    """
    When a super admin is impersonating:
      - GET requests are allowed (read-only)
      - POST/PUT/PATCH/DELETE are blocked
    Regular users are unaffected.
    """
    def has_permission(self, request, view):
        if is_impersonating(request):
            return request.method in permissions.SAFE_METHODS
        return True


class BlockImpersonation(permissions.BasePermission):
    """
    Completely blocks access to sensitive endpoints when impersonating.
    Use on fees, results, submissions, messages.
    """
    def has_permission(self, request, view):
        if is_impersonating(request):
            return False
        return True


# ─── Auth / Profile ─────────────────────────────────────────────

class MeView(APIView):
    """Return current authenticated user's profile."""

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data

        # Attach role-specific profile
        if user.user_type == 'admin' and hasattr(user, 'admin_profile'):
            data['profile'] = AdminProfileSerializer(user.admin_profile).data
        elif user.user_type == 'student' and hasattr(user, 'student_profile'):
            data['profile'] = StudentProfileSerializer(user.student_profile).data
        elif user.user_type == 'teacher' and hasattr(user, 'teacher_profile'):
            data['profile'] = TeacherProfileSerializer(user.teacher_profile).data
        elif user.user_type == 'parent' and hasattr(user, 'parent_profile'):
            data['profile'] = ParentProfileSerializer(user.parent_profile).data

        return Response(data)

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


# ─── Dashboard endpoints ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard(request):
    """Role-based dashboard data."""
    user = request.user

    # Super admin impersonating a tenant — serve admin dashboard
    effective_type = user.user_type
    if user.user_type == 'super_admin' and hasattr(request, 'impersonated_tenant'):
        effective_type = 'admin'

    if effective_type == 'admin':
        return _admin_dashboard(request)
    elif effective_type == 'student':
        return _student_dashboard(request)
    elif effective_type == 'teacher':
        return _teacher_dashboard(request)
    elif effective_type == 'parent':
        return _parent_dashboard(request)

    return Response({'detail': 'Unknown user type.'}, status=400)


def _admin_dashboard(request):
    tenant = getattr(request, 'impersonated_tenant', None) or request.user.tenant
    base_users = User.objects.filter(tenant=tenant) if tenant else User.objects.all()
    base_courses = Course.objects.filter(department__tenant=tenant) if tenant else Course.objects.all()

    data = {
        'total_students': base_users.filter(user_type='student').count(),
        'total_teachers': base_users.filter(user_type='teacher').count(),
        'total_parents': base_users.filter(user_type='parent').count(),
        'total_courses': base_courses.count(),
        'recent_users': UserMinimalSerializer(
            base_users.exclude(user_type='admin').order_by('-date_joined')[:5],
            many=True
        ).data,
    }
    return Response(data)


def _student_dashboard(request):
    user = request.user
    try:
        profile = user.student_profile
    except StudentProfile.DoesNotExist:
        return Response({'detail': 'Student profile not found.'}, status=404)

    enrollment = profile.get_current_enrollment()
    enrollment_data = None
    subjects = []
    assignments = []
    upcoming_exams = []
    attendance = {'percentage': 0, 'total': 0, 'present': 0, 'absent': 0}

    if enrollment:
        enrollment_data = {
            'id': enrollment.id,
            'class_name': str(enrollment.class_enrolled),
            'class_id': enrollment.class_enrolled.id,
        }
        subjects = list(
            Subject.objects.filter(
                course=enrollment.class_enrolled.course,
                year=enrollment.class_enrolled.year,
                semester=enrollment.class_enrolled.semester,
            ).values('id', 'name', 'code', 'credits')
        )
        assignments = list(
            Assignment.objects.filter(
                class_assigned=enrollment.class_enrolled, is_active=True
            ).order_by('-assigned_date')[:5].values(
                'id', 'title', 'assignment_type', 'due_date', 'subject__name'
            )
        )
        upcoming_exams = list(
            Examination.objects.filter(
                class_for=enrollment.class_enrolled,
                exam_date__gte=timezone.now().date(),
            ).order_by('exam_date', 'start_time')[:5].values(
                'id', 'name', 'exam_date', 'start_time', 'subject__name', 'exam_type__name'
            )
        )
        records = AttendanceRecord.objects.filter(student=profile)
        total = records.count()
        present = records.filter(status__in=['present', 'late']).count()
        attendance = {
            'percentage': round(present / total * 100, 2) if total else 0,
            'total': total,
            'present': present,
            'absent': total - present,
        }

    unpaid = StudentFee.objects.filter(
        student=profile,
        payment_status__in=['pending', 'partial', 'overdue'],
    )
    fees_data = {
        'has_unpaid': unpaid.exists(),
        'total_unpaid': float(sum(f.balance_amount for f in unpaid)),
        'items': list(unpaid.values(
            'id', 'amount_due', 'amount_paid', 'payment_status',
            'fee_structure__due_date'
        )),
    }

    return Response({
        'enrollment': enrollment_data,
        'subjects': subjects,
        'recent_assignments': assignments,
        'upcoming_exams': upcoming_exams,
        'attendance': attendance,
        'fees': fees_data,
    })


def _teacher_dashboard(request):
    user = request.user
    try:
        profile = user.teacher_profile
    except TeacherProfile.DoesNotExist:
        return Response({'detail': 'Teacher profile not found.'}, status=404)

    current_year = AcademicYear.objects.filter(is_current=True)
    if request.user.tenant:
        current_year = current_year.filter(tenant=request.user.tenant)
    current_year = current_year.first()
    assignments_qs = TeacherSubjectAssignment.objects.filter(teacher=profile)
    if current_year:
        assignments_qs = assignments_qs.filter(academic_year=current_year)

    classes = []
    for ta in assignments_qs.select_related('subject', 'class_assigned', 'academic_year'):
        enrolled = StudentEnrollment.objects.filter(
            class_enrolled=ta.class_assigned, is_active=True
        ).count()
        classes.append({
            'assignment_id': ta.id,
            'subject': ta.subject.name,
            'class': str(ta.class_assigned),
            'class_id': ta.class_assigned.id,
            'enrolled_students': enrolled,
        })

    # Assignment stats
    hw = Assignment.objects.filter(teacher=profile, is_active=True)
    total_hw = hw.count()
    total_subs = AssignmentSubmission.objects.filter(assignment__teacher=profile).count()
    graded = AssignmentSubmission.objects.filter(
        assignment__teacher=profile, marks_obtained__isnull=False
    ).count()

    # Attendance stats
    sessions = AttendanceSession.objects.filter(teacher_assignment__teacher=profile)
    total_sessions = sessions.count()
    completed_sessions = sessions.filter(is_completed=True).count()

    # Students with unpaid fees
    class_ids = [ta.class_assigned.id for ta in assignments_qs]
    enrolled_students = StudentEnrollment.objects.filter(
        class_enrolled__id__in=class_ids, is_active=True
    ).values_list('student', flat=True)
    unpaid = StudentFee.objects.filter(
        student__in=enrolled_students,
        payment_status__in=['pending', 'partial', 'overdue'],
    ).select_related('student__user')

    return Response({
        'classes': classes,
        'assignment_stats': {
            'total_assignments': total_hw,
            'total_submissions': total_subs,
            'graded': graded,
            'pending_grading': total_subs - graded,
        },
        'attendance_stats': {
            'total_sessions': total_sessions,
            'completed': completed_sessions,
        },
        'students_with_unpaid_fees': [
            {
                'student_name': str(f.student),
                'amount': float(f.balance_amount),
                'status': f.payment_status,
            }
            for f in unpaid[:20]
        ],
    })


def _parent_dashboard(request):
    user = request.user
    try:
        profile = user.parent_profile
    except ParentProfile.DoesNotExist:
        return Response({'detail': 'Parent profile not found.'}, status=404)

    children_data = []
    for child in profile.children.all().select_related('user'):
        enrollment = child.get_current_enrollment()
        records = AttendanceRecord.objects.filter(student=child)
        total = records.count()
        present = records.filter(status__in=['present', 'late']).count()

        unpaid = StudentFee.objects.filter(
            student=child,
            payment_status__in=['pending', 'partial', 'overdue'],
        )

        children_data.append({
            'id': child.id,
            'name': str(child),
            'class': str(enrollment.class_enrolled) if enrollment else None,
            'attendance': {
                'percentage': round(present / total * 100, 2) if total else 0,
                'total': total,
                'present': present,
            },
            'unpaid_fees': float(sum(f.balance_amount for f in unpaid)),
        })

    return Response({'children': children_data})


# ─── Admin User Management ───────────────────────────────────────

class UserListView(generics.ListAPIView):
    permission_classes = [IsAdmin, ImpersonationReadOnly]
    serializer_class = UserSerializer
    filterset_fields = ['user_type', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['date_joined', 'username']

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = User.objects.all().order_by('-date_joined')
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs


class UserCreateView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        user_ser = UserCreateSerializer(data=request.data)
        user_ser.is_valid(raise_exception=True)

        # Enforce plan limits
        tenant = get_request_tenant(request)
        if tenant:
            sub = tenant.active_subscription
            if sub:
                plan = sub.plan
                user_type = request.data.get('user_type')
                if user_type == 'student' and plan.max_students > 0:
                    current = User.objects.filter(tenant=tenant, user_type='student').count()
                    if current >= plan.max_students:
                        return Response(
                            {'detail': f'Student limit reached for your plan ({plan.max_students}). Upgrade to add more.'},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                elif user_type == 'teacher' and plan.max_teachers > 0:
                    current = User.objects.filter(tenant=tenant, user_type='teacher').count()
                    if current >= plan.max_teachers:
                        return Response(
                            {'detail': f'Teacher limit reached for your plan ({plan.max_teachers}). Upgrade to add more.'},
                            status=status.HTTP_403_FORBIDDEN,
                        )

        user = user_ser.save()

        # Assign to same tenant as the creating admin
        tenant = get_request_tenant(request)
        if tenant:
            user.tenant = tenant
            user.save(update_fields=['tenant'])

        profile_data = request.data.get('profile', {})
        if user.user_type == 'student':
            ps = StudentProfileCreateSerializer(data=profile_data)
            ps.is_valid(raise_exception=True)
            ps.save(user=user)
        elif user.user_type == 'teacher':
            ps = TeacherProfileCreateSerializer(data=profile_data)
            ps.is_valid(raise_exception=True)
            ps.save(user=user)
        elif user.user_type == 'parent':
            ps = ParentProfileCreateSerializer(data=profile_data)
            ps.is_valid(raise_exception=True)
            ps.save(user=user)
        elif user.user_type == 'admin':
            AdminProfile.objects.create(
                user=user,
                employee_id=profile_data.get('employee_id', ''),
                department=profile_data.get('department', ''),
            )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    lookup_url_kwarg = 'user_id'

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = User.objects.all()
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs


class AdminResetPasswordView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        tenant = get_request_tenant(request)
        qs = User.objects.all()
        if tenant:
            qs = qs.filter(tenant=tenant)
        user = generics.get_object_or_404(qs, pk=user_id)
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password reset successfully.'})


class LinkStudentView(APIView):
    """Admin-only: link or unlink a student to a parent."""
    permission_classes = [IsAdmin]

    def _get_parent_profile(self, parent_id):
        parent = generics.get_object_or_404(User, pk=parent_id, user_type='parent')
        profile, _ = ParentProfile.objects.get_or_create(user=parent, defaults={'occupation': ''})
        return profile

    def post(self, request, parent_id):
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        student = generics.get_object_or_404(StudentProfile, pk=student_id)
        profile = self._get_parent_profile(parent_id)
        profile.children.add(student)
        from .serializers import StudentProfileSerializer
        return Response(StudentProfileSerializer(student).data, status=status.HTTP_200_OK)

    def delete(self, request, parent_id):
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        student = generics.get_object_or_404(StudentProfile, pk=student_id)
        profile = self._get_parent_profile(parent_id)
        profile.children.remove(student)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ParentChildrenView(APIView):
    """Admin-only: get linked children for a parent user."""
    permission_classes = [IsAdmin]

    def get(self, request, parent_id):
        parent = generics.get_object_or_404(User, pk=parent_id, user_type='parent')
        try:
            profile = parent.parent_profile
            children = profile.children.all().select_related('user')
        except ParentProfile.DoesNotExist:
            children = []
        from .serializers import StudentProfileSerializer
        return Response(StudentProfileSerializer(children, many=True).data)


class StudentSearchView(generics.ListAPIView):
    """Admin-only: search students by name/username for parent-child linking."""
    permission_classes = [IsAdmin]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        tenant = get_request_tenant(request)
        students = StudentProfile.objects.filter(
            Q(user__first_name__icontains=q) |
            Q(user__last_name__icontains=q) |
            Q(user__username__icontains=q) |
            Q(student_id__icontains=q)
        ).select_related('user')
        if tenant:
            students = students.filter(user__tenant=tenant)
        from .serializers import StudentProfileSerializer
        return Response(StudentProfileSerializer(students[:20], many=True).data)


# ─── Messaging ───────────────────────────────────────────────────

class MessageInboxView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def get_queryset(self):
        user = self.request.user
        return ParentTeacherMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient', 'student__user')


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class MessageDetailView(APIView):
    def get(self, request, message_id):
        msg = generics.get_object_or_404(
            ParentTeacherMessage, pk=message_id
        )
        if request.user not in (msg.sender, msg.recipient):
            return Response({'detail': 'Not allowed.'}, status=403)
        msg.mark_as_read(request.user)

        # Get thread (root + all replies)
        root = msg
        while root.replied_to:
            root = root.replied_to
        thread = [root] + list(root.replies.all().order_by('created_at'))
        return Response(MessageSerializer(thread, many=True).data)

    def post(self, request, message_id):
        """Reply to a message."""
        original = generics.get_object_or_404(
            ParentTeacherMessage, pk=message_id
        )
        data = request.data.copy()
        data['replied_to'] = original.id
        data['recipient'] = (
            original.sender.id
            if request.user == original.recipient
            else original.recipient.id
        )
        data['student'] = original.student_id
        serializer = MessageCreateSerializer(
            data=data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(sender=request.user)
        original.status = 'replied'
        original.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContactTeachersView(APIView):
    """List teachers associated with parent's children."""
    permission_classes = [permissions.IsAuthenticated, IsParent]

    def get(self, request):
        try:
            profile = request.user.parent_profile
        except ParentProfile.DoesNotExist:
            return Response([], status=200)

        teachers = {}
        for child in profile.children.all():
            enrollment = child.get_current_enrollment()
            if not enrollment:
                continue
            # Only assignments within the same tenant
            tenant = get_request_tenant(request)
            ta_qs = TeacherSubjectAssignment.objects.filter(
                class_assigned=enrollment.class_enrolled
            ).select_related('teacher__user', 'subject')
            if tenant:
                ta_qs = ta_qs.filter(academic_year__tenant=tenant)
            for ta in ta_qs:
                tid = ta.teacher.id
                if tid not in teachers:
                    teachers[tid] = {
                        'teacher_id': ta.teacher.user.id,
                        'name': str(ta.teacher),
                        'subjects': [],
                        'children': [],
                    }
                teachers[tid]['subjects'].append(ta.subject.name)
                child_name = str(child)
                if child_name not in teachers[tid]['children']:
                    teachers[tid]['children'].append(child_name)

        return Response(list(teachers.values()))


# ─── Teacher Dashboard Stats (real-time) ─────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsTeacher])
def teacher_dashboard_stats(request):
    """Real-time stats for teacher dashboard charts."""
    profile = request.user.teacher_profile
    tenant = get_request_tenant(request)
    current_year = AcademicYear.objects.filter(is_current=True)
    if tenant:
        current_year = current_year.filter(tenant=tenant)
    current_year = current_year.first()

    tas = TeacherSubjectAssignment.objects.filter(teacher=profile)
    if current_year:
        tas = tas.filter(academic_year=current_year)

    assignment_data = []
    for ta in tas.select_related('subject', 'class_assigned'):
        hw = Assignment.objects.filter(
            teacher=profile, subject=ta.subject,
            class_assigned=ta.class_assigned, is_active=True,
        )
        total = hw.count()
        subs = AssignmentSubmission.objects.filter(assignment__in=hw)
        submitted = subs.count()
        graded = subs.filter(marks_obtained__isnull=False).count()
        assignment_data.append({
            'subject': ta.subject.name,
            'class': str(ta.class_assigned),
            'total_assignments': total,
            'submissions': submitted,
            'graded': graded,
        })

    attendance_data = []
    for ta in tas.select_related('subject', 'class_assigned'):
        sessions = AttendanceSession.objects.filter(teacher_assignment=ta)
        total = sessions.count()
        completed = sessions.filter(is_completed=True).count()
        attendance_data.append({
            'subject': ta.subject.name,
            'class': str(ta.class_assigned),
            'total_sessions': total,
            'completed': completed,
        })

    return Response({
        'assignments': assignment_data,
        'attendance': attendance_data,
    })
