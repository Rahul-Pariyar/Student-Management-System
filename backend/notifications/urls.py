from django.urls import path
from . import api_views_new as views

app_name = 'notifications'

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification_list'),
    path('create/', views.NotificationCreateView.as_view(), name='create_notification'),
    path('<int:notification_id>/mark-read/', views.MarkAsReadView.as_view(), name='mark_as_read'),
    path('unread-count/', views.unread_count, name='unread_count'),
    path('recent/', views.recent_notifications, name='recent_notifications'),
]