import { FormEvent, useEffect, useState } from 'react'
import { Account, createTransaction, listTransactions, Transaction, updateTransaction, deleteTransaction, approveTransaction, rejectTransaction, listCompanies, listProjects, getCompanyDirectors, Company, Project, Director } from '../api'
import { getCurrentUserSync } from '../auth'
import Modal from '../components/Modal'

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
  const [showModal, setShowModal] = useState(false)

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
      setShowModal(false)
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
      <h2>Expense</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 24, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--danger)' }}>
            Company: {companies.find(c => c.id === selectedCompany)?.name}
          </p>
        </div>
      )}

      <button className="btn" onClick={() => setShowModal(true)} style={{ marginBottom: 24 }}>
        Add Expense
      </button>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setError(null) }} title="Add Expense Entry">
        <form onSubmit={onSubmit} className="form">
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={form.is_project_related}
                   onChange={(e) => setForm({ ...form, is_project_related: e.target.checked, project: e.target.checked ? form.project : undefined })} 
                   style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Project Related</span>
          </label>
          {form.is_project_related && (
            <select className="select" value={form.project || ''} onChange={(e) => setForm({ ...form, project: Number(e.target.value) || undefined })}>
              <option value="">Select Project (or leave blank for non-project)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {error && <div className="message error">{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Add Expense'}
            </button>
            <button className="btn secondary" type="button" onClick={() => { setShowModal(false); setError(null) }} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <div className="panel">
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Expense Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No expense transactions yet
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td style={{ fontWeight: 600, color: 'var(--danger)' }}>₹ {Number(t.amount).toFixed(2)}</td>
                    <td>{t.description || '-'}</td>
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
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.status === 'PENDING' && !t.approvals?.find(a => a.approver === user?.id && a.approved) && (
                          <button className="btn secondary small" onClick={() => handleApprove(t.id!)}>Approve</button>
                        )}
                        {t.status === 'PENDING' && (
                          <button className="btn danger small" onClick={() => handleReject(t.id!)}>Reject</button>
                        )}
                      </div>
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
