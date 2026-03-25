from django.contrib import admin
from .models import Notification, NotificationRead

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'notification_type', 'priority', 'sender', 'created_at')
    search_fields = ('title', 'message', 'sender__username')
    list_filter = ('notification_type', 'priority', 'send_email', 'created_at')
    date_hierarchy = 'created_at'
    filter_horizontal = ('recipients',)

@admin.register(NotificationRead)
class NotificationReadAdmin(admin.ModelAdmin):
    list_display = ('notification', 'user', 'read_at')
    search_fields = ('notification__title', 'user__username')
    list_filter = ('read_at',)
    date_hierarchy = 'read_at'