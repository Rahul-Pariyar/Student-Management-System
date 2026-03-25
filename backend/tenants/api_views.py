from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q
from datetime import date, timedelta

from .models import Plan, Tenant, Subscription
from .serializers import (
    PlanSerializer, TenantSerializer, TenantCreateSerializer,
    SubscriptionSerializer,
)
from accounts.models import User, AdminProfile


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'super_admin'


# ── Plans ────────────────────────────────────────────────────

class PlanListView(generics.ListAPIView):
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class PlanAdminView(generics.ListCreateAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsSuperAdmin]


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsSuperAdmin]


# ── Tenants ──────────────────────────────────────────────────

class TenantListView(generics.ListAPIView):
    serializer_class = TenantSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = Tenant.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))
        return qs


class TenantCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = TenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = data.pop('plan')
        admin_username = data.pop('admin_username')
        admin_email = data.pop('admin_email')
        admin_password = data.pop('admin_password')
        admin_first_name = data.pop('admin_first_name', '')
        admin_last_name = data.pop('admin_last_name', '')

        # Create tenant
        tenant = Tenant.objects.create(**data, status='trial' if plan.name == 'free' else 'active')

        # Create subscription
        start = date.today()
        end = start + timedelta(days=30 * plan.duration_months)
        Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            status='active',
            start_date=start,
            end_date=end,
            payment_status='waived' if plan.name == 'free' else 'unpaid',
        )

        # Create org admin user linked to this tenant
        if User.objects.filter(username=admin_username, tenant=tenant).exists():
            raise serializers.ValidationError({'admin_username': 'Username already exists in this organization.'})
        user = User.objects.create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            first_name=admin_first_name,
            last_name=admin_last_name,
            user_type='admin',
            tenant=tenant,
        )
        AdminProfile.objects.create(
            user=user,
            employee_id=f"ADM-{tenant.slug.upper()}-001",
            department='Administration',
        )

        return Response(TenantSerializer(tenant).data, status=status.HTTP_201_CREATED)


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = 'pk'


class TenantSuspendView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        tenant = Tenant.objects.get(pk=pk)
        tenant.status = 'suspended'
        tenant.save()
        return Response({'status': 'suspended'})


class TenantActivateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        tenant = Tenant.objects.get(pk=pk)
        tenant.status = 'active'
        tenant.save()
        return Response({'status': 'active'})


# ── Subscriptions ────────────────────────────────────────────

class SubscriptionListView(generics.ListAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = Subscription.objects.select_related('tenant', 'plan').order_by('-created_at')
        tenant_id = self.request.query_params.get('tenant')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class SubscriptionCreateView(generics.CreateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSuperAdmin]


class SubscriptionDetailView(generics.RetrieveUpdateAPIView):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSuperAdmin]


# ── Super Admin Overview ─────────────────────────────────────

class SuperAdminOverviewView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        today = date.today()
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(status='active').count()
        trial_tenants = Tenant.objects.filter(status='trial').count()
        suspended_tenants = Tenant.objects.filter(status='suspended').count()
        expired_tenants = Tenant.objects.filter(status='expired').count()

        # Subscriptions expiring in next 30 days
        expiring_soon = Subscription.objects.filter(
            status='active',
            end_date__lte=today + timedelta(days=30),
            end_date__gte=today,
        ).count()

        # Revenue (manual payments)
        from django.db.models import Sum
        total_revenue = Subscription.objects.filter(
            payment_status='paid'
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        # Plan distribution
        plan_dist = (
            Subscription.objects.filter(status='active')
            .values('plan__name', 'plan__display_name')
            .annotate(count=Count('id'))
        )

        # Recent tenants
        recent_tenants = TenantSerializer(
            Tenant.objects.order_by('-created_at')[:5], many=True
        ).data

        return Response({
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'trial_tenants': trial_tenants,
            'suspended_tenants': suspended_tenants,
            'expired_tenants': expired_tenants,
            'expiring_soon': expiring_soon,
            'total_revenue': total_revenue,
            'plan_distribution': list(plan_dist),
            'recent_tenants': recent_tenants,
        })


# ── Tenant Subscription Status (for org admins) ──────────────

class TenantSubscriptionStatusView(APIView):
    """Returns the current subscription status for the logged-in user's tenant."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.tenant:
            return Response({'detail': 'No tenant associated.'}, status=404)

        tenant = user.tenant
        sub = tenant.active_subscription
        days_left = None
        if sub:
            days_left = (sub.end_date - date.today()).days

        return Response({
            'tenant_name': tenant.name,
            'tenant_status': tenant.status,
            'plan': sub.plan.name if sub else None,
            'plan_display': sub.plan.display_name if sub else None,
            'subscription_status': sub.status if sub else None,
            'end_date': sub.end_date if sub else None,
            'days_left': days_left,
            'payment_status': sub.payment_status if sub else None,
        })


# ── Impersonation ────────────────────────────────────────────────

class ImpersonateTenantView(APIView):
    """
    Super admin impersonates a tenant's admin user.
    Returns a short-lived JWT scoped to that tenant's first admin user.
    The frontend stores this separately and sends it as a normal Bearer token.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        from rest_framework_simplejwt.tokens import RefreshToken
        from accounts.models import User

        tenant = Tenant.objects.get(pk=pk)
        # Get the first admin user of this tenant
        admin_user = User.objects.filter(
            tenant=tenant, user_type='admin', is_active=True
        ).first()

        if not admin_user:
            return Response(
                {'detail': 'No active admin user found for this tenant.'},
                status=404,
            )

        refresh = RefreshToken.for_user(admin_user)
        # Embed impersonation metadata in the token
        refresh['impersonated_by'] = request.user.id
        refresh['impersonated_by_username'] = request.user.username

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'tenant_name': tenant.name,
            'tenant_slug': tenant.slug,
            'admin_username': admin_user.username,
            'admin_id': admin_user.id,
        })


# ── Impersonation ─────────────────────────────────────────────

class ImpersonateTenantView(APIView):
    """
    Super admin gets a short-lived impersonation JWT for a tenant.
    POST /api/tenants/impersonate/<tenant_id>/
    Returns: { token, tenant_name, tenant_id }
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        tenant = Tenant.objects.get(pk=pk)
        from .impersonation import create_impersonation_token
        token = create_impersonation_token(request.user, tenant)
        return Response({
            'token': token,
            'tenant_id': tenant.id,
            'tenant_name': tenant.name,
            'tenant_slug': tenant.slug,
        })
