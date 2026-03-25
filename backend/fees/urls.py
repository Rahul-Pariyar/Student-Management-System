from django.urls import path
from . import api_views as views

app_name = 'fees'

urlpatterns = [
    # Fee Categories
    path('categories/', views.FeeCategoryListCreate.as_view(), name='category_list'),
    path('categories/<int:pk>/', views.FeeCategoryDetail.as_view(), name='category_detail'),

    # Fee Structures
    path('structures/', views.FeeStructureListCreate.as_view(), name='structure_list'),
    path('structures/<int:pk>/', views.FeeStructureDetail.as_view(), name='structure_detail'),

    # Student Fees
    path('student-fees/', views.StudentFeeListView.as_view(), name='student_fee_list'),
    path('student-fees/<int:pk>/', views.StudentFeeDetail.as_view(), name='student_fee_detail'),

    # Payments
    path('payments/', views.FeePaymentList.as_view(), name='payment_list'),
    path('payments/make/', views.MakePaymentView.as_view(), name='make_payment'),

    # Waivers
    path('waivers/', views.FeeWaiverListCreate.as_view(), name='waiver_list'),

    # Summary
    path('summary/', views.fee_summary, name='fee_summary'),
]
