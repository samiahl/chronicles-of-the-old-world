import { useState } from 'react'
import { api, setToken } from '../api/client'
import type { User } from '../types'

interface AuthResponse {
  token: string
  user: User
}

interface Props {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Enter username and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const res = await api.post<AuthResponse>(path, { username: username.trim(), password })
      setToken(res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      onLogin(res.user)
    } catch (err: unknown) {
      const status = err instanceof Error ? err.message : ''
      if (status.includes('409') || status.includes('Conflict')) {
        setError('Username already taken')
      } else if (status.includes('401') || status.includes('Unauthorized')) {
        setError('Invalid username or password')
      } else {
        setError(mode === 'login' ? 'Login failed' : 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="campaign-title">⚔ Chronicles of Blood and Glory ⚔</h1>
          <p className="campaign-subtitle">The Old World Campaign Manager</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username…"
              autoComplete="username"
              maxLength={30}
              required
            />
            {mode === 'register' && <p className="form-hint">1–30 characters</p>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password…"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Enter the Campaign' : 'Join the Chronicle'}
          </button>
        </form>
      </div>
    </div>
  )
}
