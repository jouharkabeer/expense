import { FormEvent, useEffect, useState } from 'react'
import { listProjects, createProject, updateProject, deleteProject, approveProject, rejectProject, listCompanies, Project, Company } from '../api'
import { getCurrentUserSync } from '../auth'

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
    return <div className="panel"><p>No companies found. Please contact your administrator.</p></div>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Projects</h2>
      
      {selectedCompany && companies.find(c => c.id === selectedCompany) && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 500 }}>Company: {companies.find(c => c.id === selectedCompany)?.name}</p>
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>{editingId ? 'Edit Project' : 'Create Project'}</h3>
          <form onSubmit={handleSubmit} className="form" style={{ flexDirection: 'column' }}>
            <input className="input" name="name" placeholder="Project Name" required />
            <input className="input" name="start_date" type="date" required />
            <input className="input" name="end_date" type="date" />
            <input className="input" name="project_value" type="number" step="0.01" placeholder="Project Value" required />
            <input className="input" name="received_amount" type="number" step="0.01" placeholder="Received Amount" defaultValue="0" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              <button className="btn secondary" type="button" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <button className="btn" onClick={() => setShowForm(true)} style={{ marginBottom: 16 }}>Create Project</button>
      )}

      {error && <div style={{ color: '#ff7a90', marginBottom: 16 }}>{error}</div>}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Value</th>
              <th>Received</th>
              <th>Status</th>
              <th>Approvals</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.start_date}</td>
                <td>{p.end_date || '-'}</td>
                <td>₹ {Number(p.project_value).toFixed(2)}</td>
                <td>₹ {Number(p.received_amount).toFixed(2)}</td>
                <td>
                  <span className={`chip ${p.status === 'APPROVED' ? 'company' : p.status === 'REJECTED' ? 'p2' : 'p1'}`}>
                    {p.status}
                  </span>
                </td>
                <td>{p.approvals.filter(a => a.approved).length} / {p.approvals.length}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.status === 'PENDING' && !p.approvals.find(a => a.approver === user?.id && a.approved) && (
                      <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleApprove(p.id)}>Approve</button>
                    )}
                    {p.status === 'PENDING' && (
                      <button className="btn danger" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleReject(p.id)}>Reject</button>
                    )}
                    {p.status === 'PENDING' && (
                      <button className="btn secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => startEdit(p)}>Edit</button>
                    )}
                    {p.status === 'PENDING' && (
                      <button className="btn danger" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => handleDelete(p.id)}>Delete</button>
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

