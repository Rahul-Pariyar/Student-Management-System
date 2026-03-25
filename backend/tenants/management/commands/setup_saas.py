"""
Management command to seed SaaS plans and create the super admin user.
Usage: python manage.py setup_saas --username admin --password secret
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from tenants.models import Plan
from accounts.models import User


PLANS = [
    {
        'name': 'free',
        'display_name': 'Free Trial',
        'price': 0,
        'duration_months': 1,
        'max_students': 50,
        'max_teachers': 5,
        'features': {'assignments': True, 'attendance': True, 'examinations': False, 'fees': False},
    },
    {
        'name': 'starter',
        'display_name': 'Starter',
        'price': 999,
        'duration_months': 1,
        'max_students': 200,
        'max_teachers': 20,
        'features': {'assignments': True, 'attendance': True, 'examinations': True, 'fees': False},
    },
    {
        'name': 'professional',
        'display_name': 'Professional',
        'price': 7999,
        'duration_months': 12,
        'max_students': 1000,
        'max_teachers': 100,
        'features': {'assignments': True, 'attendance': True, 'examinations': True, 'fees': True},
    },
    {
        'name': 'enterprise',
        'display_name': 'Enterprise',
        'price': 14999,
        'duration_months': 24,
        'max_students': 0,  # unlimited
        'max_teachers': 0,
        'features': {'assignments': True, 'attendance': True, 'examinations': True, 'fees': True, 'priority_support': True},
    },
]


class Command(BaseCommand):
    help = 'Seed SaaS plans and create super admin user'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='superadmin')
        parser.add_argument('--email', default='superadmin@eduflow.com')
        parser.add_argument('--password', default='superadmin123')

    @transaction.atomic
    def handle(self, *args, **options):
        # Seed plans
        for plan_data in PLANS:
            plan, created = Plan.objects.update_or_create(
                name=plan_data['name'],
                defaults=plan_data,
            )
            self.stdout.write(f"{'Created' if created else 'Updated'} plan: {plan.display_name}")

        # Create super admin
        username = options['username']
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=options['email'],
                password=options['password'],
                user_type='super_admin',
                tenant=None,
            )
            self.stdout.write(self.style.SUCCESS(f"Super admin '{username}' created."))
        else:
            self.stdout.write(f"Super admin '{username}' already exists.")

        self.stdout.write(self.style.SUCCESS('SaaS setup complete.'))
