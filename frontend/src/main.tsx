import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expense from './pages/Expense'
import Salary from './pages/Salary'
import Projects from './pages/Projects'
import CompanySetup from './pages/CompanySetup'
import SuperAdmin from './pages/SuperAdmin'
import './styles.css'
import Login from './pages/Login'
import AuthGate from './components/AuthGate'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <AuthGate><Dashboard /></AuthGate> },
      { path: 'superadmin', element: <AuthGate><SuperAdmin /></AuthGate> },
      { path: 'company', element: <AuthGate><CompanySetup /></AuthGate> },
      { path: 'projects', element: <AuthGate><Projects /></AuthGate> },
      { path: 'income', element: <AuthGate><Income /></AuthGate> },
      { path: 'expense', element: <AuthGate><Expense /></AuthGate> },
      { path: 'salary', element: <AuthGate><Salary /></AuthGate> },
    ],
  },
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
