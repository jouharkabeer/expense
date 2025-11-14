from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, Company, Director, Project, ProjectApproval,
    Transaction, TransactionApproval, Salary, Milestone
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'is_staff', 'is_superuser']
        read_only_fields = ['id', 'role', 'is_staff', 'is_superuser']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=True)
    company_id = serializers.IntegerField(write_only=True, required=True)
    phone = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'role', 'company_id']

    def create(self, validated_data):
        company_id = validated_data.pop('company_id', None)
        password = validated_data.pop('password')
        # Set role to DIRECTOR if company is provided
        if company_id:
            validated_data['role'] = 'DIRECTOR'
        user = User.objects.create_user(password=password, **validated_data)
        
        # Create Director profile if company is provided
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                Director.objects.get_or_create(user=user, company=company)
            except Company.DoesNotExist:
                pass
        
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            attrs['user'] = user
        return attrs


class CompanySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    directors_count = serializers.SerializerMethodField()
    incorporation_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Company
        fields = ['id', 'name', 'created_by', 'created_by_name', 'created_at', 'incorporation_date', 'partner1_name', 'partner2_name', 'directors_count']
        read_only_fields = ['created_by', 'created_at']

    def get_directors_count(self, obj):
        return obj.directors.count()

    def to_internal_value(self, data):
        # Handle empty string for incorporation_date before validation
        if 'incorporation_date' in data and (data['incorporation_date'] == '' or data['incorporation_date'] is None):
            data['incorporation_date'] = None
        return super().to_internal_value(data)


class DirectorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Director
        fields = ['id', 'user', 'user_id', 'company', 'company_name', 'added_at']
        read_only_fields = ['added_at']


class ProjectApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.username', read_only=True)

    class Meta:
        model = ProjectApproval
        fields = ['id', 'project', 'approver', 'approver_name', 'approved', 'approved_at', 'notes']
        read_only_fields = ['approved_at']


class ProjectSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    approvals = ProjectApprovalSerializer(many=True, read_only=True)
    all_approved = serializers.BooleanField(read_only=True)
    pending_count = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'company', 'company_name', 'name', 'start_date', 'end_date',
            'project_value', 'received_amount', 'status', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'approvals', 'all_approved', 'pending_count', 'profit'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'all_approved']

    def get_pending_count(self, obj):
        return obj.pending_approvals.count()

    def get_profit(self, obj):
        from django.db.models import Sum
        from .models import Transaction
        income = Transaction.objects.filter(
            project=obj,
            transaction_type='INCOME',
            status='APPROVED'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        expense = Transaction.objects.filter(
            project=obj,
            transaction_type='EXPENSE',
            status='APPROVED'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        return float(income) - float(expense)


class TransactionApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.username', read_only=True)

    class Meta:
        model = TransactionApproval
        fields = ['id', 'transaction', 'approver', 'approver_name', 'approved', 'approved_at', 'notes']
        read_only_fields = ['approved_at']


class TransactionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    approvals = TransactionApprovalSerializer(many=True, read_only=True)
    all_approved = serializers.BooleanField(read_only=True)
    pending_count = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'company', 'company_name', 'transaction_type', 'amount', 'description',
            'date', 'account', 'project', 'project_name', 'is_project_related',
            'created_by', 'created_by_name', 'created_at', 'status', 'approvals',
            'all_approved', 'pending_count'
        ]
        read_only_fields = ['created_by', 'created_at', 'status', 'all_approved']

    def get_pending_count(self, obj):
        members = obj.company.get_all_members()
        approvals = TransactionApproval.objects.filter(transaction=obj, approved=True)
        return len(members) - approvals.count()


class SalarySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    director_name = serializers.CharField(source='director.user.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = Salary
        fields = [
            'id', 'company', 'company_name', 'director', 'director_name',
            'amount', 'description', 'date', 'account', 'created_by', 'created_by_name',
            'created_at', 'status'
        ]
        read_only_fields = ['created_by', 'created_at', 'status']


class MilestoneSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    progress = serializers.SerializerMethodField()
    days_taken = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = [
            'id', 'company', 'company_name', 'target_amount', 'label',
            'achieved', 'achieved_at', 'created_by', 'created_by_name',
            'created_at', 'progress', 'days_taken'
        ]
        read_only_fields = ['created_by', 'created_at', 'achieved', 'achieved_at']

    def get_progress(self, obj):
        from django.db.models import Sum
        from .models import Transaction
        total_income = Transaction.objects.filter(
            company=obj.company,
            transaction_type='INCOME',
            status='APPROVED'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        if obj.target_amount > 0:
            return min(100, (float(total_income) / float(obj.target_amount)) * 100)
        return 0

    def get_days_taken(self, obj):
        if obj.achieved and obj.achieved_at and obj.company.incorporation_date:
            delta = obj.achieved_at - obj.company.incorporation_date
            return delta.days
        return None
