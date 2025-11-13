import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getCurrentUserSync, logout } from '../auth'
import { useEffect, useState } from 'react'

export default function Nav() {
  const [user, setUser] = useState(getCurrentUserSync())
  const navigate = useNavigate()

  useEffect(() => {
    setUser(getCurrentUserSync())
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Lsofito innovations home">
          <img src="/image.png" alt="Lsofito innovations" className="brand-logo" />
        </Link>
        <nav className="nav">
          {user && (
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
              {(user.role === 'ADMIN' || (user as any)?.is_staff || (user as any)?.is_superuser) ? (
                <>
                  <NavLink to="/superadmin" className={({ isActive }) => isActive ? 'active' : ''}>SuperAdmin</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>Projects</NavLink>
                  <NavLink to="/income" className={({ isActive }) => isActive ? 'active' : ''}>Income</NavLink>
                  <NavLink to="/expense" className={({ isActive }) => isActive ? 'active' : ''}>Expense</NavLink>
                  <NavLink to="/salary" className={({ isActive }) => isActive ? 'active' : ''}>Salary</NavLink>
                </>
              )}
            </>
          )}
        </nav>
        {user && <button className="btn secondary" onClick={handleLogout}>Logout</button>}
      </div>
    </div>
  )
}
