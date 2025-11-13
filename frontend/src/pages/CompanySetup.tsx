import { FormEvent, useEffect, useState } from 'react'
import { listCompanies, createCompany, listDirectors, addDirector, getCurrentUser, User, Company, Director } from '../api'
import { getCurrentUserSync } from '../auth'

export default function CompanySetup() {
  const [user, setUser] = useState<User | null>(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [directors, setDirectors] = useState<Director[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [showDirectorForm, setShowDirectorForm] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      const comps = await listCompanies()
      setCompanies(comps)
      if (comps.length > 0) {
        setSelectedCompany(comps[0].id)
        loadDirectors(comps[0].id)
      } else {
        setError(`No companies found. Your role: ${currentUser.role}. Companies are only visible if you created them, are a director, or have ADMIN role.`)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load companies')
    }
  }

  async function loadDirectors(companyId: number) {
    try {
      const dirs = await listDirectors(companyId)
      setDirectors(dirs)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleCreateCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const form = e.currentTarget
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        partner1_name: (form.elements.namedItem('partner1_name') as HTMLInputElement).value || 'Jouhar',
        partner2_name: (form.elements.namedItem('partner2_name') as HTMLInputElement).value || 'Aleena',
      }
      const company = await createCompany(data)
      setCompanies([...companies, company])
      setSelectedCompany(company.id)
      setShowCompanyForm(false)
      await loadDirectors(company.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'COMPANY') {
    return <div>Only admins and company owners can manage companies</div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Company Setup</h2>
      
      {!showCompanyForm && companies.length === 0 && (
        <div className="panel">
          <p>No companies found. Create your first company.</p>
          <button className="btn" onClick={() => setShowCompanyForm(true)}>Create Company</button>
        </div>
      )}

      {showCompanyForm && (
        <div className="panel">
          <h3>Create Company</h3>
          <form onSubmit={handleCreateCompany} className="form" style={{ flexDirection: 'column' }}>
            <input className="input" name="name" placeholder="Company Name" required />
            <input className="input" name="partner1_name" placeholder="Partner 1 Name (default: Jouhar)" />
            <input className="input" name="partner2_name" placeholder="Partner 2 Name (default: Aleena)" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
              <button className="btn secondary" type="button" onClick={() => setShowCompanyForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {companies.length > 0 && (
        <div className="panel">
          <h3>Your Companies</h3>
          <select className="select" value={selectedCompany || ''} onChange={(e) => {
            const id = Number(e.target.value)
            setSelectedCompany(id)
            loadDirectors(id)
          }}>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          {selectedCompany && (
            <div style={{ marginTop: 16 }}>
              <h4>Directors</h4>
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Added At</th>
                  </tr>
                </thead>
                <tbody>
                  {directors.map(d => (
                    <tr key={d.id}>
                      <td>{d.user.username}</td>
                      <td>{d.user.email}</td>
                      <td>{new Date(d.added_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ color: '#9aa4b2', fontSize: 14, marginTop: 8 }}>
                To add a director, they must first register an account, then you can add them here using their user ID.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <div style={{ color: '#ff7a90', marginTop: 12 }}>{error}</div>}
    </div>
  )
}

