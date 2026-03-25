from rest_framework import serializers
from .models import Plan, Tenant, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.display_name', read_only=True)
    plan_type = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'


class TenantSerializer(serializers.ModelSerializer):
    active_subscription = SubscriptionSerializer(read_only=True)
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = '__all__'

    def get_subscription_count(self, obj):
        return obj.subscriptions.count()


class TenantCreateSerializer(serializers.ModelSerializer):
    plan = serializers.PrimaryKeyRelatedField(queryset=Plan.objects.all(), write_only=True)
    admin_username = serializers.CharField(write_only=True)
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True)
    admin_first_name = serializers.CharField(write_only=True, required=False, default='')
    admin_last_name = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = Tenant
        fields = [
            'name', 'slug', 'email', 'phone', 'address',
            'plan', 'admin_username', 'admin_email', 'admin_password',
            'admin_first_name', 'admin_last_name',
        ]

    def validate_slug(self, value):
        if Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("This slug is already taken.")
        return value
