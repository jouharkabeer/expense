import { FormEvent, useEffect, useState } from 'react'
import { listProjects, createProject, updateProject, deleteProject, approveProject, rejectProject, listCompanies, Project, Company } from '../api'
import { getCurrentUserSync } from '../auth'
import Modal from '../components/Modal'

export default function Projects() {
  const [user] = useState(getCurrentUserSync())
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      loadProjects()
    }
  }, [selectedCompany])

  async function loadCompanies() {
    try {
      const comps = await listCompanies()
      setCompanies(comps)
      // Auto-select the first (and only) company for directors
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
      setProjects(projs)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const form = e.currentTarget
      const data = {
        company: selectedCompany!,
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        start_date: (form.elements.namedItem('start_date') as HTMLInputElement).value,
        end_date: (form.elements.namedItem('end_date') as HTMLInputElement).value || undefined,
        project_value: (form.elements.namedItem('project_value') as HTMLInputElement).value,
        received_amount: (form.elements.namedItem('received_amount') as HTMLInputElement).value || '0',
      }
      if (editingId) {
        await updateProject(editingId, data)
      } else {
        await createProject(data)
      }
      setShowForm(false)
      setEditingId(null)
      setError(null)
      loadProjects()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: number) {
    try {
      await approveProject(id)
      loadProjects()
    } catch (e: any) {
      setError((e as Error).message)
    }
  }

  async function handleReject(id: number) {
    try {
      await rejectProject(id)
      loadProjects()
    } catch (e: any) {
      setError((e as Error).message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this project? This requires approval from all members.')) return
    try {
      await deleteProject(id)
      loadProjects()
    } catch (e: any) {
      setError((e as Error).message)
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id)
    setShowForm(true)
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
      <h2>Projects</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 24, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--info)' }}>
            Company: {companies.find(c => c.id === selectedCompany)?.name}
          </p>
        </div>
      )}

      <button className="btn" onClick={() => { setShowForm(true); setEditingId(null) }} style={{ marginBottom: 24 }}>
        Create Project
      </button>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingId(null); setError(null) }} title={editingId ? 'Edit Project' : 'Create Project'}>
        <form onSubmit={handleSubmit} className="form">
          <input className="input" name="name" placeholder="Project Name" required defaultValue={editingId ? projects.find(p => p.id === editingId)?.name : ''} />
            <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Start Date *</label>
            <input className="input" name="start_date" type="date" required defaultValue={editingId ? projects.find(p => p.id === editingId)?.start_date : ''} />
            <label style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>End Date</label>
            <input className="input" name="end_date" type="date" defaultValue={editingId ? projects.find(p => p.id === editingId)?.end_date || '' : ''} />
          <input className="input" name="project_value" type="number" step="0.01" placeholder="Project Value (₹)" required defaultValue={editingId ? projects.find(p => p.id === editingId)?.project_value : ''} />
          <input className="input" name="received_amount" type="number" step="0.01" placeholder="Received Amount (₹)" defaultValue={editingId ? projects.find(p => p.id === editingId)?.received_amount : '0'} />
          {error && <div className="message error">{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? 'Saving...' : 'Save'}</button>
            <button className="btn secondary" type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null) }} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="panel">
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>All Projects</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Value</th>
              <th>Received</th>
              <th>Profit</th>
              <th>Status</th>
              <th>Approvals</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No projects yet
                </td>
              </tr>
            ) : (
              projects.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.start_date}</td>
                  <td>{p.end_date || '-'}</td>
                  <td style={{ fontWeight: 600 }}>₹ {Number(p.project_value).toFixed(2)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹ {Number(p.received_amount).toFixed(2)}</td>
                  <td style={{ fontWeight: 600, color: (p.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹ {(p.profit || 0).toFixed(2)}
                  </td>
                  <td>
                    <span className={`chip ${p.status === 'APPROVED' ? 'company' : p.status === 'REJECTED' ? 'p2' : 'p1'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.approvals.filter(a => a.approved).length} / {p.approvals.length}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.status === 'PENDING' && !p.approvals.find(a => a.approver === user?.id && a.approved) && (
                        <button className="btn secondary small" onClick={() => handleApprove(p.id)}>Approve</button>
                      )}
                      {p.status === 'PENDING' && (
                        <button className="btn danger small" onClick={() => handleReject(p.id)}>Reject</button>
                      )}
                      {p.status === 'PENDING' && (
                        <button className="btn secondary small" onClick={() => startEdit(p)}>Edit</button>
                      )}
                      {p.status === 'PENDING' && (
                        <button className="btn danger small" onClick={() => handleDelete(p.id)}>Delete</button>
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

