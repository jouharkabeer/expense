import { useEffect, useState } from 'react'
import { getSummary, Summary, listCompanies, Company, getAdminDashboard } from '../api'
import { getCurrentUserSync } from '../auth'
import Card from '../components/Card'

export default function Dashboard() {
  const [user] = useState(getCurrentUserSync())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [adminStats, setAdminStats] = useState<{ company_count: number; director_count: number } | null>(null)

  const isAdmin = user?.role === 'ADMIN' || (user as any)?.is_staff || (user as any)?.is_superuser

  useEffect(() => {
    if (isAdmin) {
      loadAdminDashboard()
    } else {
      loadCompanies()
    }
  }, [])

  useEffect(() => {
    if (!isAdmin && selectedCompany) {
      loadSummary()
    }
  }, [selectedCompany])

  async function loadAdminDashboard() {
    try {
      const stats = await getAdminDashboard()
      setAdminStats(stats)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadCompanies() {
    setLoadingCompanies(true)
    try {
      const comps = await listCompanies()
      setCompanies(comps)
      if (comps.length > 0) {
        setSelectedCompany(comps[0].id)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingCompanies(false)
    }
  }

  async function loadSummary() {
    if (!selectedCompany) return
    setSummary(null)
    try {
      const summ = await getSummary(selectedCompany)
      setSummary(summ)
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (error) return <div className="message error">{error}</div>

  // Admin Dashboard
  if (isAdmin) {
    if (!adminStats) return (
      <div className="loading">
        <div className="loader"></div>
        <p style={{ marginTop: 16 }}>Loading dashboard...</p>
      </div>
    )
    
    return (
      <div className="fade-in">
        <h2>SuperAdmin Dashboard</h2>
        <div className="cards">
          <Card label="Total Companies" value={adminStats.company_count.toString()} />
          <Card label="Total Directors" value={adminStats.director_count.toString()} />
        </div>
      </div>
    )
  }

  // Director Dashboard
  if (loadingCompanies) {
    return (
      <div className="loading">
        <div className="loader"></div>
        <p style={{ marginTop: 16 }}>Loading companies...</p>
      </div>
    )
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

  if (!summary) return (
    <div className="loading">
      <div className="loader"></div>
      <p style={{ marginTop: 16 }}>Loading summary...</p>
    </div>
  )

  return (
    <div className="fade-in">
      <h2>Dashboard</h2>

      <div className="cards" style={{ marginBottom: 32 }}>
        <Card label="Total Balance" value={summary.total_balance} />
        <Card label="Total Income" value={summary.income_total} />
        <Card label="Total Expense" value={summary.expense_total} />
      </div>
      
      <h3>Account Balances</h3>
      <div className="cards" style={{ marginBottom: 32 }}>
        {summary.director_balances && summary.director_balances.length > 0 ? (
          summary.director_balances.map((dir) => (
            <Card key={dir.director_id} label={dir.director_name} value={dir.balance} />
          ))
        ) : (
          <>
            <Card label="Jouhar" value={summary.partner1_balance} />
            <Card label="Aleena" value={summary.partner2_balance} />
          </>
        )}
        <Card label="Company Account" value={summary.company_balance} />
      </div>

      {summary.milestones && summary.milestones.filter(m => !m.achieved).length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Recent Milestones</h3>
          </div>
          <div style={{ marginBottom: 24 }}>
            {summary.milestones
              .filter(m => !m.achieved)
              .slice(0, 3)
              .map((m, idx) => (
                <div key={m.id || idx} className="progress-container">
                  <div className="progress-header">
                    <div className="progress-label">{m.label}</div>
                    <div className="progress-value">
                      {m.progress !== undefined ? `${m.progress.toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${m.progress || 0}%`,
                        background: 'var(--gradient-primary)'
                      }}
                    />
                  </div>
                  <div className="progress-info">
                    <span>Target: ₹{m.target.toLocaleString()}</span>
                    {m.progress !== undefined && (
                      <span>Remaining: ₹{(m.target - (m.target * m.progress / 100)).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
