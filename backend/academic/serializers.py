from rest_framework import serializers
from .models import (
    AcademicYear, Department, Course, Subject, Class,
    StudentEnrollment, TeacherSubjectAssignment,
    Assignment, AssignmentSubmission,
)
from accounts.serializers import UserMinimalSerializer, StudentProfileSerializer, TeacherProfileSerializer


# ─── Academic Year ────────────────────────────────────────────────

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'year', 'start_date', 'end_date', 'is_current']


# ─── Department ───────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    hod_name = serializers.SerializerMethodField()
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description',
                  'head_of_department', 'hod_name', 'course_count', 'created_at']

    def get_hod_name(self, obj):
        return str(obj.head_of_department) if obj.head_of_department else None

    def get_course_count(self, obj):
        return obj.course_set.count()


# ─── Course ───────────────────────────────────────────────────────

class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    subject_count = serializers.SerializerMethodField()
    class_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'department', 'department_name',
                  'duration_years', 'description', 'subject_count', 'class_count']

    def get_subject_count(self, obj):
        return obj.subject_set.count()

    def get_class_count(self, obj):
        return obj.class_set.count()


# ─── Subject ──────────────────────────────────────────────────────

class SubjectSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'course', 'course_name',
                  'semester', 'year', 'credits', 'description']


# ─── Class ────────────────────────────────────────────────────────

class ClassSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.year', read_only=True)
    class_teacher_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = ['id', 'name', 'course', 'course_name', 'year', 'semester',
                  'section', 'academic_year', 'academic_year_label',
                  'class_teacher', 'class_teacher_name', 'student_count']

    def get_class_teacher_name(self, obj):
        return str(obj.class_teacher) if obj.class_teacher else None

    def get_student_count(self, obj):
        return obj.studentenrollment_set.filter(is_active=True).count()


class ClassDetailSerializer(ClassSerializer):
    subjects = SubjectSerializer(source='course.subject_set', many=True, read_only=True)
    enrollments = serializers.SerializerMethodField()

    class Meta(ClassSerializer.Meta):
        fields = ClassSerializer.Meta.fields + ['subjects', 'enrollments']

    def get_enrollments(self, obj):
        enrollments = obj.studentenrollment_set.filter(is_active=True).select_related(
            'student__user'
        )
        return [{
            'id': e.id,
            'student_id': e.student.id,
            'student_name': str(e.student),
            'enrollment_date': e.enrollment_date,
        } for e in enrollments]


# ─── Enrollment ───────────────────────────────────────────────────

class StudentEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source='class_enrolled.__str__', read_only=True)

    class Meta:
        model = StudentEnrollment
        fields = ['id', 'student', 'student_name', 'class_enrolled',
                  'class_name', 'enrollment_date', 'is_active']

    def get_student_name(self, obj):
        return str(obj.student)


# ─── Teacher Subject Assignment ───────────────────────────────────

class TeacherSubjectAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_assigned.__str__', read_only=True)

    class Meta:
        model = TeacherSubjectAssignment
        fields = ['id', 'teacher', 'teacher_name', 'subject', 'subject_name',
                  'class_assigned', 'class_name', 'academic_year']

    def get_teacher_name(self, obj):
        return str(obj.teacher)


# ─── Assignment ───────────────────────────────────────────────────

class AssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_assigned.__str__', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'assignment_type',
                  'subject', 'subject_name', 'class_assigned', 'class_name',
                  'teacher', 'teacher_name', 'assigned_date', 'due_date',
                  'max_marks', 'instructions', 'attachment', 'is_active',
                  'submission_count']
        read_only_fields = ['id', 'assigned_date', 'teacher']

    def get_teacher_name(self, obj):
        return str(obj.teacher)

    def get_submission_count(self, obj):
        return obj.assignmentsubmission_set.count()


class AssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['title', 'description', 'assignment_type', 'subject',
                  'class_assigned', 'due_date', 'max_marks', 'instructions',
                  'attachment']


# ─── Assignment Submission ────────────────────────────────────────

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    graded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'assignment', 'student', 'student_name',
                  'submission_text', 'attachment', 'submitted_at', 'is_late',
                  'marks_obtained', 'feedback', 'graded_by', 'graded_by_name',
                  'graded_at']
        read_only_fields = ['id', 'submitted_at', 'is_late', 'graded_by', 'graded_at']

    def get_student_name(self, obj):
        return str(obj.student)

    def get_graded_by_name(self, obj):
        return str(obj.graded_by) if obj.graded_by else None


class SubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = ['assignment', 'submission_text', 'attachment']


class GradeSubmissionSerializer(serializers.Serializer):
    marks_obtained = serializers.DecimalField(max_digits=6, decimal_places=2)
    feedback = serializers.CharField(required=False, allow_blank=True)


# ─── Enrollment Report ───────────────────────────────────────────

class EnrollmentReportSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    course_name = serializers.CharField()
    total_enrolled = serializers.IntegerField()
    active_enrolled = serializers.IntegerField()
    classes = serializers.ListField()
