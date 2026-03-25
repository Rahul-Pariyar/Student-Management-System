from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User, StudentProfile, TeacherProfile, ParentProfile, AdminProfile, ParentTeacherMessage

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_active')
    list_filter = ('user_type', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('user_type', 'phone_number', 'address', 'date_of_birth', 'profile_picture')
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ('password_change_link',)
        return self.readonly_fields
    
    def password_change_link(self, obj):
        if obj.pk:
            url = reverse('admin:auth_user_password_change', args=[obj.pk])
            return format_html(
                'Raw passwords are not stored, so there is no way to see this user\'s password, '
                'but you can change the password using <strong><a href="{}">this form</a></strong>.',
                url
            )
        return ""
    password_change_link.short_description = 'Password'

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'student_id', 'admission_date', 'guardian_name')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'student_id', 'guardian_name')
    list_filter = ('admission_date',)

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'employee_id', 'specialization', 'experience_years')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'employee_id', 'specialization')
    list_filter = ('joining_date', 'experience_years')

@admin.register(ParentProfile)
class ParentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'occupation', 'get_children_count')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'occupation')
    filter_horizontal = ('children',)
    
    def get_children_count(self, obj):
        return obj.children.count()
    get_children_count.short_description = 'Number of Children'

@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'employee_id', 'department')
    search_fields = ('user__username', 'employee_id', 'department')

@admin.register(ParentTeacherMessage)
class ParentTeacherMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'student', 'subject', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'sender__user_type')
    search_fields = ('subject', 'message', 'sender__username', 'recipient__username')
    readonly_fields = ('created_at', 'read_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('sender', 'recipient', 'student__user')

admin.site.register(User, CustomUserAdmin)