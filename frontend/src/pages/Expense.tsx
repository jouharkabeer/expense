import { FormEvent, useEffect, useState } from 'react'
import { Account, createTransaction, listTransactions, Transaction, updateTransaction, deleteTransaction, approveTransaction, rejectTransaction, listCompanies, listProjects, getCompanyDirectors, Company, Project, Director } from '../api'
import { getCurrentUserSync } from '../auth'

export default function Expense() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [directors, setDirectors] = useState<Director[]>([])
  const [items, setItems] = useState<Transaction[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [form, setForm] = useState<Pick<Transaction, 'amount' | 'description' | 'date' | 'account' | 'project' | 'is_project_related'>>({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    account: 'COMPANY',
    project: undefined,
    is_project_related: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadProjects()
      loadDirectors()
      load()
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

  async function loadProjects() {
    if (!selectedCompany) return
    try {
      const projs = await listProjects(selectedCompany)
      setProjects(projs.filter(p => p.status === 'APPROVED'))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadDirectors() {
    if (!selectedCompany) return
    try {
      const dirs = await getCompanyDirectors(selectedCompany)
      setDirectors(dirs)
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

  function load() {
    if (!selectedCompany) return
    listTransactions(selectedCompany, 'EXPENSE').then(setItems).catch((e) => setError((e as Error).message))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCompany) {
      setError('Please select a company')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createTransaction({
        company: selectedCompany,
        transaction_type: 'EXPENSE',
        amount: form.amount,
        description: form.description,
        date: form.date,
        account: form.account as Account,
        project: form.is_project_related && form.project ? form.project : undefined,
        is_project_related: form.is_project_related,
      } as Transaction)
      setForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10), account: 'COMPANY', project: undefined, is_project_related: false })
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: number) {
    try {
      await approveTransaction(id)
      load()
    } catch (e: any) {
      setError((e as Error).message)
    }
  }

  async function handleReject(id: number) {
    try {
      await rejectTransaction(id)
      load()
    } catch (e: any) {
      setError((e as Error).message)
    }
  }

  if (companies.length === 0) {
    return <div className="panel"><p>No companies found. Please contact your administrator.</p></div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Expense</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 500 }}>Company: {companies.find(c => c.id === selectedCompany)?.name}</p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <form onSubmit={onSubmit} className="form" style={{ flexDirection: 'column' }}>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={form.is_project_related}
                   onChange={(e) => setForm({ ...form, is_project_related: e.target.checked, project: e.target.checked ? form.project : undefined })} />
            <span>Project Related</span>
          </label>
          {form.is_project_related && (
            <select className="select" value={form.project || ''} onChange={(e) => setForm({ ...form, project: Number(e.target.value) || undefined })}>
              <option value="">Select Project (or leave blank for non-project)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Expense'}</button>
        </form>
        {error && <div style={{ color: '#ff7a90', marginTop: 12 }}>{error}</div>}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Account</th>
              <th>Project</th>
              <th>Status</th>
              <th>Approvals</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>₹ {Number(t.amount).toFixed(2)}</td>
                <td>{t.description}</td>
                <td>
                  <span className={`chip ${t.account === 'PARTNER1' ? 'p1' : t.account === 'PARTNER2' ? 'p2' : 'company'}`}>
                    {getAccountLabel(t.account)}
                  </span>
                </td>
                <td>{t.project_name || '-'}</td>
                <td>
                  <span className={`chip ${t.status === 'APPROVED' ? 'company' : t.status === 'REJECTED' ? 'p2' : 'p1'}`}>
                    {t.status}
                  </span>
                </td>
                <td>{t.approvals?.filter(a => a.approved).length || 0} / {t.approvals?.length || 0}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.status === 'PENDING' && !t.approvals?.find(a => a.approver === user?.id && a.approved) && (
                      <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleApprove(t.id!)}>Approve</button>
                    )}
                    {t.status === 'PENDING' && (
                      <button className="btn danger" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleReject(t.id!)}>Reject</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
