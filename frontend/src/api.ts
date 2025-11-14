// API Base URL - automatically detects environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api'  // Local development
  : 'https://api-expense.lsofito.com/api'  // Production

// Types
export type TransactionType = 'INCOME' | 'EXPENSE' | 'SALARY'
export type Account = 'PARTNER1' | 'PARTNER2' | 'COMPANY'
export type UserRole = 'ADMIN' | 'COMPANY' | 'DIRECTOR'
export type ProjectStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone: string
  is_staff?: boolean
  is_superuser?: boolean
  company_id?: number
  company_name?: string
}

export interface Company {
  id: number
  name: string
  created_by: number
  created_by_name: string
  created_at: string
  incorporation_date?: string
  partner1_name: string
  partner2_name: string
  directors_count: number
}

export interface Director {
  id: number
  user: User
  user_id: number
  company: number
  company_name: string
  added_at: string
}

export interface Project {
  id: number
  company: number
  company_name: string
  name: string
  start_date: string
  end_date?: string
  project_value: string
  received_amount: string
  status: ProjectStatus
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
  approvals: ProjectApproval[]
  all_approved: boolean
  pending_count: number
  profit?: number
}

export interface ProjectApproval {
  id: number
  project: number
  approver: number
  approver_name: string
  approved: boolean
  approved_at?: string
  notes: string
}

export interface Transaction {
  id?: number
  company: number
  company_name?: string
  transaction_type: TransactionType
  amount: string
  description: string
  date: string
  account: Account
  project?: number
  project_name?: string
  is_project_related: boolean
  created_by?: number
  created_by_name?: string
  created_at?: string
  status: ApprovalStatus
  approvals: TransactionApproval[]
  all_approved: boolean
  pending_count: number
}

export interface TransactionApproval {
  id: number
  transaction: number
  approver: number
  approver_name: string
  approved: boolean
  approved_at?: string
  notes: string
}

export interface Salary {
  id?: number
  company: number
  company_name?: string
  director: number
  director_name?: string
  amount: string
  description: string
  date: string
  account: Account
  created_by?: number
  created_by_name?: string
  created_at?: string
  status: ApprovalStatus
}

export interface Summary {
  income_total: string
  expense_total: string
  salary_total: string
  total_balance: string
  partner1_balance: string
  partner2_balance: string
  company_balance: string
  director_balances?: Array<{ director_id: number; director_name: string; balance: string }>
  milestones: Array<{
    id?: number
    target: number
    label: string
    achieved: boolean
    days_taken?: number
    achieved_at?: string
    progress?: number
  }>
  today: string
}

export interface Milestone {
  id?: number
  company?: number
  company_name?: string
  target_amount: number
  label: string
  achieved: boolean
  achieved_at?: string
  created_by?: number
  created_by_name?: string
  created_at?: string
  progress?: number
  days_taken?: number
}

// Token management
function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(BASE_URL + '/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('access_token', data.access)
      return data.access
    }
  } catch (e) {
    // Ignore errors
  }
  return null
}

// Helper function for authenticated requests
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let accessToken = getAccessToken()
  
  // Try to refresh if no token
  if (!accessToken) {
    accessToken = await refreshAccessToken()
    if (!accessToken) {
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
  }
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  
  // If 401, try refreshing token once
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...options.headers,
        },
      })
    }
    clearTokens()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res
}

// Auth APIs
export async function register(data: { username: string; email: string; password: string; password_confirm: string; first_name?: string; last_name?: string; phone?: string; role?: UserRole }): Promise<{ user: User; access: string; refresh: string }> {
  const res = await fetch(BASE_URL + '/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || err.error || 'Failed to register')
  }
  const data_res = await res.json()
  setTokens(data_res.access, data_res.refresh)
  return data_res
}

export async function login(username: string, password: string): Promise<{ user: User; access: string; refresh: string }> {
  const res = await fetch(BASE_URL + '/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || err.error || 'Invalid credentials')
  }
  const data = await res.json()
  setTokens(data.access, data.refresh)
  return data
}

export async function logout(): Promise<void> {
  clearTokens()
}

export async function getCurrentUser(): Promise<User> {
  const res = await authFetch(BASE_URL + '/auth/me/')
  if (!res.ok) {
    clearTokens()
    throw new Error('Failed to get current user')
  }
  return res.json()
}

// Admin APIs
export async function listAllUsers(): Promise<User[]> {
  const res = await authFetch(BASE_URL + '/admin/users/')
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function adminCreateUser(data: { username: string; email: string; password: string; phone: string; company_id: number }): Promise<{ user: User; message: string }> {
  const res = await authFetch(BASE_URL + '/admin/users/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || err.detail || 'Failed to create user')
  }
  return res.json()
}

export async function adminUpdateUser(userId: number, data: Partial<User>): Promise<User> {
  const res = await authFetch(BASE_URL + `/admin/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || err.detail || 'Failed to update user')
  }
  return res.json()
}

export async function adminDeleteUser(userId: number): Promise<void> {
  const res = await authFetch(BASE_URL + `/admin/users/${userId}/delete/`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || err.detail || 'Failed to delete user')
  }
}

// Company APIs
export async function listCompanies(): Promise<Company[]> {
  const res = await authFetch(BASE_URL + '/companies/')
  if (!res.ok) throw new Error('Failed to load companies')
  return res.json()
}

export async function createCompany(data: { name: string; partner1_name?: string; partner2_name?: string }): Promise<Company> {
  const res = await authFetch(BASE_URL + '/companies/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create company')
  return res.json()
}

export async function getCompany(id: number): Promise<Company> {
  const res = await authFetch(BASE_URL + `/companies/${id}/`)
  if (!res.ok) throw new Error('Failed to load company')
  return res.json()
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<Company> {
  const res = await authFetch(BASE_URL + `/companies/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update company')
  return res.json()
}

export async function deleteCompany(id: number): Promise<void> {
  const res = await authFetch(BASE_URL + `/companies/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete company')
}

// Director APIs
export async function listDirectors(companyId?: number): Promise<Director[]> {
  const url = new URL(BASE_URL + '/directors/')
  if (companyId) url.searchParams.set('company', String(companyId))
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load directors')
  return res.json()
}

export async function getCompanyDirectors(companyId: number): Promise<Director[]> {
  return listDirectors(companyId)
}

export async function addDirector(data: { user_id: number; company: number }): Promise<Director> {
  const res = await authFetch(BASE_URL + '/directors/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add director')
  return res.json()
}

// Project APIs
export async function listProjects(companyId?: number): Promise<Project[]> {
  const url = new URL(BASE_URL + '/projects/')
  if (companyId) url.searchParams.set('company', String(companyId))
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load projects')
  return res.json()
}

export async function createProject(data: { company: number; name: string; start_date: string; end_date?: string; project_value: string; received_amount?: string }): Promise<Project> {
  const res = await authFetch(BASE_URL + '/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const res = await authFetch(BASE_URL + `/projects/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update project')
  return res.json()
}

export async function deleteProject(id: number): Promise<void> {
  const res = await authFetch(BASE_URL + `/projects/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete project')
}

export async function approveProject(id: number, notes?: string): Promise<Project> {
  const res = await authFetch(BASE_URL + `/projects/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) throw new Error('Failed to approve project')
  return res.json()
}

export async function rejectProject(id: number): Promise<Project> {
  const res = await authFetch(BASE_URL + `/projects/${id}/reject/`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reject project')
  return res.json()
}

// Transaction APIs
export async function listTransactions(companyId?: number, type?: TransactionType): Promise<Transaction[]> {
  const url = new URL(BASE_URL + '/transactions/')
  if (companyId) url.searchParams.set('company', String(companyId))
  if (type) url.searchParams.set('type', type)
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load transactions')
  return res.json()
}

export async function createTransaction(tx: Transaction): Promise<Transaction> {
  const res = await authFetch(BASE_URL + '/transactions/', {
    method: 'POST',
    body: JSON.stringify(tx),
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

export async function updateTransaction(id: number, tx: Partial<Transaction>): Promise<Transaction> {
  const res = await authFetch(BASE_URL + `/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(tx),
  })
  if (!res.ok) throw new Error('Failed to update transaction')
  return res.json()
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await authFetch(BASE_URL + `/transactions/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete transaction')
}

export async function approveTransaction(id: number, notes?: string): Promise<Transaction> {
  const res = await authFetch(BASE_URL + `/transactions/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) throw new Error('Failed to approve transaction')
  return res.json()
}

export async function rejectTransaction(id: number): Promise<Transaction> {
  const res = await authFetch(BASE_URL + `/transactions/${id}/reject/`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reject transaction')
  return res.json()
}

// Salary APIs
export async function listSalaries(companyId?: number): Promise<Salary[]> {
  const url = new URL(BASE_URL + '/salaries/')
  if (companyId) url.searchParams.set('company', String(companyId))
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load salaries')
  return res.json()
}

export async function createSalary(data: Salary): Promise<Salary> {
  const res = await authFetch(BASE_URL + '/salaries/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create salary')
  return res.json()
}

// Milestone APIs
export async function listMilestones(companyId?: number): Promise<Milestone[]> {
  const url = new URL(BASE_URL + '/milestones/')
  if (companyId) url.searchParams.set('company', String(companyId))
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load milestones')
  return res.json()
}

export async function createMilestone(data: { company: number; target_amount: number; label: string }): Promise<Milestone> {
  const res = await authFetch(BASE_URL + '/milestones/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || err.detail || 'Failed to create milestone')
  }
  return res.json()
}

export async function updateMilestone(id: number, data: Partial<Milestone>): Promise<Milestone> {
  const res = await authFetch(BASE_URL + `/milestones/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update milestone')
  return res.json()
}

export async function deleteMilestone(id: number): Promise<void> {
  const res = await authFetch(BASE_URL + `/milestones/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete milestone')
}

// Summary API
export async function getSummary(companyId: number): Promise<Summary> {
  const url = new URL(BASE_URL + '/summary/')
  url.searchParams.set('company', String(companyId))
  const res = await authFetch(url.toString())
  if (!res.ok) throw new Error('Failed to load summary')
  return res.json()
}

// Admin Dashboard API
export async function getAdminDashboard(): Promise<{ company_count: number; director_count: number }> {
  const res = await authFetch(BASE_URL + '/admin/dashboard/')
  if (!res.ok) throw new Error('Failed to load admin dashboard')
  return res.json()
}
