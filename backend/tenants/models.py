from django.db import models
from django.utils import timezone


class Plan(models.Model):
    PLAN_CHOICES = (
        ('free', 'Free Trial'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    )
    name = models.CharField(max_length=20, choices=PLAN_CHOICES, unique=True)
    display_name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    duration_months = models.PositiveIntegerField()  # 1, 1, 12, 24-36
    max_students = models.PositiveIntegerField(default=0)  # 0 = unlimited
    max_teachers = models.PositiveIntegerField(default=0)
    features = models.JSONField(default=dict)  # feature flags
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.display_name


class Tenant(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('suspended', 'Suspended'),
        ('expired', 'Expired'),
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)  # used as subdomain / identifier
    email = models.EmailField()           # org contact email
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='tenant_logos/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def active_subscription(self):
        return self.subscriptions.filter(status='active').order_by('-end_date').first()

    @property
    def is_accessible(self):
        return self.status in ('active', 'trial')


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending Payment'),
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_date = models.DateField()
    end_date = models.DateField()
    # Manual payment tracking
    payment_status = models.CharField(
        max_length=20,
        choices=(('paid', 'Paid'), ('unpaid', 'Unpaid'), ('waived', 'Waived')),
        default='unpaid',
    )
    payment_reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.display_name} ({self.status})"

    def is_active(self):
        return self.status == 'active' and self.end_date >= timezone.now().date()
