from django.urls import path
from . import api_views

urlpatterns = [
    # Super admin overview
    path('overview/', api_views.SuperAdminOverviewView.as_view(), name='super-admin-overview'),

    # Plans
    path('plans/', api_views.PlanListView.as_view(), name='plan-list'),
    path('plans/manage/', api_views.PlanAdminView.as_view(), name='plan-manage'),
    path('plans/<int:pk>/', api_views.PlanDetailView.as_view(), name='plan-detail'),

    # Tenants
    path('tenants/', api_views.TenantListView.as_view(), name='tenant-list'),
    path('tenants/create/', api_views.TenantCreateView.as_view(), name='tenant-create'),
    path('tenants/<int:pk>/', api_views.TenantDetailView.as_view(), name='tenant-detail'),
    path('tenants/<int:pk>/suspend/', api_views.TenantSuspendView.as_view(), name='tenant-suspend'),
    path('tenants/<int:pk>/activate/', api_views.TenantActivateView.as_view(), name='tenant-activate'),

    # Subscriptions
    path('subscriptions/', api_views.SubscriptionListView.as_view(), name='subscription-list'),
    path('subscriptions/create/', api_views.SubscriptionCreateView.as_view(), name='subscription-create'),
    path('subscriptions/<int:pk>/', api_views.SubscriptionDetailView.as_view(), name='subscription-detail'),

    # Impersonation
    path('tenants/<int:pk>/impersonate/', api_views.ImpersonateTenantView.as_view(), name='tenant-impersonate'),
]
