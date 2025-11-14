import { useEffect, useState, FormEvent } from 'react'
import { listCompanies, Company, listMilestones, createMilestone, updateMilestone, deleteMilestone, Milestone } from '../api'
import { getCurrentUserSync } from '../auth'
import Modal from '../components/Modal'

export default function Milestones() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [milestoneForm, setMilestoneForm] = useState({ target_amount: '', label: '' })

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadMilestones()
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

  async function loadMilestones() {
    if (!selectedCompany) return
    setLoadingMilestones(true)
    try {
      const ms = await listMilestones(selectedCompany)
      setMilestones(ms)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingMilestones(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    setLoading(true)
    setError(null)
    try {
      if (editingMilestone?.id) {
        await updateMilestone(editingMilestone.id, {
          target_amount: Number(milestoneForm.target_amount),
          label: milestoneForm.label,
        })
      } else {
        await createMilestone({
          company: selectedCompany,
          target_amount: Number(milestoneForm.target_amount),
          label: milestoneForm.label,
        })
      }
      setShowModal(false)
      setEditingMilestone(null)
      setMilestoneForm({ target_amount: '', label: '' })
      loadMilestones()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(milestone: Milestone) {
    setEditingMilestone(milestone)
    setMilestoneForm({
      target_amount: milestone.target_amount.toString(),
      label: milestone.label,
    })
    setShowModal(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this milestone?')) return
    try {
      await deleteMilestone(id)
      loadMilestones()
    } catch (e: any) {
      setError(e.message)
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
      <h2>Milestones</h2>

      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 24, background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary-light)' }}>
            Company: {companies.find(c => c.id === selectedCompany)?.name}
          </p>
        </div>
      )}

      <button className="btn" onClick={() => { setShowModal(true); setEditingMilestone(null); setMilestoneForm({ target_amount: '', label: '' }) }} style={{ marginBottom: 24 }}>
        Add Milestone
      </button>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingMilestone(null); setError(null) }} title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}>
        <form onSubmit={handleSubmit} className="form">
          <input 
            className="input" 
            placeholder="Milestone Label (e.g., 1 Lakh)" 
            required 
            value={milestoneForm.label}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, label: e.target.value })}
          />
          <input 
            className="input" 
            placeholder="Target Amount (₹)" 
            type="number" 
            step="0.01" 
            required 
            value={milestoneForm.target_amount}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, target_amount: e.target.value })}
          />
          {error && <div className="message error">{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : editingMilestone ? 'Update' : 'Create'}
            </button>
            <button className="btn secondary" type="button" onClick={() => { setShowModal(false); setEditingMilestone(null); setError(null) }} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {error && <div className="message error" style={{ marginBottom: 24 }}>{error}</div>}

      <div className="panel">
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>All Milestones</h3>
        {loadingMilestones ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div className="loader"></div>
            <p style={{ marginTop: 16 }}>Loading milestones...</p>
          </div>
        ) : milestones.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            No milestones yet. Create your first milestone!
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {milestones.map((m) => (
              <div key={m.id} className="progress-container" style={{ 
                background: m.achieved ? 'rgba(16, 185, 129, 0.1)' : 'var(--gradient-surface)',
                borderColor: m.achieved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'
              }}>
                <div className="progress-header" style={{ marginBottom: 12 }}>
                  <div className="progress-label" style={{ fontSize: 18 }}>{m.label}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {m.achieved ? (
                      <div className="progress-achieved">
                        {m.days_taken !== undefined ? `Completed in ${m.days_taken} days` : 'Completed'}
                      </div>
                    ) : (
                      <div className="progress-value">
                        {m.progress !== undefined ? `${m.progress.toFixed(1)}%` : '0%'}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!m.achieved && (
                        <button className="btn secondary small" onClick={() => startEdit(m)}>Edit</button>
                      )}
                      <button className="btn danger small" onClick={() => handleDelete(m.id!)}>Delete</button>
                    </div>
                  </div>
                </div>
                <div className="progress-bar-wrapper">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: m.achieved ? '100%' : `${m.progress || 0}%`,
                      background: m.achieved ? 'var(--gradient-success)' : 'var(--gradient-primary)'
                    }}
                  />
                </div>
                <div className="progress-info">
                  <span>Target: ₹{m.target_amount.toLocaleString()}</span>
                  {m.achieved ? (
                    m.achieved_at && (
                      <span>Achieved: {new Date(m.achieved_at).toLocaleDateString()}</span>
                    )
                  ) : (
                    m.progress !== undefined && (
                      <span>Remaining: ₹{(m.target_amount - (m.target_amount * m.progress / 100)).toLocaleString()}</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

