from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from .models import FeeCategory, FeeStructure, StudentFee, FeePayment, FeeWaiver
from .serializers import (
    FeeCategorySerializer, FeeStructureSerializer, StudentFeeSerializer,
    FeePaymentSerializer, FeeWaiverSerializer, MakePaymentSerializer,
)
from accounts.api_views_new import IsAdmin, IsStudent


# ─── Fee Categories ───────────────────────────────────────────

class FeeCategoryListCreate(generics.ListCreateAPIView):
    serializer_class = FeeCategorySerializer
    queryset = FeeCategory.objects.all()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class FeeCategoryDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeCategory.objects.all()
    serializer_class = FeeCategorySerializer
    permission_classes = [IsAdmin]


# ─── Fee Structure ────────────────────────────────────────────────

class FeeStructureListCreate(generics.ListCreateAPIView):
    serializer_class = FeeStructureSerializer
    filterset_fields = ['class_assigned', 'academic_year', 'frequency', 'is_active']

    def get_queryset(self):
        return FeeStructure.objects.select_related(
            'class_assigned', 'academic_year'
        ).order_by('-created_at')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class FeeStructureDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAdmin]


# ─── Student Fees ─────────────────────────────────────────────────

class StudentFeeListView(generics.ListAPIView):
    serializer_class = StudentFeeSerializer
    filterset_fields = ['student', 'payment_status', 'fee_structure']

    def get_queryset(self):
        user = self.request.user
        qs = StudentFee.objects.select_related(
            'student__user', 'fee_structure__class_assigned'
        ).prefetch_related('payments', 'waivers')

        if user.user_type == 'student':
            return qs.filter(student=user.student_profile)
        elif user.user_type == 'parent':
            children = user.parent_profile.children.all()
            return qs.filter(student__in=children)
        return qs  # admin / teacher


class StudentFeeDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


# ─── Make Payment ─────────────────────────────────────────────────

class MakePaymentView(APIView):
    permission_classes = [IsAdmin]

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

    def get_queryset(self):
        return FeePayment.objects.select_related('student_fee', 'collected_by')


# ─── Fee Waivers ──────────────────────────────────────────────────

class FeeWaiverListCreate(generics.ListCreateAPIView):
    serializer_class = FeeWaiverSerializer
    filterset_fields = ['student_fee', 'waiver_type', 'is_active']
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return FeeWaiver.objects.select_related('student_fee', 'approved_by')

    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)


# ─── Fee Summary ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def fee_summary(request):
    """Summary stats for admin dashboard."""
    from django.db.models import Sum
    fees = StudentFee.objects.all()

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
