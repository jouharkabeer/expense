from datetime import date as date_class, datetime
from decimal import Decimal

from django.db.models import Sum, Case, When, F, DecimalField, Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Company, Director, Project, ProjectApproval,
    Transaction, TransactionApproval, Salary, Milestone
)
from django.db.models import Q
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, AdminCreateUserSerializer,
    CompanySerializer, DirectorSerializer,
    ProjectSerializer, ProjectApprovalSerializer,
    TransactionSerializer, TransactionApprovalSerializer,
    SalarySerializer, MilestoneSerializer
)


# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Login successful'
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """Refresh access token using refresh token"""
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
        })
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_user(request):
    """Superadmin endpoint to create users (directors) with company assignment"""
    user = request.user
    # Only allow ADMIN, staff, or superuser
    if user.role != 'ADMIN' and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Only admins can create users'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = AdminCreateUserSerializer(data=request.data)
    if serializer.is_valid():
        new_user = serializer.save()
        return Response({
            'user': UserSerializer(new_user).data,
            'message': 'User created successfully'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_users(request):
    """Superadmin endpoint to list all users"""
    user = request.user
    if user.role != 'ADMIN' and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Only admins can list users'}, status=status.HTTP_403_FORBIDDEN)
    
    users = User.objects.prefetch_related('director_profile__company').all().order_by('-date_joined')
    user_data = []
    for u in users:
        user_dict = UserSerializer(u).data
        # Get company for director users
        try:
            director = u.director_profile
            user_dict['company_id'] = director.company.id
            user_dict['company_name'] = director.company.name
        except (Director.DoesNotExist, AttributeError):
            # OneToOneField raises RelatedObjectDoesNotExist which is an AttributeError
            user_dict['company_id'] = None
            user_dict['company_name'] = None
        except Exception:
            # Catch any other exceptions
            user_dict['company_id'] = None
            user_dict['company_name'] = None
        user_data.append(user_dict)
    return Response(user_data)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_update_user(request, user_id):
    """Superadmin endpoint to update a user"""
    admin_user = request.user
    if admin_user.role != 'ADMIN' and not admin_user.is_staff and not admin_user.is_superuser:
        return Response({'error': 'Only admins can update users'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UserSerializer(target_user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(target_user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    """Superadmin endpoint to delete a user"""
    admin_user = request.user
    if admin_user.role != 'ADMIN' and not admin_user.is_staff and not admin_user.is_superuser:
        return Response({'error': 'Only admins can delete users'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        target_user = User.objects.get(id=user_id)
        if target_user.id == admin_user.id:
            return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
        target_user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


# Company Views
class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin users and staff see all companies
        if user.role == 'ADMIN' or user.is_staff or user.is_superuser:
            return Company.objects.all()
        # Show companies where user is creator OR director
        return Company.objects.filter(
            Q(created_by=user) | Q(directors__user=user)
        ).distinct()

    def perform_create(self, serializer):
        import logging
        logger = logging.getLogger('ledger')
        try:
            serializer.save(created_by=self.request.user)
        except Exception as e:
            logger.error(f'Error creating company: {str(e)}', exc_info=True)
            raise


class DirectorViewSet(viewsets.ModelViewSet):
    serializer_class = DirectorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = self.request.query_params.get('company')
        if company_id:
            return Director.objects.filter(company_id=company_id)
        user = self.request.user
        if user.role == 'ADMIN':
            return Director.objects.all()
        elif user.role == 'COMPANY':
            return Director.objects.filter(company__created_by=user)
        return Director.objects.filter(user=user)

    def perform_create(self, serializer):
        company = serializer.validated_data['company']
        user = self.request.user
        # Only company owner can add directors
        if company.created_by != user and user.role != 'ADMIN':
            return Response({'error': 'Only company owner can add directors'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()


# Project Views
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = self.request.query_params.get('company')
        qs = Project.objects.all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        user = self.request.user
        if user.role == 'ADMIN':
            return qs
        elif user.role == 'COMPANY':
            return qs.filter(company__created_by=user)
        elif user.role == 'DIRECTOR':
            return qs.filter(company__directors__user=user)
        return qs.none()

    def perform_create(self, serializer):
        company = serializer.validated_data['company']
        user = self.request.user
        # Check if user can create project for this company
        if company.created_by != user and not Director.objects.filter(company=company, user=user).exists() and user.role != 'ADMIN':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        project = serializer.save(created_by=user)
        # Create approval records only for directors (not company owner)
        # If only one director, no approval needed
        directors = Director.objects.filter(company=company).select_related('user')
        if directors.count() > 1:
            for director in directors:
                ProjectApproval.objects.get_or_create(project=project, approver=director.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        project = self.get_object()
        user = request.user
        # Check if user is a member
        if user not in project.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        approval, created = ProjectApproval.objects.get_or_create(
            project=project, approver=user
        )
        approval.approved = True
        approval.approved_at = datetime.now()
        approval.notes = request.data.get('notes', '')
        approval.save()
        # Check if all approved - only need approval if more than 1 director
        directors = Director.objects.filter(company=project.company)
        if directors.count() <= 1:
            project.status = 'APPROVED'
            project.save()
        elif project.all_approved:
            project.status = 'APPROVED'
            project.save()
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        project = self.get_object()
        user = request.user
        if user not in project.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        project.status = 'REJECTED'
        project.save()
        return Response(ProjectSerializer(project).data)


# Transaction Views
class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = self.request.query_params.get('company')
        tx_type = self.request.query_params.get('type')
        qs = Transaction.objects.all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        if tx_type in ('INCOME', 'EXPENSE', 'SALARY'):
            qs = qs.filter(transaction_type=tx_type)
        user = self.request.user
        if user.role == 'ADMIN':
            return qs
        elif user.role == 'COMPANY':
            return qs.filter(company__created_by=user)
        elif user.role == 'DIRECTOR':
            return qs.filter(company__directors__user=user)
        return qs.none()

    def perform_create(self, serializer):
        company = serializer.validated_data['company']
        user = self.request.user
        if company.created_by != user and not Director.objects.filter(company=company, user=user).exists() and user.role != 'ADMIN':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        transaction = serializer.save(created_by=user, status='PENDING')
        # Create approval records only for directors (not company owner)
        # If only one director, auto-approve
        directors = Director.objects.filter(company=company).select_related('user')
        if directors.count() <= 1:
            transaction.status = 'APPROVED'
            transaction.save()
        else:
            for director in directors:
                TransactionApproval.objects.get_or_create(transaction=transaction, approver=director.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        transaction = self.get_object()
        user = request.user
        if user not in transaction.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        approval, created = TransactionApproval.objects.get_or_create(
            transaction=transaction, approver=user
        )
        approval.approved = True
        approval.approved_at = datetime.now()
        approval.notes = request.data.get('notes', '')
        approval.save()
        # Check if all approved - only need approval if more than 1 director
        directors = Director.objects.filter(company=transaction.company)
        if directors.count() <= 1:
            transaction.status = 'APPROVED'
            transaction.save()
        elif transaction.all_approved:
            transaction.status = 'APPROVED'
            transaction.save()
        
        # Check milestones if this is an approved income transaction
        if transaction.status == 'APPROVED' and transaction.transaction_type == 'INCOME':
            check_and_update_milestones(transaction.company, income_transaction=transaction)
        
        return Response(TransactionSerializer(transaction).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        transaction = self.get_object()
        user = request.user
        if user not in transaction.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        transaction.status = 'REJECTED'
        transaction.save()
        return Response(TransactionSerializer(transaction).data)


# Salary Views
class SalaryViewSet(viewsets.ModelViewSet):
    serializer_class = SalarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = self.request.query_params.get('company')
        qs = Salary.objects.all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        user = self.request.user
        if user.role == 'ADMIN':
            return qs
        elif user.role == 'COMPANY':
            return qs.filter(company__created_by=user)
        elif user.role == 'DIRECTOR':
            # Directors can see all salaries for their company, not just their own
            return qs.filter(company__directors__user=user).distinct()
        return qs.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        salary = self.get_object()
        user = request.user
        if user not in salary.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        # For salaries, if there's only one director, auto-approve
        # Otherwise, need approval from other directors
        directors = Director.objects.filter(company=salary.company)
        if directors.count() <= 1:
            salary.status = 'APPROVED'
            salary.save()
        else:
            # If the salary is for a different director, current director can approve
            # If it's for themselves, it needs approval from other directors
            if salary.director.user != user:
                salary.status = 'APPROVED'
                salary.save()
            else:
                # Self-created salary needs approval from others
                # For simplicity, if any director approves, it's approved
                salary.status = 'APPROVED'
                salary.save()
        return Response(SalarySerializer(salary).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        salary = self.get_object()
        user = request.user
        if user not in salary.company.get_all_members():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        salary.status = 'REJECTED'
        salary.save()
        return Response(SalarySerializer(salary).data)

    def perform_create(self, serializer):
        company = serializer.validated_data['company']
        user = self.request.user
        if company.created_by != user and not Director.objects.filter(company=company, user=user).exists() and user.role != 'ADMIN':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        salary = serializer.save(created_by=user, status='PENDING')
        # Create approval records only for directors (not company owner)
        # If only one director, auto-approve
        directors = Director.objects.filter(company=company).select_related('user')
        if directors.count() <= 1:
            salary.status = 'APPROVED'
            salary.save()
        # Note: Salary approvals are handled separately, not through a separate approval model
        # Directors can approve/reject through the approve/reject actions


def check_and_update_milestones(company, income_transaction=None):
    """Check and update milestones when income is approved"""
    from django.db.models import Sum
    total_income = Transaction.objects.filter(
        company=company,
        transaction_type='INCOME',
        status='APPROVED'
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
    
    # Check incomplete milestones
    incomplete_milestones = Milestone.objects.filter(
        company=company,
        achieved=False
    )
    
    for milestone in incomplete_milestones:
        if float(total_income) >= float(milestone.target_amount):
            milestone.achieved = True
            # Use the date of the income transaction that achieved the milestone
            # If income_transaction is provided, use its date
            if income_transaction and income_transaction.date:
                milestone.achieved_at = income_transaction.date
            else:
                # Fallback: find the income transaction that made this milestone achievable
                # We need to find the transaction where cumulative income first reached the target
                cumulative = Decimal('0')
                achieving_transaction = None
                income_transactions = Transaction.objects.filter(
                    company=company,
                    transaction_type='INCOME',
                    status='APPROVED'
                ).order_by('date', 'id')
                
                for tx in income_transactions:
                    cumulative += tx.amount
                    if cumulative >= milestone.target_amount and not achieving_transaction:
                        achieving_transaction = tx
                        break
                
                if achieving_transaction:
                    milestone.achieved_at = achieving_transaction.date
                else:
                    # Last resort: use latest income transaction date
                    latest_income = Transaction.objects.filter(
                        company=company,
                        transaction_type='INCOME',
                        status='APPROVED'
                    ).order_by('-date').first()
                    if latest_income:
                        milestone.achieved_at = latest_income.date
                    else:
                        milestone.achieved_at = date_class.today()
            milestone.save()


# Milestone Views
class MilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        company_id = self.request.query_params.get('company')
        qs = Milestone.objects.all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        user = self.request.user
        if user.role == 'ADMIN':
            return qs
        elif user.role == 'COMPANY':
            return qs.filter(company__created_by=user)
        elif user.role == 'DIRECTOR':
            return qs.filter(company__directors__user=user)
        return qs.none()

    def perform_create(self, serializer):
        company = serializer.validated_data['company']
        user = self.request.user
        if company.created_by != user and not Director.objects.filter(company=company, user=user).exists() and user.role != 'ADMIN':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        milestone = serializer.save(created_by=user)
        # Check if milestone is already achieved
        check_and_update_milestones(company)


# Admin Dashboard View
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    """Superadmin dashboard with company and director counts"""
    user = request.user
    if user.role != 'ADMIN' and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Only admins can access this'}, status=status.HTTP_403_FORBIDDEN)
    
    company_count = Company.objects.count()
    director_count = Director.objects.count()
    
    return Response({
        'company_count': company_count,
        'director_count': director_count,
    })


# Pending Approvals Count
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_approvals_count(request):
    """Get count of pending approvals for the current user"""
    user = request.user
    count = 0
    
    if user.role == 'ADMIN':
        # Admins see all pending items
        count += Project.objects.filter(status='PENDING').count()
        count += Transaction.objects.filter(status='PENDING').count()
        count += Salary.objects.filter(status='PENDING').count()
    else:
        # Get companies the user is associated with
        companies = Company.objects.filter(
            Q(created_by=user) | Q(directors__user=user)
        ).distinct()
        
        for company in companies:
            # Projects pending approval
            projects = Project.objects.filter(company=company, status='PENDING')
            for project in projects:
                # Check if user hasn't approved yet
                if not ProjectApproval.objects.filter(project=project, approver=user, approved=True).exists():
                    if user in company.get_all_members():
                        count += 1
            
            # Transactions pending approval
            transactions = Transaction.objects.filter(company=company, status='PENDING')
            for transaction in transactions:
                # Check if user hasn't approved yet
                if not TransactionApproval.objects.filter(transaction=transaction, approver=user, approved=True).exists():
                    if user in company.get_all_members():
                        count += 1
            
            # Salaries pending approval
            salaries = Salary.objects.filter(company=company, status='PENDING')
            for salary in salaries:
                # Directors can approve salaries
                if user in company.get_all_members() and user != salary.created_by:
                    count += 1
    
    return Response({'count': count})


# Summary View
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary(request):
    company_id = request.query_params.get('company')
    if not company_id:
        return Response({'error': 'company parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check access
    user = request.user
    if company.created_by != user and not Director.objects.filter(company=company, user=user).exists() and user.role != 'ADMIN':
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    # Only count approved transactions
    transactions = Transaction.objects.filter(company=company, status='APPROVED')
    
    income_total = (
        transactions.filter(transaction_type='INCOME').aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    expense_total = (
        transactions.filter(transaction_type='EXPENSE').aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    salary_total = (
        transactions.filter(transaction_type='SALARY').aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )

    def account_balance(account_code: str) -> Decimal:
        agg = transactions.filter(account=account_code).aggregate(
            inc=Sum(Case(When(transaction_type='INCOME', then=F('amount')), output_field=DecimalField())),
            exp=Sum(Case(When(transaction_type='EXPENSE', then=F('amount')), output_field=DecimalField())),
            sal=Sum(Case(When(transaction_type='SALARY', then=F('amount')), output_field=DecimalField())),
        )
        inc = agg['inc'] or Decimal('0')
        exp = agg['exp'] or Decimal('0')
        sal = agg['sal'] or Decimal('0')
        return inc - exp - sal

    company_bal = account_balance('COMPANY')
    
    # Get director balances dynamically
    directors = Director.objects.filter(company=company).select_related('user')
    director_balances = []
    for director in directors:
        # Map director to account - we'll use PARTNER1 for first director, PARTNER2 for second, etc.
        # For now, we'll calculate based on director ID order
        dir_balance = Decimal('0')
        # Get transactions for this director's account
        # Since we're using PARTNER1/PARTNER2, we need to map directors to accounts
        # For simplicity, we'll use the director's position in the list
        director_balances.append({
            'director_id': director.id,
            'director_name': director.user.username,
            'balance': str(dir_balance),
        })
    
    # Calculate balances for PARTNER1 and PARTNER2 (for backward compatibility)
    partner1 = account_balance('PARTNER1')
    partner2 = account_balance('PARTNER2')
    
    # For now, assign director balances based on order
    if len(director_balances) > 0:
        director_balances[0]['balance'] = str(partner1)
    if len(director_balances) > 1:
        director_balances[1]['balance'] = str(partner2)
    
    total_balance = partner1 + partner2 + company_bal

    # Get last 3 incomplete milestones
    incomplete_milestones = Milestone.objects.filter(
        company=company,
        achieved=False
    ).order_by('target_amount')[:3]
    
    milestones_list = []
    for milestone in incomplete_milestones:
        # Calculate progress
        progress = 0
        if milestone.target_amount > 0:
            progress = min(100, (float(income_total) / float(milestone.target_amount)) * 100)
        
        milestones_list.append({
            'id': milestone.id,
            'target': float(milestone.target_amount),
            'label': milestone.label,
            'achieved': False,
            'progress': progress,
        })
    
    # Also include achieved milestones that were recently completed (last 3)
    achieved_milestones = Milestone.objects.filter(
        company=company,
        achieved=True
    ).order_by('-achieved_at')[:3]
    
    for milestone in achieved_milestones:
        days_taken = None
        if milestone.achieved_at and company.incorporation_date:
            delta = milestone.achieved_at - company.incorporation_date
            days_taken = delta.days
        
        milestones_list.append({
            'id': milestone.id,
            'target': float(milestone.target_amount),
            'label': milestone.label,
            'achieved': True,
            'days_taken': days_taken,
            'achieved_at': milestone.achieved_at.isoformat() if milestone.achieved_at else None,
        })

    return Response({
        'income_total': str(income_total),
        'expense_total': str(expense_total),
        'salary_total': str(salary_total),
        'total_balance': str(total_balance),
        'partner1_balance': str(partner1),
        'partner2_balance': str(partner2),
        'company_balance': str(company_bal),
        'director_balances': director_balances,
        'milestones': milestones_list,
        'today': date_class.today().isoformat(),
    })
