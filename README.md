Expense Tracker (DRF + React Vite)

Simple 3-page app to track company income/expense with two partners.

Prerequisites
- Python 3.11+
- Node.js 18+

Setup

Backend
1) cd backend
2) python -m venv .venv
3) . .venv/Scripts/activate (Windows PowerShell: .venv\Scripts\Activate.ps1)
4) pip install -r requirements.txt
5) python manage.py migrate
6) (optional) python manage.py createsuperuser
7) python manage.py runserver 0.0.0.0:8000

API
- GET /api/transactions/?type=INCOME|EXPENSE
- POST /api/transactions/ { transaction_type, amount, description, date, account }
- GET /api/summary/

Frontend
1) cd ../frontend
2) npm install
3) npm run dev

Vite: http://localhost:5173, Backend: http://localhost:8000
To change API base, create frontend/.env: VITE_API_BASE=http://localhost:8000/api




