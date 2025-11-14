import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUserSync, logout } from '../auth'
import { useEffect, useState } from 'react'
import { getPendingApprovalsCount } from '../api'

export default function Nav() {
  const [user, setUser] = useState(getCurrentUserSync())
  const [pendingCount, setPendingCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setUser(getCurrentUserSync())
  }, [location])

  useEffect(() => {
    if (user) {
      loadPendingCount()
      // Refresh pending count every 30 seconds
      const interval = setInterval(loadPendingCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user, location])

  async function loadPendingCount() {
    try {
      const data = await getPendingApprovalsCount()
      setPendingCount(data.count)
    } catch (e) {
      // Silently fail - don't show error for notification count
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isAdmin = user && (user.role === 'ADMIN' || (user as any)?.is_staff || (user as any)?.is_superuser)

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Lsofito innovations home">
            <img src="/image.png" alt="Lsofito innovations" className="brand-logo" />
          </Link>
          {user && (
            <button 
              className="btn-logout-mobile" 
              onClick={handleLogout} 
              aria-label="Logout"
              title="Logout"
            >
              <span className="logout-icon">🚪</span>
            </button>
          )}
          <nav className="nav">
            {user && (
              <>
                <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                  <span>Dashboard</span>
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/superadmin" className={({ isActive }) => isActive ? 'active' : ''}>
                    <span>SuperAdmin</span>
                  </NavLink>
                ) : (
                  <>
                    <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span>Projects</span>
                    </NavLink>
                    <NavLink to="/milestones" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span>Milestones</span>
                    </NavLink>
                    <NavLink to="/income" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span>Income</span>
                    </NavLink>
                    <NavLink to="/expense" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span>Expense</span>
                    </NavLink>
                    <NavLink to="/salary" className={({ isActive }) => isActive ? 'active' : ''}>
                      <span>Salary</span>
                    </NavLink>
                  </>
                )}
              </>
            )}
          </nav>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                className="btn secondary" 
                onClick={() => navigate('/')}
                style={{ 
                  fontSize: '14px', 
                  padding: '10px 16px',
                  position: 'relative'
                }}
                title={pendingCount > 0 ? `${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}` : 'No pending approvals'}
              >
                🔔
                {pendingCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--danger)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
              <button className="btn secondary" onClick={handleLogout} style={{ fontSize: '14px', padding: '10px 16px' }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <div className="bottom-nav">
          <div className="bottom-nav-items">
            <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <span className="bottom-nav-icon">📊</span>
              <span>Dashboard</span>
            </NavLink>
            {isAdmin ? (
              <NavLink to="/superadmin" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <span className="bottom-nav-icon">⚙️</span>
                <span>Admin</span>
              </NavLink>
            ) : (
              <>
                <NavLink to="/projects" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">📁</span>
                  <span>Projects</span>
                </NavLink>
                <NavLink to="/milestones" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">🎯</span>
                  <span>Milestones</span>
                </NavLink>
                <NavLink to="/income" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">💰</span>
                  <span>Income</span>
                </NavLink>
                <NavLink to="/expense" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">💸</span>
                  <span>Expense</span>
                </NavLink>
                <NavLink to="/salary" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                  <span className="bottom-nav-icon">💵</span>
                  <span>Salary</span>
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
