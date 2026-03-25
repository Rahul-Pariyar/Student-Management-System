from rest_framework import serializers
from .models import ExamType, Examination, ExamResult, InternalComponent, InternalMark


class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = ['id', 'name', 'description', 'weightage']


class ExaminationSerializer(serializers.ModelSerializer):
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_for.__str__', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    internal_components = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = ['id', 'name', 'exam_type', 'exam_type_name', 'subject',
                  'subject_name', 'class_for', 'class_name', 'exam_date',
                  'start_time', 'end_time', 'total_marks', 'passing_marks',
                  'instructions', 'has_internal', 'internal_max',
                  'internal_components', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return ''

    def get_internal_components(self, obj):
        if not obj.has_internal:
            return []
        return [{'id': c.id, 'name': c.name, 'max_marks': c.max_marks}
                for c in obj.internal_components.all()]


class InternalComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalComponent
        fields = ['id', 'name', 'max_marks']


class ExaminationCreateSerializer(serializers.ModelSerializer):
    internal_components = InternalComponentSerializer(many=True, required=False)

    class Meta:
        model = Examination
        fields = ['name', 'exam_type', 'subject', 'class_for', 'exam_date',
                  'start_time', 'end_time', 'total_marks', 'passing_marks',
                  'instructions', 'has_internal', 'internal_components']

    def validate(self, attrs):
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError('End time must be after start time.')
        if attrs['passing_marks'] > attrs['total_marks']:
            raise serializers.ValidationError('Passing marks cannot exceed total marks.')
        if attrs.get('has_internal'):
            components = attrs.get('internal_components', [])
            if not components:
                raise serializers.ValidationError('At least one internal component is required when has_internal is true.')
            internal_max = sum(c['max_marks'] for c in components)
            if internal_max >= attrs['total_marks']:
                raise serializers.ValidationError('Internal marks total must be less than total marks (external marks must be > 0).')
            attrs['internal_max'] = internal_max
        else:
            attrs['internal_max'] = 0
            attrs['internal_components'] = []
        return attrs

    def create(self, validated_data):
        components_data = validated_data.pop('internal_components', [])
        exam = Examination.objects.create(**validated_data)
        for c in components_data:
            InternalComponent.objects.create(examination=exam, **c)
        return exam

    def update(self, instance, validated_data):
        components_data = validated_data.pop('internal_components', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if components_data is not None:
            instance.internal_components.all().delete()
            for c in components_data:
                InternalComponent.objects.create(examination=instance, **c)
        return instance


class ExamResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source='examination.name', read_only=True)
    subject_name = serializers.CharField(source='examination.subject.name', read_only=True)
    total_marks = serializers.IntegerField(source='examination.total_marks', read_only=True)
    exam_date = serializers.DateField(source='examination.exam_date', read_only=True)
    percentage = serializers.SerializerMethodField()
    exam_type = serializers.IntegerField(source='examination.exam_type.id', read_only=True)
    exam_type_name = serializers.CharField(source='examination.exam_type.name', read_only=True)
    has_internal = serializers.BooleanField(source='examination.has_internal', read_only=True)
    internal_max = serializers.IntegerField(source='examination.internal_max', read_only=True)

    class Meta:
        model = ExamResult
        fields = ['id', 'examination', 'exam_name', 'subject_name', 'exam_type', 'exam_type_name',
                  'student', 'student_name', 'marks_obtained', 'external_marks', 'total_marks',
                  'has_internal', 'internal_max',
                  'exam_date', 'percentage', 'grade', 'remarks', 'is_passed',
                  'entered_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'grade', 'is_passed', 'entered_by',
                            'created_at', 'updated_at']

    def get_student_name(self, obj):
        return str(obj.student)

    def get_percentage(self, obj):
        if obj.examination.total_marks > 0:
            return round(float(obj.marks_obtained) / obj.examination.total_marks * 100, 2)
        return 0


class InternalMarkSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)
    component_max = serializers.IntegerField(source='component.max_marks', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = InternalMark
        fields = ['id', 'component', 'component_name', 'component_max',
                  'student', 'student_name', 'marks_obtained', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def get_student_name(self, obj):
        return str(obj.student)


class BulkInternalMarkSerializer(serializers.Serializer):
    """{ student: id, marks: { component_id: marks_obtained, ... } }"""
    results = serializers.ListField(child=serializers.DictField(), min_length=1)


class BulkResultSerializer(serializers.Serializer):
    """For entering results for multiple students at once."""
    results = serializers.ListField(
        child=serializers.DictField(), min_length=1
    )
    # Each: { "student": <id>, "marks_obtained": <float>, "remarks": "" }


class ResultPublicationSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_for.__str__', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    published_by_name = serializers.SerializerMethodField()

    class Meta:
        model = None  # set below after import
        fields = ['id', 'exam_type', 'exam_type_name', 'class_for', 'class_name',
                  'is_published', 'published_by', 'published_by_name', 'published_at']
        read_only_fields = ['id', 'published_by', 'published_at']

    def get_published_by_name(self, obj):
        return obj.published_by.get_full_name() if obj.published_by else None


# Late-bind the model to avoid circular import issues at module load
from .models import ResultPublication  # noqa: E402
ResultPublicationSerializer.Meta.model = ResultPublication
