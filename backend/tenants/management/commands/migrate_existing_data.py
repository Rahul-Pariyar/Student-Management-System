"""
One-time migration: wraps all existing tenant=None data into a default tenant.
Usage: python manage.py migrate_existing_data
       python manage.py migrate_existing_data --name "My School" --slug "my-school"
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date, timedelta
from tenants.models import Tenant, Subscription, Plan
from accounts.models import User


class Command(BaseCommand):
    help = 'Assign all existing tenant=None data to a default tenant'

    def add_arguments(self, parser):
        parser.add_argument('--name', default='Default School')
        parser.add_argument('--slug', default='default-school')
        parser.add_argument('--email', default='admin@default-school.com')

    @transaction.atomic
    def handle(self, *args, **options):
        name = options['name']
        slug = options['slug']
        email = options['email']

        # Create or get the default tenant
        tenant, created = Tenant.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'email': email, 'status': 'active'},
        )
        if created:
            self.stdout.write(f"Created tenant: {tenant.name} ({tenant.slug})")
            # Give it a professional subscription
            plan = Plan.objects.filter(name='professional').first()
            if plan:
                Subscription.objects.create(
                    tenant=tenant,
                    plan=plan,
                    status='active',
                    start_date=date.today(),
                    end_date=date.today() + timedelta(days=365),
                    payment_status='waived',
                    notes='Auto-created for existing data migration',
                )
                self.stdout.write(f"  Assigned Professional plan")
        else:
            self.stdout.write(f"Using existing tenant: {tenant.name}")

        # Assign all users (except super_admin) that have no tenant
        users_updated = User.objects.filter(
            tenant=None
        ).exclude(user_type='super_admin').update(tenant=tenant)
        self.stdout.write(f"Updated {users_updated} users → tenant={tenant.name}")

        # Assign all tenant=None records in every app
        from academic.models import AcademicYear, Department
        from examination.models import ExamType
        from fees.models import FeeCategory
        from notifications.models import Notification

        ay = AcademicYear.objects.filter(tenant=None).update(tenant=tenant)
        dept = Department.objects.filter(tenant=None).update(tenant=tenant)
        et = ExamType.objects.filter(tenant=None).update(tenant=tenant)
        fc = FeeCategory.objects.filter(tenant=None).update(tenant=tenant)
        notif = Notification.objects.filter(tenant=None).update(tenant=tenant)

        self.stdout.write(f"AcademicYears: {ay}, Departments: {dept}, ExamTypes: {et}, FeeCategories: {fc}, Notifications: {notif}")
        self.stdout.write(self.style.SUCCESS(f'\nDone. All existing data is now under tenant: "{tenant.name}" (slug: {tenant.slug})'))
        self.stdout.write(f'\nThe "admin" user can now log in and see all their data.')
