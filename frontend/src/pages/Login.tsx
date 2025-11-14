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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
        animation: 'rotate 20s linear infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-50%',
        right: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
        animation: 'rotate 25s linear infinite reverse'
      }} />
      
      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="panel" style={{ 
        maxWidth: 420, 
        width: '100%',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        background: 'rgba(30, 41, 59, 0.8)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/image.png" alt="Logo" style={{ height: 60, marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(99, 102, 241, 0.3))' }} />
          <h2 style={{ marginBottom: 8, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {isRegister ? 'Sign up to get started' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="form">
          {isRegister && (
            <input 
              className="input" 
              type="email" 
              placeholder="Email address" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          )}
          <input 
            className="input" 
            type="text" 
            placeholder="Username" 
            required 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            className="input" 
            type="password" 
            placeholder="Password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          {isRegister && (
            <input 
              className="input" 
              type="password" 
              placeholder="Confirm Password" 
              required 
              value={passwordConfirm} 
              onChange={(e) => setPasswordConfirm(e.target.value)} 
            />
          )}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
              setEmail('')
              setPassword('')
              setPasswordConfirm('')
              setUsername('')
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'underline',
              padding: 8
            }}
          >
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div> */}

        {error && (
          <div className="message error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
