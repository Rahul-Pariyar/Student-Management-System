from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from tenants.mixins import TenantQuerysetMixin, get_request_tenant

from .models import FeeCategory, FeeStructure, StudentFee, FeePayment, FeeWaiver
from .serializers import (
    FeeCategorySerializer, FeeStructureSerializer, StudentFeeSerializer,
    FeePaymentSerializer, FeeWaiverSerializer, MakePaymentSerializer,
)
from accounts.api_views_new import IsAdmin, IsStudent, BlockImpersonation


# ─── Fee Categories ───────────────────────────────────────────

class FeeCategoryListCreate(TenantQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = FeeCategorySerializer
    queryset = FeeCategory.objects.all()
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class FeeCategoryDetail(TenantQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeCategory.objects.all()
    serializer_class = FeeCategorySerializer
    permission_classes = [IsAdmin, BlockImpersonation]


# ─── Fee Structure ────────────────────────────────────────────────

class FeeStructureListCreate(generics.ListCreateAPIView):
    serializer_class = FeeStructureSerializer
    filterset_fields = ['class_assigned', 'academic_year', 'frequency', 'is_active']

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = FeeStructure.objects.select_related(
            'class_assigned', 'academic_year'
        ).order_by('-created_at')
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        return qs

    def get_permissions(self):
        return [permissions.IsAuthenticated(), BlockImpersonation()]


class FeeStructureDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAdmin, BlockImpersonation]

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = FeeStructure.objects.all()
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        return qs


# ─── Student Fees ─────────────────────────────────────────────────

class StudentFeeListView(generics.ListAPIView):
    serializer_class = StudentFeeSerializer
    filterset_fields = ['student', 'payment_status', 'fee_structure']
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def get_queryset(self):
        user = self.request.user
        tenant = get_request_tenant(self.request)
        qs = StudentFee.objects.select_related(
            'student__user', 'fee_structure__class_assigned'
        ).prefetch_related('payments', 'waivers')

        if tenant:
            qs = qs.filter(fee_structure__academic_year__tenant=tenant)

        if user.user_type == 'student':
            return qs.filter(student=user.student_profile)
        elif user.user_type == 'parent':
            children = user.parent_profile.children.all()
            return qs.filter(student__in=children)
        return qs


class StudentFeeDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]


# ─── Make Payment ─────────────────────────────────────────────────

class MakePaymentView(APIView):
    permission_classes = [IsAdmin, BlockImpersonation]

    @transaction.atomic
    def post(self, request):
        serializer = MakePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        student_fee = generics.get_object_or_404(
            StudentFee, pk=data['student_fee_id']
        )

        payment = FeePayment.objects.create(
            student_fee=student_fee,
            amount=data['amount'],
            payment_method=data['payment_method'],
            transaction_id=data.get('transaction_id', ''),
            collected_by=request.user,
            remarks=data.get('remarks', ''),
        )

        return Response(FeePaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


# ─── Fee Payments ─────────────────────────────────────────────────

class FeePaymentList(generics.ListAPIView):
    serializer_class = FeePaymentSerializer
    filterset_fields = ['student_fee']
    permission_classes = [permissions.IsAuthenticated, BlockImpersonation]

    def get_queryset(self):
        tenant = get_request_tenant(self.request)
        qs = FeePayment.objects.select_related('student_fee', 'collected_by')
        if tenant:
            qs = qs.filter(student_fee__fee_structure__academic_year__tenant=tenant)
        return qs


# ─── Fee Waivers ──────────────────────────────────────────────────

class FeeWaiverListCreate(generics.ListCreateAPIView):
    serializer_class = FeeWaiverSerializer
    filterset_fields = ['student_fee', 'waiver_type', 'is_active']
    permission_classes = [IsAdmin, BlockImpersonation]

    def get_queryset(self):
        return FeeWaiver.objects.select_related('student_fee', 'approved_by')

    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)


# ─── Fee Summary ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, BlockImpersonation])
def fee_summary(request):
    """Summary stats for admin dashboard."""
    from django.db.models import Sum
    tenant = get_request_tenant(request)
    fees = StudentFee.objects.all()
    if tenant:
        fees = fees.filter(fee_structure__academic_year__tenant=tenant)

    total_due = fees.aggregate(s=Sum('amount_due'))['s'] or 0
    total_paid = fees.aggregate(s=Sum('amount_paid'))['s'] or 0
    total_pending = fees.filter(
        payment_status__in=['pending', 'partial', 'overdue']
    ).count()

    return Response({
        'total_due': float(total_due),
        'total_collected': float(total_paid),
        'total_outstanding': float(total_due - total_paid),
        'pending_count': total_pending,
        'paid_count': fees.filter(payment_status='paid').count(),
        'overdue_count': fees.filter(payment_status='overdue').count(),
    })
