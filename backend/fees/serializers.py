from rest_framework import serializers
from .models import FeeCategory, FeeComponent, FeeStructure, StudentFee, FeePayment, FeeWaiver


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = ['id', 'name', 'description', 'is_optional', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class FeeComponentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_optional = serializers.BooleanField(source='category.is_optional', read_only=True)

    class Meta:
        model = FeeComponent
        fields = ['id', 'category', 'category_name', 'is_optional', 'amount']


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_assigned.__str__', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.year', read_only=True)
    total_fee = serializers.SerializerMethodField()
    components = FeeComponentSerializer(many=True)
    late_fee_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    late_fee_applicable_after_days = serializers.IntegerField(required=False, default=7)

    class Meta:
        model = FeeStructure
        fields = [
            'id', 'class_assigned', 'class_name', 'academic_year', 'academic_year_label',
            'frequency', 'due_date', 'late_fee_amount', 'late_fee_applicable_after_days',
            'description', 'is_active', 'components', 'total_fee', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_fee(self, obj):
        return float(obj.total_fee)

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        structure = FeeStructure.objects.create(**validated_data)
        for comp in components_data:
            FeeComponent.objects.create(fee_structure=structure, **comp)
        return structure

    def update(self, instance, validated_data):
        components_data = validated_data.pop('components', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if components_data is not None:
            instance.components.all().delete()
            for comp in components_data:
                FeeComponent.objects.create(fee_structure=instance, **comp)

        return instance


class FeePaymentSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FeePayment
        fields = ['id', 'student_fee', 'amount', 'payment_method',
                  'payment_date', 'transaction_id', 'receipt_number',
                  'collected_by', 'collected_by_name', 'remarks', 'created_at']
        read_only_fields = ['id', 'receipt_number', 'created_at']

    def get_collected_by_name(self, obj):
        return obj.collected_by.get_full_name() if obj.collected_by else None


class FeeWaiverSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeWaiver
        fields = ['id', 'student_fee', 'waiver_type', 'amount', 'percentage',
                  'reason', 'approved_by', 'approved_by_name', 'approved_date',
                  'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None


class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    fee_structure_info = FeeStructureSerializer(source='fee_structure', read_only=True)
    balance_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payments = FeePaymentSerializer(many=True, read_only=True)
    waivers = FeeWaiverSerializer(many=True, read_only=True)

    class Meta:
        model = StudentFee
        fields = ['id', 'student', 'student_name', 'fee_structure',
                  'fee_structure_info', 'amount_due', 'amount_paid',
                  'late_fee_charged', 'discount_amount', 'balance_amount',
                  'payment_status', 'payment_method', 'payment_date',
                  'transaction_id', 'remarks', 'payments', 'waivers',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'late_fee_charged', 'created_at', 'updated_at']

    def get_student_name(self, obj):
        return str(obj.student)


class MakePaymentSerializer(serializers.Serializer):
    student_fee_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=StudentFee.PAYMENT_METHOD_CHOICES)
    transaction_id = serializers.CharField(required=False, allow_blank=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
