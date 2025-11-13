import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthed } from '../auth'

export default function AuthGate({ children }: { children: JSX.Element }) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    isAuthed().then((auth) => {
      setAuthenticated(auth)
      setChecking(false)
    })
  }, [])

  if (checking) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!authenticated) return <Navigate to="/login" replace />
  return children
}

