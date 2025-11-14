# Production Troubleshooting Guide

## Common 500 Internal Server Error Causes

### 1. Database Migrations Not Run
**Solution:**
```bash
python manage.py migrate
```

### 2. Check Error Logs
Errors are logged to `django_errors.log` in the backend directory. Check this file for detailed error messages:
```bash
tail -f django_errors.log
```

### 3. Database Permissions
Ensure the database file has proper write permissions:
```bash
chmod 664 db.sqlite3
chown www-data:www-data db.sqlite3  # Adjust user/group as needed
```

### 4. Static Files Not Collected
If serving static files, run:
```bash
python manage.py collectstatic --noinput
```

### 5. Check Server Logs
Check your web server logs (nginx/apache) for additional error details.

### 6. Verify Environment
Ensure all required environment variables are set (if using any).

### 7. Test Locally with DEBUG=False
Test locally with `DEBUG = False` to catch production-specific issues:
```python
# In settings.py
DEBUG = False
```

### 8. Common Issues Fixed
- Empty `incorporation_date` field handling
- Better error logging
- Custom exception handler for clearer error messages

## Quick Debug Steps

1. Check `django_errors.log` for the actual error
2. Verify migrations: `python manage.py showmigrations`
3. Test database connection: `python manage.py dbshell`
4. Check permissions on database file
5. Verify ALLOWED_HOSTS includes your domain
6. Check CORS settings match your frontend domain

