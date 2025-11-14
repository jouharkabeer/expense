import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUserSync, logout } from '../auth'
import { useEffect, useState } from 'react'

export default function Nav() {
  const [user, setUser] = useState(getCurrentUserSync())
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setUser(getCurrentUserSync())
  }, [location])

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
            <button className="btn secondary" onClick={handleLogout} style={{ fontSize: '14px', padding: '10px 16px' }}>
              Logout
            </button>
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
