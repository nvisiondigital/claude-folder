'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SurveyInfo = { id: string; isDraft: boolean; deliveredAt: string | null } | null

type ContractorProject = {
  id: string
  clientName: string
  city: string
  street: string
  postalCode: string
  survey: SurveyInfo
}

function statusLabel(survey: SurveyInfo): string {
  if (!survey)              return 'Opmeting nog te doen'
  if (survey.isDraft)       return 'Concept'
  if (survey.deliveredAt)   return 'Ingediend ✓'
  return 'Klaar om in te dienen'
}

function statusColor(survey: SurveyInfo): string {
  if (!survey)              return 'text-white/30'
  if (survey.isDraft)       return 'text-amber-400'
  if (survey.deliveredAt)   return 'text-ghs-green/80'
  return 'text-blue-400'
}

export default function ContractorPageClient() {
  const [projects, setProjects] = useState<ContractorProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contractor/projects')
      .then(r => { if (!r.ok) throw new Error('Laden mislukt'); return r.json() })
      .then(setProjects)
      .catch(() => setError('Kon projecten niet laden.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDeliver(projectId: string) {
    const res = await fetch(`/api/surveys/${projectId}/deliver`, { method: 'POST' })
    if (res.ok) {
      setProjects(prev => prev.map(p =>
        p.id === projectId && p.survey
          ? { ...p, survey: { ...p.survey, deliveredAt: new Date().toISOString() } }
          : p
      ))
    }
  }

  async function handleLogout() {
    await fetch('/api/contractor/auth/logout', { method: 'POST' })
    window.location.href = '/contractor/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ghs-bg flex items-center justify-center text-ghs-muted text-sm">
        Projecten laden...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ghs-bg flex flex-col">
      {/* Top bar */}
      <header className="bg-ghs-surface border-b border-white/[0.05] px-5 py-3.5 flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ghs-green to-ghs-teal shrink-0" />
        <span className="text-sm font-bold text-white">Greenhouse Solutions</span>
        <span className="text-[11px] text-white/30">— Aannemer portaal</span>
        <button
          type="button"
          onClick={handleLogout}
          className="ml-auto text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          Uitloggen
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 max-w-2xl mx-auto w-full">
        <h2 className="text-xs uppercase tracking-widest text-white/25 mb-4">
          Mijn opdrachten — CAT 2
        </h2>

        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-ghs-surface border border-white/[0.06] rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{project.clientName}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{project.street}, {project.postalCode} {project.city}</p>
                <p className={`text-[10px] mt-1.5 ${statusColor(project.survey)}`}>
                  {statusLabel(project.survey)}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {/* Show survey action button unless already delivered */}
                {!project.survey?.deliveredAt && (
                  <Link
                    href={`/contractor/survey/${project.id}`}
                    className="bg-ghs-green/10 border border-ghs-green/25 hover:bg-ghs-green/15 text-ghs-green rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors text-center"
                  >
                    {!project.survey
                      ? '▶ Opmeting starten'
                      : project.survey.isDraft
                        ? '✏ Opmeting hervatten'
                        : '✏ Opmeting bekijken'}
                  </Link>
                )}

                {/* Deliver button: survey done but not yet delivered */}
                {project.survey && !project.survey.isDraft && !project.survey.deliveredAt && (
                  <button
                    type="button"
                    onClick={() => handleDeliver(project.id)}
                    className="bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-3 py-1.5 text-[11px] shadow-[0_0_10px_rgba(114,217,70,0.2)] hover:shadow-[0_0_16px_rgba(114,217,70,0.35)] transition-shadow"
                  >
                    Lever in
                  </button>
                )}
              </div>
            </div>
          ))}

          {projects.length === 0 && !error && (
            <p className="text-sm text-white/25 text-center py-12">Geen opdrachten gevonden.</p>
          )}
        </div>
      </main>
    </div>
  )
}
