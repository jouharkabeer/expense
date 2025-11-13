from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator


class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('COMPANY', 'Company'),
        ('DIRECTOR', 'Director'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='DIRECTOR')
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Company(models.Model):
    name = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='companies_created')
    created_at = models.DateTimeField(auto_now_add=True)
    partner1_name = models.CharField(max_length=100, default='Jouhar')
    partner2_name = models.CharField(max_length=100, default='Aleena')

    class Meta:
        verbose_name_plural = 'Companies'

    def __str__(self):
        return self.name

    def get_all_members(self):
        """Returns all users who can approve (company owner + directors)"""
        try:
            members = [self.created_by]
            # Use select_related to avoid N+1 queries and ensure user is loaded
            directors = self.directors.select_related('user').all()
            members.extend([d.user for d in directors])
            return members
        except Exception:
            # Fallback if there's any issue accessing relations
            return [self.created_by] if self.created_by_id else []


class Director(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='director_profile')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='directors')
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.company.name}"


class Project(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Completed'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    project_value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    received_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.company.name}"

    @property
    def is_approved(self):
        return self.status == 'APPROVED'

    @property
    def pending_approvals(self):
        return ProjectApproval.objects.filter(project=self, approved=False)

    @property
    def all_approved(self):
        # Only directors need to approve, not company owner
        directors = Director.objects.filter(company=self.company)
        if directors.count() <= 1:
            return True  # No approval needed if only one director
        approvals = ProjectApproval.objects.filter(project=self, approved=True)
        return approvals.count() == directors.count()


class ProjectApproval(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_approvals')
    approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['project', 'approver']

    def __str__(self):
        return f"{self.project.name} - {self.approver.username} ({'Approved' if self.approved else 'Pending'})"


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        INCOME = 'INCOME', 'Income'
        EXPENSE = 'EXPENSE', 'Expense'
        SALARY = 'SALARY', 'Salary'

    class Account(models.TextChoices):
        PARTNER1 = 'PARTNER1', 'Jouhar'
        PARTNER2 = 'PARTNER2', 'Aleena'
        COMPANY = 'COMPANY', 'Company Account'

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    account = models.CharField(max_length=10, choices=Account.choices)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    is_project_related = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions_created')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='PENDING', choices=[
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ])

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self) -> str:
        return f"{self.transaction_type} {self.amount} on {self.date} -> {self.account}"

    @property
    def all_approved(self):
        # Only directors need to approve, not company owner
        directors = Director.objects.filter(company=self.company)
        if directors.count() <= 1:
            return True  # No approval needed if only one director
        approvals = TransactionApproval.objects.filter(transaction=self, approved=True)
        return approvals.count() == directors.count()


class TransactionApproval(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transaction_approvals')
    approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['transaction', 'approver']

    def __str__(self):
        return f"{self.transaction} - {self.approver.username} ({'Approved' if self.approved else 'Pending'})"


class Salary(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='salaries')
    director = models.ForeignKey(Director, on_delete=models.CASCADE, related_name='salaries')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    account = models.CharField(max_length=10, choices=Transaction.Account.choices)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='salaries_created')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='PENDING', choices=[
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ])

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"Salary {self.amount} for {self.director.user.username} on {self.date}"


