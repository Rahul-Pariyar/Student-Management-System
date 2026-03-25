from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord, AttendanceSummary

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('teacher_assignment', 'date', 'start_time', 'end_time', 'is_completed')
    search_fields = ('teacher_assignment__teacher__user__username', 'teacher_assignment__subject__name')
    list_filter = ('date', 'is_completed', 'teacher_assignment__subject')
    date_hierarchy = 'date'

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'session', 'status', 'marked_at')
    search_fields = ('student__user__username', 'student__student_id', 'session__teacher_assignment__subject__name')
    list_filter = ('marked_at', 'status', 'session__teacher_assignment__subject')
    date_hierarchy = 'marked_at'

@admin.register(AttendanceSummary)
class AttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ('student', 'subject', 'class_enrolled', 'month', 'year', 'attendance_percentage')
    search_fields = ('student__user__username', 'student__student_id', 'subject__name')
    list_filter = ('month', 'year', 'subject', 'class_enrolled')