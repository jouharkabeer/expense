import { FormEvent, useEffect, useState } from 'react'
import { listCompanies, createCompany, updateCompany, deleteCompany, listAllUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, User, Company } from '../api'
import { getCurrentUserSync } from '../auth'

export default function SuperAdmin() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'companies' | 'users'>('companies')
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    company_id: '',
  })

  useEffect(() => {
    if (user?.role === 'ADMIN' || (user as any)?.is_staff || (user as any)?.is_superuser) {
      loadData()
    }
  }, [])

  async function loadData() {
    try {
      const [comps, usrs] = await Promise.all([
        listCompanies(),
        listAllUsers(),
      ])
      setCompanies(comps)
      setUsers(usrs)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleCreateCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const form = e.currentTarget
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
      }
      await createCompany(data)
      setSuccess('Company created successfully!')
      setShowCompanyForm(false)
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingCompany) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const form = e.currentTarget
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
      }
      await updateCompany(editingCompany.id!, data)
      setSuccess('Company updated successfully!')
      setEditingCompany(null)
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCompany(companyId: number) {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await deleteCompany(companyId)
      setSuccess('Company deleted successfully!')
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (!userForm.company_id) {
        setError('Please select a company')
        setLoading(false)
        return
      }
      const data: any = {
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        phone: userForm.phone,
        company_id: Number(userForm.company_id),
      }

      const result = await adminCreateUser(data)
      setSuccess(`User "${result.user.username}" created successfully! Username: ${userForm.username}, Password: ${userForm.password}`)
      setUserForm({ username: '', email: '', password: '', phone: '', company_id: '' })
      setShowUserForm(false)
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateUser(e: FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const data: any = {}
      if (userForm.username) data.username = userForm.username
      if (userForm.email) data.email = userForm.email
      if (userForm.phone) data.phone = userForm.phone

      await adminUpdateUser(editingUser.id, data)
      setSuccess('User updated successfully!')
      setEditingUser(null)
      setUserForm({ username: '', email: '', password: '', phone: '', company_id: '' })
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await adminDeleteUser(userId)
      setSuccess('User deleted successfully!')
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEditCompany(company: Company) {
    setEditingCompany(company)
    setShowCompanyForm(false)
  }

  function startEditUser(user: User) {
    setEditingUser(user)
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      phone: user.phone || '',
      company_id: '',
    })
    setShowUserForm(false)
  }

  if (user?.role !== 'ADMIN' && !(user as any)?.is_staff && !(user as any)?.is_superuser) {
    return <div className="panel"><p>Access denied. Only administrators can access this page.</p></div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>SuperAdmin Panel</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'companies' ? '' : 'secondary'}`}
          onClick={() => setActiveTab('companies')}
        >
          Companies ({companies.length})
        </button>
        <button
          className={`btn ${activeTab === 'users' ? '' : 'secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
      </div>

      {activeTab === 'companies' && (
        <div>
          {!showCompanyForm && !editingCompany && (
            <button className="btn" onClick={() => setShowCompanyForm(true)} style={{ marginBottom: 16 }}>
              Create Company
            </button>
          )}

          {showCompanyForm && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <h3>Create Company</h3>
              <form onSubmit={handleCreateCompany} className="form" style={{ flexDirection: 'column' }}>
                <input className="input" name="name" placeholder="Company Name *" required />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
                  <button className="btn secondary" type="button" onClick={() => setShowCompanyForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {editingCompany && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <h3>Edit Company</h3>
              <form onSubmit={handleUpdateCompany} className="form" style={{ flexDirection: 'column' }}>
                <input className="input" name="name" placeholder="Company Name *" required defaultValue={editingCompany.name} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update'}</button>
                  <button className="btn secondary" type="button" onClick={() => setEditingCompany(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="panel">
            <h3>All Companies</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Created By</th>
                  <th>Directors</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.created_by_name}</td>
                    <td>{c.directors_count}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => startEditCompany(c)}>Edit</button>
                        <button className="btn secondary" style={{ padding: '4px 8px', fontSize: 12, background: '#ff7a90' }} onClick={() => handleDeleteCompany(c.id!)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {!showUserForm && !editingUser && (
            <button className="btn" onClick={() => setShowUserForm(true)} style={{ marginBottom: 16 }}>
              Create User (Director)
            </button>
          )}

          {showUserForm && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <h3>Create User (Director)</h3>
              <form onSubmit={handleCreateUser} className="form" style={{ flexDirection: 'column' }}>
                <input
                  className="input"
                  placeholder="Username *"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email *"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password *"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Phone Number *"
                  required
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
                <select
                  className="select"
                  value={userForm.company_id}
                  onChange={(e) => setUserForm({ ...userForm, company_id: e.target.value })}
                  required
                >
                  <option value="">Select Company *</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
                  <button className="btn secondary" type="button" onClick={() => setShowUserForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {editingUser && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <h3>Edit User</h3>
              <form onSubmit={handleUpdateUser} className="form" style={{ flexDirection: 'column' }}>
                <input
                  className="input"
                  placeholder="Username *"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email *"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Phone Number *"
                  required
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update'}</button>
                  <button className="btn secondary" type="button" onClick={() => {
                    setEditingUser(null)
                    setUserForm({ username: '', email: '', password: '', phone: '', company_id: '' })
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="panel">
            <h3>All Users</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '-'}</td>
                    <td>
                      <span className={`chip ${u.role === 'ADMIN' ? 'company' : u.role === 'COMPANY' ? 'p1' : 'p2'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.company_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => startEditUser(u)}>Edit</button>
                        {u.id !== user?.id && (
                          <button className="btn secondary" style={{ padding: '4px 8px', fontSize: 12, background: '#ff7a90' }} onClick={() => handleDeleteUser(u.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <div style={{ color: '#ff7a90', marginTop: 12, padding: 12, background: '#2a1f2a', borderRadius: 8 }}>{error}</div>}
      {success && <div style={{ color: '#1fb978', marginTop: 12, padding: 12, background: '#1a2a1f', borderRadius: 8 }}>{success}</div>}
    </div>
  )
}
