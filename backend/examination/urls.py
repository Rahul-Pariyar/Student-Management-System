from django.urls import path
from . import api_views_new as views

app_name = 'examination'

urlpatterns = [
    # Exam Types
    path('types/', views.ExamTypeListCreate.as_view(), name='exam_type_list'),

    # Examinations
    path('exams/', views.ExaminationListCreate.as_view(), name='exam_list'),
    path('exams/<int:pk>/', views.ExaminationDetail.as_view(), name='exam_detail'),

    # Results
    path('results/', views.ResultListView.as_view(), name='result_list'),
    path('results/<int:pk>/', views.ResultDetail.as_view(), name='result_detail'),

    # Bulk enter results (no internal)
    path('exams/<int:exam_id>/enter-results/', views.BulkEnterResultsView.as_view(), name='enter_results'),

    # Internal / External marks
    path('exams/<int:exam_id>/internal-marks/', views.InternalMarksView.as_view(), name='internal_marks'),
    path('exams/<int:exam_id>/external-marks/', views.ExternalMarksView.as_view(), name='external_marks'),

    # Stats
    path('exams/<int:exam_id>/stats/', views.exam_result_stats, name='exam_result_stats'),

    # Result Publications (keyed by class + exam type)
    path('classes/<int:class_id>/publications/', views.ResultPublicationListView.as_view(), name='publication_list'),
    path('classes/<int:class_id>/publications/<int:exam_type_id>/toggle/', views.ResultPublicationToggleView.as_view(), name='publication_toggle'),
]