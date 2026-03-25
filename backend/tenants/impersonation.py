"""
Impersonation support for super admins.

Flow:
  1. Super admin POSTs to /api/tenants/impersonate/<tenant_id>/
  2. Backend returns a short-lived JWT with an extra claim: impersonated_tenant_id
  3. Frontend stores this as 'impersonation_token' in localStorage
  4. When impersonating, frontend sends this token instead of the normal access token
  5. ImpersonationAuthentication reads the claim and sets request.impersonated_tenant
  6. TenantQuerysetMixin already checks request.impersonated_tenant first
"""
from datetime import timedelta
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from accounts.models import User
from .models import Tenant


def create_impersonation_token(super_admin_user, tenant):
    """
    Create a short-lived JWT (2 hours) that carries the impersonated_tenant_id claim.
    The token still identifies the super admin as the user.
    """
    token = AccessToken()
    token.set_exp(lifetime=timedelta(hours=2))
    token['user_id'] = super_admin_user.id
    token['impersonated_tenant_id'] = tenant.id
    return str(token)


class ImpersonationAuthentication(BaseAuthentication):
    """
    Reads the Authorization header. If the JWT contains 'impersonated_tenant_id',
    sets request.impersonated_tenant so TenantQuerysetMixin uses it.
    Falls through to standard JWT auth otherwise (returns None).
    """

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None

        raw_token = header.split(' ', 1)[1]
        try:
            token = AccessToken(raw_token)
        except TokenError:
            raise AuthenticationFailed('Invalid or expired token.')

        tenant_id = token.get('impersonated_tenant_id')
        if not tenant_id:
            return None  # not an impersonation token — let normal JWT auth handle it

        try:
            user = User.objects.get(pk=token['user_id'])
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found.')

        if user.user_type != 'super_admin':
            raise AuthenticationFailed('Only super admins can impersonate.')

        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            raise AuthenticationFailed('Tenant not found.')

        request.impersonated_tenant = tenant
        return (user, token)
