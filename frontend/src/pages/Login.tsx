import { FormEvent, useState } from 'react'
import { login as apiLogin, register } from '../api'
import { setStoredUser } from '../auth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isRegister) {
        if (password !== passwordConfirm) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        const { user } = await register({ username, email, password, password_confirm: passwordConfirm })
        setStoredUser(user)
        navigate('/')
      } else {
        const { user } = await apiLogin(username, password)
        setStoredUser(user)
        navigate('/')
      }
    } catch (e: any) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="panel">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>{isRegister ? 'Register' : 'Login'}</h2>
        <p style={{ color: '#9aa4b2', marginTop: 0 }}>
          {isRegister ? 'Create a new account' : 'Enter your credentials to continue.'}
        </p>
        <form onSubmit={onSubmit} className="form" style={{ flexDirection: 'column' }}>
          {isRegister && (
            <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <input className="input" type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {isRegister && (
            <input className="input" type="password" placeholder="Confirm Password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        {/* <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
            }}
            style={{ background: 'transparent', border: 'none', color: '#9aa4b2', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div> */}
        {error && <div style={{ color: '#ff7a90', marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  )
}
