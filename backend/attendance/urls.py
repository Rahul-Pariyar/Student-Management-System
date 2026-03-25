from django.urls import path
from . import api_views_new as views

app_name = 'attendance'

urlpatterns = [
    # Sessions
    path('sessions/', views.SessionListCreate.as_view(), name='session_list'),
    path('sessions/<int:pk>/', views.SessionDetail.as_view(), name='session_detail'),

    # Records
    path('records/', views.RecordList.as_view(), name='record_list'),

    # Bulk mark attendance
    path('mark/', views.BulkMarkAttendanceView.as_view(), name='mark_attendance'),

    # Lookup
    path('students/', views.students_for_assignment, name='students_for_assignment'),

    # View & Reports
    path('view/', views.view_attendance, name='view_attendance'),
    path('reports/', views.attendance_reports, name='attendance_reports'),
]