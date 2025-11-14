from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    register, login_view, current_user, refresh_token_view,
    admin_create_user, list_all_users, admin_update_user, admin_delete_user,
    CompanyViewSet, DirectorViewSet, ProjectViewSet,
    TransactionViewSet, SalaryViewSet, MilestoneViewSet, summary, admin_dashboard
)


router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'directors', DirectorViewSet, basename='director')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'salaries', SalaryViewSet, basename='salary')
router.register(r'milestones', MilestoneViewSet, basename='milestone')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/refresh/', refresh_token_view, name='refresh_token'),
    path('auth/me/', current_user, name='current_user'),
    path('admin/users/', list_all_users, name='list_users'),
    path('admin/users/create/', admin_create_user, name='admin_create_user'),
    path('admin/users/<int:user_id>/', admin_update_user, name='admin_update_user'),
    path('admin/users/<int:user_id>/delete/', admin_delete_user, name='admin_delete_user'),
    path('admin/dashboard/', admin_dashboard, name='admin_dashboard'),
    path('summary/', summary, name='summary'),
]
