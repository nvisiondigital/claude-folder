'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/app/kanban')
    } else {
      setError('Ongeldig wachtwoord. Probeer opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ghs-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ghs-green to-ghs-teal shadow-[0_0_24px_rgba(114,217,70,0.3)] mb-4" />
          <h1 className="text-lg font-bold text-white">Greenhouse Solutions</h1>
          <p className="text-xs text-ghs-muted mt-1">Florian — Operationeel dashboard</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-ghs-surface border border-ghs-border rounded-2xl p-8 shadow-[0_0_60px_rgba(114,217,70,0.05)]"
        >
          <div className="h-0.5 bg-gradient-to-r from-ghs-teal via-ghs-green to-ghs-teal opacity-60 -mx-8 -mt-8 mb-8 rounded-t-2xl" />

          <label htmlFor="password" className="block text-xs uppercase tracking-widest text-ghs-dim mb-2">
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-ghs-text placeholder-white/20 outline-none focus:border-ghs-green/50 mb-4"
            placeholder="••••••••"
            autoFocus
          />

          {error && (
            <p className="text-xs text-red-400 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-3 text-sm shadow-[0_0_16px_rgba(114,217,70,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
