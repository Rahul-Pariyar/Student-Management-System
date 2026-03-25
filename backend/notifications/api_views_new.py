# from rest_framework import generics, status, permissions
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.response import Response
# from rest_framework.views import APIView
# from django.db.models import Q

# from .models import Notification, NotificationRead
# from .serializers import (
#     NotificationSerializer, NotificationCreateSerializer,
#     UnreadCountSerializer,
# )
# from accounts.models import User
# from accounts.api_views_new import IsAdmin


# # ─── Notifications ────────────────────────────────────────────────

# class NotificationListView(generics.ListAPIView):
#     serializer_class = NotificationSerializer
#     filterset_fields = ['notification_type', 'priority']

#     def get_queryset(self):
#         user = self.request.user
#         return Notification.objects.filter(
#             recipients=user
#         ).order_by('-created_at')

#     def get_serializer_context(self):
#         ctx = super().get_serializer_context()
#         ctx['request'] = self.request
#         return ctx


# class NotificationCreateView(APIView):
#     """Create notification and assign recipients."""

#     def get_permissions(self):
#         return [permissions.IsAuthenticated()]

#     def post(self, request):
#         serializer = NotificationCreateSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         data = serializer.validated_data

#         notification = Notification.objects.create(
#             title=data['title'],
#             message=data['message'],
#             notification_type=data['notification_type'],
#             priority=data['priority'],
#             send_email=data.get('send_email', False),
#             sender=request.user,
#         )

#         # Resolve recipients
#         if data.get('recipient_group'):
#             group = data['recipient_group']
#             if group == 'all_students':
#                 recipients = User.objects.filter(user_type='student')
#             elif group == 'all_teachers':
#                 recipients = User.objects.filter(user_type='teacher')
#             elif group == 'all_parents':
#                 recipients = User.objects.filter(user_type='parent')
#             else:
#                 recipients = User.objects.exclude(user_type='admin')
#             notification.recipients.set(recipients)
#         elif data.get('recipient_ids'):
#             notification.recipients.set(
#                 User.objects.filter(id__in=data['recipient_ids'])
#             )

#         return Response(
#             NotificationSerializer(notification, context={'request': request}).data,
#             status=status.HTTP_201_CREATED,
#         )


# class MarkAsReadView(APIView):
#     def post(self, request, notification_id):
#         notification = generics.get_object_or_404(Notification, pk=notification_id)
#         NotificationRead.objects.get_or_create(
#             notification=notification, user=request.user
#         )
#         return Response({'detail': 'Marked as read.'})


# # ─── API helpers ──────────────────────────────────────────────────

# @api_view(['GET'])
# @permission_classes([permissions.IsAuthenticated])
# def unread_count(request):
#     count = Notification.objects.filter(
#         recipients=request.user
#     ).exclude(
#         notificationread__user=request.user
#     ).count()
#     return Response({'unread_count': count})


# @api_view(['GET'])
# @permission_classes([permissions.IsAuthenticated])
# def recent_notifications(request):
#     notifications = Notification.objects.filter(
#         recipients=request.user
#     ).order_by('-created_at')[:5]
#     return Response(
#         NotificationSerializer(
#             notifications, many=True, context={'request': request}
#         ).data
#     )

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from .models import Notification, NotificationRead
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer,
    UnreadCountSerializer,
)
from accounts.models import User
from accounts.api_views_new import IsAdmin
from tenants.mixins import get_request_tenant


# ─── Notifications ────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    filterset_fields = ['notification_type', 'priority']

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(
            recipients=user,
            tenant=user.tenant,
        ).order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class NotificationCreateView(APIView):
    """Create notification and assign recipients."""

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def post(self, request):
        serializer = NotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        notification = Notification.objects.create(
            title=data['title'],
            message=data['message'],
            notification_type=data['notification_type'],
            priority=data['priority'],
            send_email=data.get('send_email', False),
            sender=request.user,
            tenant=get_request_tenant(request),
        )

        # Resolve recipients — scoped to same tenant
        if data.get('recipient_group'):
            group = data['recipient_group']
            base = User.objects.filter(tenant=get_request_tenant(request))
            if group == 'all_students':
                recipients = base.filter(user_type='student')
            elif group == 'all_teachers':
                recipients = base.filter(user_type='teacher')
            elif group == 'all_parents':
                recipients = base.filter(user_type='parent')
            else:
                recipients = base.exclude(user_type='admin')
            notification.recipients.set(recipients)
        elif data.get('recipient_ids'):
            notification.recipients.set(
                User.objects.filter(id__in=data['recipient_ids'], tenant=get_request_tenant(request))
            )

        return Response(
            NotificationSerializer(notification, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class MarkAsReadView(APIView):
    def post(self, request, notification_id):
        notification = generics.get_object_or_404(
            Notification,
            pk=notification_id,
            recipients=request.user,
        )
        NotificationRead.objects.get_or_create(
            notification=notification, user=request.user
        )
        return Response({'detail': 'Marked as read.'})


# ─── API helpers ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(
        recipients=request.user
    ).exclude(
        notificationread__user=request.user
    ).count()
    return Response({'unread_count': count})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recent_notifications(request):
    notifications = Notification.objects.filter(
        recipients=request.user
    ).order_by('-created_at')[:5]
    return Response(
        NotificationSerializer(
            notifications, many=True, context={'request': request}
        ).data
    )