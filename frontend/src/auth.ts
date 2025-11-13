import { getCurrentUser, User, refreshAccessToken } from './api'

const KEY = 'user'

function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function getStoredUser(): User | null {
  const stored = localStorage.getItem(KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem(KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(KEY)
  }
}

export async function isAuthed(): Promise<boolean> {
  const user = getStoredUser()
  const token = getAccessToken()
  if (!user || !token) return false
  try {
    const current = await getCurrentUser()
    setStoredUser(current)
    return true
  } catch {
    // Try to refresh token
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      try {
        const current = await getCurrentUser()
        setStoredUser(current)
        return true
      } catch {
        setStoredUser(null)
        return false
      }
    }
    setStoredUser(null)
    return false
  }
}

export function getCurrentUserSync(): User | null {
  return getStoredUser()
}

export async function logout(): Promise<void> {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  setStoredUser(null)
}
