from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Company, Director, Project, ProjectApproval,
    Transaction, TransactionApproval, Salary
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'first_name', 'last_name')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone')}),
    )


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'created_at', 'partner1_name', 'partner2_name')
    list_filter = ('created_at',)
    search_fields = ('name',)
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('created_by')


@admin.register(Director)
class DirectorAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'added_at')
    list_filter = ('company', 'added_at')
    search_fields = ('user__username', 'company__name')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'status', 'project_value', 'received_amount', 'created_by', 'created_at')
    list_filter = ('status', 'created_at', 'company')
    search_fields = ('name', 'company__name')


@admin.register(ProjectApproval)
class ProjectApprovalAdmin(admin.ModelAdmin):
    list_display = ('project', 'approver', 'approved', 'approved_at')
    list_filter = ('approved', 'approved_at')
    search_fields = ('project__name', 'approver__username')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_type', 'amount', 'account', 'company', 'status', 'date')
    list_filter = ('transaction_type', 'account', 'status', 'date', 'company')
    search_fields = ('description', 'company__name')


@admin.register(TransactionApproval)
class TransactionApprovalAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'approver', 'approved', 'approved_at')
    list_filter = ('approved', 'approved_at')
    search_fields = ('transaction__description', 'approver__username')


@admin.register(Salary)
class SalaryAdmin(admin.ModelAdmin):
    list_display = ('director', 'amount', 'account', 'date', 'status', 'created_at')
    list_filter = ('status', 'account', 'date', 'company')
    search_fields = ('director__user__username', 'description')
