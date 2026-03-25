from django.contrib import admin
from .models import Plan, Tenant, Subscription

admin.site.register(Plan)
admin.site.register(Tenant)
admin.site.register(Subscription)
