from rest_framework import serializers
from .models import Notification, NotificationRead
from accounts.serializers import UserMinimalSerializer


class NotificationSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)
    is_read_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'priority',
                  'sender', 'is_read', 'send_email', 'created_at',
                  'is_read_by_me']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_is_read_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return NotificationRead.objects.filter(
                notification=obj, user=request.user
            ).exists()
        return False


class NotificationCreateSerializer(serializers.ModelSerializer):
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    recipient_group = serializers.ChoiceField(
        choices=['all_students', 'all_teachers', 'all_parents', 'all_users'],
        required=False
    )

    class Meta:
        model = Notification
        fields = ['title', 'message', 'notification_type', 'priority',
                  'send_email', 'recipient_ids', 'recipient_group']

    def validate(self, attrs):
        if not attrs.get('recipient_ids') and not attrs.get('recipient_group'):
            raise serializers.ValidationError(
                'Either recipient_ids or recipient_group is required.'
            )
        return attrs


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()
