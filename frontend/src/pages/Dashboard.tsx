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

  if (error) return <div style={{ color: 'red', padding: 16 }}>{error}</div>

  // Admin Dashboard
  if (isAdmin) {
    if (!adminStats) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
    
    return (
      <div>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>SuperAdmin Dashboard</h2>
        <div className="cards">
          <Card label="Total Companies" value={adminStats.company_count.toString()} />
          <Card label="Total Directors" value={adminStats.director_count.toString()} />
        </div>
      </div>
    )
  }

  // Director Dashboard
  if (loadingCompanies) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }
  
  if (companies.length === 0) {
    return <div className="panel"><p>No companies found. Please contact your administrator.</p></div>
  }

  if (!summary) return <div style={{ padding: 40, textAlign: 'center' }}>Loading summary...</div>

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Dashboard</h2>

      <div className="cards" style={{ marginBottom: 16 }}>
        <Card label="Total Balance" value={summary.total_balance} />
        <Card label="Income" value={summary.income_total} />
        <Card label="Expense" value={summary.expense_total} />
      </div>
      
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Account Balance</h3>
      <div className="cards" style={{ marginBottom: 16 }}>
        {summary.director_balances && summary.director_balances.length > 0 ? (
          summary.director_balances.map((dir, idx) => (
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

      {summary.milestones && summary.milestones.length > 0 && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Milestones</h3>
          <div className="cards">
            {summary.milestones.map((m, idx) => (
              <div key={idx} className="card">
                <div className="label">{m.label}</div>
                {m.achieved ? (
                  <div>
                    <div className="value" style={{ color: '#1fb978' }}>✓ Achieved</div>
                    {m.days_taken !== undefined && (
                      <div style={{ fontSize: 14, color: '#9aa4b2', marginTop: 4 }}>
                        Time taken: {m.days_taken} days
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="value">₹ {m.target.toLocaleString()}</div>
                    {m.progress !== undefined && (
                      <div style={{ fontSize: 14, color: '#9aa4b2', marginTop: 4 }}>
                        Progress: {m.progress.toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
