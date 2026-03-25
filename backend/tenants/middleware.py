from django.http import JsonResponse
from django.utils import timezone
from .models import Tenant


class TenantMiddleware:
    """
    Resolves the current tenant from the request.
    Strategy: X-Tenant-Slug header (dev) or subdomain (prod).
    Also enforces subscription expiry.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None

        path = request.path
        if path.startswith('/api/tenants/') or path.startswith('/api/token') or path.startswith('/admin/'):
            return self.get_response(request)

        slug = request.headers.get('X-Tenant-Slug')

        if not slug:
            host = request.get_host().split(':')[0]
            parts = host.split('.')
            if len(parts) >= 3:
                slug = parts[0]

        if slug:
            try:
                tenant = Tenant.objects.get(slug=slug)
                if not tenant.is_accessible:
                    return JsonResponse(
                        {'detail': 'This organization account is suspended or expired.'},
                        status=403,
                    )
                # Check subscription expiry by date
                sub = tenant.active_subscription
                if sub and sub.end_date < timezone.now().date():
                    tenant.status = 'expired'
                    tenant.save(update_fields=['status'])
                    return JsonResponse(
                        {'detail': 'Subscription has expired. Please renew to continue.'},
                        status=403,
                    )
                request.tenant = tenant
            except Tenant.DoesNotExist:
                pass

        return self.get_response(request)
