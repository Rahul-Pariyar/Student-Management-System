from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, AdminProfile, StudentProfile, TeacherProfile, ParentProfile, ParentTeacherMessage


# ─── User Serializers ────────────────────────────────────────────

class UserMinimalSerializer(serializers.ModelSerializer):
    """Lightweight user representation for nested usage."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'user_type', 'profile_picture']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    teacher_profile_id = serializers.SerializerMethodField()
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    # Fields hidden from impersonating super admin
    SENSITIVE_FIELDS = {'phone_number', 'address', 'date_of_birth', 'email'}

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'user_type', 'phone_number', 'address',
                  'date_of_birth', 'profile_picture', 'is_active',
                  'created_at', 'updated_at', 'teacher_profile_id',
                  'tenant', 'tenant_name']
        read_only_fields = ['id', 'created_at', 'updated_at', 'tenant', 'tenant_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_teacher_profile_id(self, obj):
        if obj.user_type == 'teacher' and hasattr(obj, 'teacher_profile'):
            return obj.teacher_profile.id
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request, 'impersonated_tenant'):
            for field in self.SENSITIVE_FIELDS:
                data.pop(field, None)
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'user_type', 'phone_number', 'address', 'date_of_birth',
                  'profile_picture', 'password', 'password2']

    def validate_username(self, value):
        # Check uniqueness within the tenant (request context set by the view)
        request = self.context.get('request')
        if request:
            from tenants.mixins import get_request_tenant
            tenant = get_request_tenant(request)
            qs = User.objects.filter(username=value, tenant=tenant)
            # Exclude current instance on update
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "A user with this username already exists in your organization."
                )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class AdminResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, validators=[validate_password])


# ─── Profile Serializers ─────────────────────────────────────────

class AdminProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AdminProfile
        fields = ['id', 'user', 'employee_id', 'department']


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    current_enrollment = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'student_id', 'admission_date',
                  'guardian_name', 'guardian_phone', 'guardian_email',
                  'emergency_contact', 'blood_group', 'current_enrollment']

    def get_current_enrollment(self, obj):
        enrollment = obj.get_current_enrollment()
        if enrollment:
            return {
                'id': enrollment.id,
                'class_name': str(enrollment.class_enrolled),
                'class_id': enrollment.class_enrolled.id,
                'is_active': enrollment.is_active,
            }
        return None


class StudentProfileCreateSerializer(serializers.ModelSerializer):
    guardian_email = serializers.EmailField(required=False, allow_blank=True, default='')
    emergency_contact = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = StudentProfile
        fields = ['student_id', 'admission_date', 'guardian_name',
                  'guardian_phone', 'guardian_email', 'emergency_contact',
                  'blood_group']


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeacherProfile
        fields = ['id', 'user', 'employee_id', 'qualification',
                  'experience_years', 'specialization', 'joining_date']


class TeacherProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = ['employee_id', 'qualification', 'experience_years',
                  'specialization', 'joining_date']


class ParentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    children = StudentProfileSerializer(many=True, read_only=True)

    class Meta:
        model = ParentProfile
        fields = ['id', 'user', 'occupation', 'children']


class ParentProfileCreateSerializer(serializers.ModelSerializer):
    children_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=StudentProfile.objects.all(),
        source='children', required=False
    )

    class Meta:
        model = ParentProfile
        fields = ['occupation', 'children_ids']


# ─── Messaging Serializers ───────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)
    recipient = UserMinimalSerializer(read_only=True)
    student_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ParentTeacherMessage
        fields = ['id', 'sender', 'recipient', 'student', 'student_name',
                  'subject', 'message', 'status', 'parent_read',
                  'teacher_read', 'created_at', 'read_at', 'replied_to',
                  'replies']
        read_only_fields = ['id', 'sender', 'status', 'parent_read',
                            'teacher_read', 'created_at', 'read_at']

    def get_student_name(self, obj):
        if obj.student:
            return str(obj.student)
        return None

    def get_replies(self, obj):
        # Only include replies for root messages
        if obj.replied_to is None:
            replies = obj.replies.all().order_by('created_at')
            return MessageSerializer(replies, many=True).data
        return []


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentTeacherMessage
        fields = ['recipient', 'student', 'subject', 'message', 'replied_to']

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


# ─── Dashboard Serializers ───────────────────────────────────────

class AdminDashboardSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    total_parents = serializers.IntegerField()
    total_courses = serializers.IntegerField()
    recent_users = UserMinimalSerializer(many=True)


class StudentDashboardSerializer(serializers.Serializer):
    enrollment = serializers.DictField(allow_null=True)
    current_subjects = serializers.ListField()
    recent_assignments = serializers.ListField()
    upcoming_exams = serializers.ListField()
    attendance = serializers.DictField()
    fees = serializers.DictField()


class TeacherDashboardSerializer(serializers.Serializer):
    classes = serializers.ListField()
    assignment_stats = serializers.DictField()
    attendance_stats = serializers.DictField()
    students_with_unpaid_fees = serializers.ListField()


class ParentDashboardSerializer(serializers.Serializer):
    children = serializers.ListField()
