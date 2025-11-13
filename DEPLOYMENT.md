# Deployment Guide

## Production URLs
- Frontend: `https://expense.lsofito.com`
- Backend API: `https://api-expense.lsofito.com`

## Backend Deployment

### Settings Configured
- `ALLOWED_HOSTS`: `['api-expense.lsofito.com', 'localhost', '127.0.0.1']`
- `CORS_ALLOWED_ORIGINS`: `['https://expense.lsofito.com']`
- `CSRF_TRUSTED_ORIGINS`: `['https://expense.lsofito.com']`
- `DEBUG`: `False` (production mode)

### Steps to Deploy Backend

1. **Collect static files:**
   ```bash
   cd backend
   python manage.py collectstatic --noinput
   ```

2. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

3. **Create superuser (if needed):**
   ```bash
   python manage.py createsuperuser
   ```

4. **Run with production server (e.g., gunicorn):**
   ```bash
   pip install gunicorn
   gunicorn expense_backend.wsgi:application --bind 0.0.0.0:8000
   ```

5. **Or use with reverse proxy (nginx):**
   - Configure nginx to proxy requests to `http://127.0.0.1:8000`
   - Set `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` in settings.py if using HTTPS
   - Set `SECURE_SSL_REDIRECT = True`, `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True` if using HTTPS

## Frontend Deployment

### Settings Configured
- API Base URL: Automatically detects environment
  - Production (expense.lsofito.com): `https://api-expense.lsofito.com/api`
  - Development (localhost): `http://localhost:8000/api`

### Steps to Deploy Frontend

1. **Build for production:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy the `dist` folder:**
   - Upload the contents of `frontend/dist/` to your web server
   - Configure your web server (nginx/apache) to serve files from the `dist` directory
   - Point `expense.lsofito.com` to this directory
   - The frontend will automatically use the production API URL when hosted at expense.lsofito.com

## Important Notes

- **HTTPS Settings**: If using HTTPS, update the security settings in `backend/expense_backend/settings.py`:
  - Set `SECURE_SSL_REDIRECT = True`
  - Set `SESSION_COOKIE_SECURE = True`
  - Set `CSRF_COOKIE_SECURE = True`
  - Set `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` if behind reverse proxy

- **SECRET_KEY**: Change the `SECRET_KEY` in `backend/expense_backend/settings.py` for production (currently using default)

- **Database**: Currently using SQLite. For production, consider PostgreSQL or MySQL.

