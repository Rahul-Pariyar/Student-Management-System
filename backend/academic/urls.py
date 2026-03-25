from django.urls import path
from . import api_views_new as views

app_name = 'academic'

urlpatterns = [
    # Dropdown helpers
    path('lookup/courses/', views.courses_by_department, name='courses_by_department'),
    path('lookup/classes/', views.classes_by_course, name='classes_by_course'),

    # Academic Years
    path('academic-years/', views.AcademicYearListCreate.as_view(), name='academic_year_list'),
    path('academic-years/<int:pk>/', views.AcademicYearDetail.as_view(), name='academic_year_detail'),

    # Departments
    path('departments/', views.DepartmentListCreate.as_view(), name='department_list'),
    path('departments/<int:pk>/', views.DepartmentDetail.as_view(), name='department_detail'),

    # Courses
    path('courses/', views.CourseListCreate.as_view(), name='course_list'),
    path('courses/<int:pk>/', views.CourseDetail.as_view(), name='course_detail'),

    # Subjects
    path('subjects/', views.SubjectListCreate.as_view(), name='subject_list'),
    path('subjects/<int:pk>/', views.SubjectDetail.as_view(), name='subject_detail'),

    # Classes
    path('classes/', views.ClassListCreate.as_view(), name='class_list'),
    path('classes/<int:pk>/', views.ClassDetail.as_view(), name='class_detail'),
    path('classes/<int:class_id>/students/', views.teacher_class_students, name='teacher_class_students'),

    # Enrollments
    path('enrollments/', views.EnrollmentListCreate.as_view(), name='enrollment_list'),
    path('enrollments/<int:pk>/', views.EnrollmentDetail.as_view(), name='enrollment_detail'),
    path('enrollments/report/', views.enrollment_report, name='enrollment_report'),

    # Teacher Subject Assignments
    path('teacher-assignments/', views.TeacherAssignmentListCreate.as_view(), name='teacher_assignment_list'),
    path('teacher-assignments/<int:pk>/', views.TeacherAssignmentDetail.as_view(), name='teacher_assignment_detail'),

    # Assignments
    path('assignments/', views.AssignmentListCreate.as_view(), name='assignment_list'),
    path('assignments/<int:pk>/', views.AssignmentDetail.as_view(), name='assignment_detail'),

    # Submissions
    path('submissions/', views.SubmissionListCreate.as_view(), name='submission_list'),
    path('submissions/<int:pk>/', views.SubmissionDetail.as_view(), name='submission_detail'),
    path('submissions/<int:pk>/grade/', views.GradeSubmissionView.as_view(), name='grade_submission'),
]