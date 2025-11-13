import { FormEvent, useEffect, useState } from 'react'
import { Account, listSalaries, createSalary, listCompanies, listDirectors, Salary as SalaryType, Company, Director } from '../api'
import { getCurrentUserSync } from '../auth'

export default function Salary() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [directors, setDirectors] = useState<Director[]>([])
  const [salaries, setSalaries] = useState<SalaryType[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      loadSalaries()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (companies.length === 0) {
    return <div className="panel"><p>No companies found. Please contact your administrator.</p></div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Salary</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 500 }}>Company: {companies.find(c => c.id === selectedCompany)?.name}</p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <form onSubmit={onSubmit} className="form">
          <select className="select" value={form.director} onChange={(e) => setForm({ ...form, director: Number(e.target.value) })} required>
            <option value={0}>Select Director</option>
            {directors.map(d => (
              <option key={d.id} value={d.id}>{d.user.username}</option>
            ))}
          </select>
          <input className="input" placeholder="Amount" type="number" step="0.01" required value={form.amount}
                 onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input" placeholder="Description" value={form.description}
                 onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Salary'}</button>
        </form>
        {error && <div style={{ color: '#ff7a90', marginTop: 12 }}>{error}</div>}
      </div>

      <div className="panel">
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
            {salaries.map(s => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.director_name}</td>
                <td>₹ {Number(s.amount).toFixed(2)}</td>
                <td>{s.description}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

