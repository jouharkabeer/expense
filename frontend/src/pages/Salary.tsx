import { FormEvent, useEffect, useState } from 'react'
import { Account, listSalaries, createSalary, listCompanies, listDirectors, Salary as SalaryType, Company, Director } from '../api'
import { getCurrentUserSync } from '../auth'
import Modal from '../components/Modal'

export default function Salary() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [directors, setDirectors] = useState<Director[]>([])
  const [salaries, setSalaries] = useState<SalaryType[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Pick<SalaryType, 'amount' | 'description' | 'date' | 'account' | 'director'>>({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    account: 'COMPANY',
    director: 0,
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadDirectors()
      loadSalaries()
    }
  }, [selectedCompany])

  async function loadCompanies() {
    try {
      const comps = await listCompanies()
      setCompanies(comps)
      if (comps.length > 0) {
        setSelectedCompany(comps[0].id)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadDirectors() {
    if (!selectedCompany) return
    try {
      const dirs = await listDirectors(selectedCompany)
      setDirectors(dirs)
      if (dirs.length > 0 && !form.director) {
        setForm(prev => ({ ...prev, director: dirs[0].id }))
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  function getAccountLabel(account: Account): string {
    if (account === 'COMPANY') {
      const company = companies.find(c => c.id === selectedCompany)
      return company?.name || 'Company Account'
    } else if (account === 'PARTNER1' && directors.length > 0) {
      return directors[0].user.username
    } else if (account === 'PARTNER2' && directors.length > 1) {
      return directors[1].user.username
    }
    return account === 'PARTNER1' ? 'Jouhar' : account === 'PARTNER2' ? 'Aleena' : 'Company Account'
  }

  async function loadSalaries() {
    if (!selectedCompany) return
    try {
      const sals = await listSalaries(selectedCompany)
      setSalaries(sals)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCompany || !form.director) {
      setError('Please select company and director')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createSalary({
        ...form,
        company: selectedCompany,
      } as SalaryType)
      setForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10), account: 'COMPANY', director: directors[0]?.id || 0 })
      setShowModal(false)
      loadSalaries()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (companies.length === 0) {
    return (
      <div className="panel">
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          No companies found. Please contact your administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <h2>Salary</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 24, background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--secondary)' }}>
            Company: {companies.find(c => c.id === selectedCompany)?.name}
          </p>
        </div>
      )}

      <button className="btn" onClick={() => setShowModal(true)} style={{ marginBottom: 24 }}>
        Add Salary
      </button>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setError(null) }} title="Add Salary Entry">
        <form onSubmit={onSubmit} className="form">
          <select className="select" value={form.director} onChange={(e) => setForm({ ...form, director: Number(e.target.value) })} required>
            <option value={0}>Select Director</option>
            {directors.map(d => (
              <option key={d.id} value={d.id}>{d.user.username}</option>
            ))}
          </select>
          <input className="input" placeholder="Amount (₹)" type="number" step="0.01" required value={form.amount}
                 onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input" placeholder="Description" value={form.description}
                 onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Date *</label>
          <input className="input" type="date" required value={form.date}
                 onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className="select" required value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value as Account })}>
            <option value="COMPANY">{companies.find(c => c.id === selectedCompany)?.name || 'Company Account'}</option>
            {directors.map((dir, idx) => (
              <option key={dir.id} value={idx === 0 ? 'PARTNER1' : idx === 1 ? 'PARTNER2' : 'COMPANY'}>
                {dir.user.username}
              </option>
            ))}
          </select>
          {error && <div className="message error">{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Add Salary'}
            </button>
            <button className="btn secondary" type="button" onClick={() => { setShowModal(false); setError(null) }} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="panel">
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Salary Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Director</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Account</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No salary transactions yet
                  </td>
                </tr>
              ) : (
                salaries.map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td style={{ fontWeight: 600 }}>{s.director_name}</td>
                    <td style={{ fontWeight: 600, color: 'var(--warning)' }}>₹ {Number(s.amount).toFixed(2)}</td>
                    <td>{s.description || '-'}</td>
                    <td>
                      <span className={`chip ${s.account === 'PARTNER1' ? 'p1' : s.account === 'PARTNER2' ? 'p2' : 'company'}`}>
                        {getAccountLabel(s.account)}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${s.status === 'APPROVED' ? 'company' : s.status === 'REJECTED' ? 'p2' : 'p1'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

