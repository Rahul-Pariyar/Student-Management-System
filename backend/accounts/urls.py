from django.urls import path
from . import api_views_new as views

app_name = 'accounts'

urlpatterns = [
    # Auth & Profile
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),

    # Dashboard (role-based)
    path('dashboard/', views.dashboard, name='dashboard'),
    path('teacher-dashboard-stats/', views.teacher_dashboard_stats, name='teacher_dashboard_stats'),

    # Admin User Management
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/create/', views.UserCreateView.as_view(), name='user_create'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<int:user_id>/reset-password/', views.AdminResetPasswordView.as_view(), name='admin_reset_password'),

    # Parent-Student linking (admin only)
    path('users/<int:parent_id>/link-student/', views.LinkStudentView.as_view(), name='link_student'),
    path('users/<int:parent_id>/children/', views.ParentChildrenView.as_view(), name='parent_children'),
    path('students/search/', views.StudentSearchView.as_view(), name='student_search'),

    # Messaging
    path('messages/', views.MessageInboxView.as_view(), name='message_inbox'),
    path('messages/send/', views.SendMessageView.as_view(), name='send_message'),
    path('messages/<int:message_id>/', views.MessageDetailView.as_view(), name='message_detail'),
    path('contact-teachers/', views.ContactTeachersView.as_view(), name='contact_teachers'),
]