from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord, AttendanceSummary


class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ['id', 'teacher_assignment', 'date', 'start_time', 'end_time',
                  'topic_covered', 'notes', 'is_completed', 'created_at',
                  'subject_name', 'class_name', 'teacher_name']
        read_only_fields = ['id', 'created_at']

    def get_subject_name(self, obj):
        return obj.teacher_assignment.subject.name

    def get_class_name(self, obj):
        return str(obj.teacher_assignment.class_assigned)

    def get_teacher_name(self, obj):
        return str(obj.teacher_assignment.teacher)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    marked_by = serializers.SerializerMethodField()
    session_date = serializers.DateField(source='session.date', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'session', 'student', 'student_name', 'status',
                  'remarks', 'marked_at', 'subject_name', 'class_name',
                  'marked_by', 'session_date']
        read_only_fields = ['id', 'marked_at']

    def get_student_name(self, obj):
        return str(obj.student)

    def get_subject_name(self, obj):
        return obj.session.teacher_assignment.subject.name

    def get_class_name(self, obj):
        return str(obj.session.teacher_assignment.class_assigned)

    def get_marked_by(self, obj):
        return str(obj.session.teacher_assignment.teacher)


class BulkAttendanceSerializer(serializers.Serializer):
    """For marking attendance of multiple students at once."""
    teacher_assignment = serializers.IntegerField()
    date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    topic_covered = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    records = serializers.ListField(
        child=serializers.DictField(), min_length=1
    )
    # Each record: { "student": <id>, "status": "present|absent|late|excused", "remarks": "" }


class AttendanceSummarySerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = AttendanceSummary
        fields = ['id', 'student', 'student_name', 'subject', 'subject_name',
                  'class_enrolled', 'month', 'year', 'total_sessions',
                  'sessions_attended', 'sessions_late', 'sessions_excused',
                  'attendance_percentage']

    def get_student_name(self, obj):
        return str(obj.student)


class AttendanceReportSerializer(serializers.Serializer):
    subject_name = serializers.CharField()
    class_name = serializers.CharField()
    total_sessions = serializers.IntegerField()
    average_attendance = serializers.FloatField()
    students = serializers.ListField()
