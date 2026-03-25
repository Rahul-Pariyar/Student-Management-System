"""
Shared mixin for tenant-scoped querysets.

Usage in any view:
    class MyView(TenantQuerysetMixin, generics.ListCreateAPIView):
        ...

The mixin injects .filter(tenant=request.user.tenant) automatically.
Super admins bypass filtering (they see all tenants).
Impersonating super admins use the impersonated tenant stored in the JWT.
"""
from django.core.exceptions import PermissionDenied


def get_request_tenant(request):
    """
    Returns the effective tenant for a request.
    - Impersonating super admin → impersonated_tenant
    - Normal tenant user → user.tenant
    - Super admin not impersonating → None (sees all)
    """
    if hasattr(request, 'impersonated_tenant'):
        return request.impersonated_tenant
    if request.user.tenant:
        return request.user.tenant
    if request.user.user_type == 'super_admin':
        return None
    return None


class TenantQuerysetMixin:
    """
    Filters querysets to the current user's tenant.
    Override `tenant_field` if the model's FK to Tenant is not named 'tenant'.
    """
    tenant_field = 'tenant'

    def get_tenant(self):
        return get_request_tenant(self.request)

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self.get_tenant()
        if tenant is not None:
            qs = qs.filter(**{self.tenant_field: tenant})
        return qs

    def perform_create(self, serializer):
        tenant = self.get_tenant()
        # Only inject tenant if the field is a direct FK on the model (no __ traversal)
        if tenant and '__' not in self.tenant_field:
            serializer.save(**{self.tenant_field: tenant})
        else:
            serializer.save()
