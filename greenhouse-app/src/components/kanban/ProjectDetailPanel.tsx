// src/components/kanban/ProjectDetailPanel.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProjectWithSurvey } from '@/lib/types'
import EmailComposer, { type EmailTemplate } from '@/components/email/EmailComposer'

const EXTERNAL_TOOLS = [
  { label: 'ESDEC ↗',     href: (_p: ProjectWithSurvey) => 'https://my.esdec.com' },
  { label: 'Solaredge ↗', href: (_p: ProjectWithSurvey) => 'https://solaredge.com/solaredge-portal/solution/login' },
  { label: 'Geopunt ↗',   href: (p: ProjectWithSurvey) => `https://www.geopunt.be/catalogus#q=${encodeURIComponent(p.street + ' ' + p.city)}` },
  { label: 'WebODM ↗',    href: (_p: ProjectWithSurvey) => 'https://webodm.net' },
]

interface Props {
  project: ProjectWithSurvey
  onClose: () => void
}

export default function ProjectDetailPanel({ project, onClose }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null)
  const surveyDone = project.survey != null && !project.survey.isDraft

  return (
    <aside className="w-96 shrink-0 bg-ghs-surface border-l border-white/[0.06] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">{project.clientName}</h2>
          <p className="text-[11px] text-ghs-muted mt-0.5">{project.city} · {project.category}</p>
        </div>
        <button
          aria-label="Sluiten"
          onClick={onClose}
          className="ml-auto w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact info */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Klantgegevens</p>
          <div className="space-y-2 text-[12px]">
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">Adres</span>
              <span className="text-ghs-text">{project.street}, {project.postalCode} {project.city}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">Telefoon</span>
              <span className="text-ghs-text">{project.phone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">E-mail</span>
              <span className="text-ghs-text">{project.email}</span>
            </div>
          </div>
        </section>

        {/* Project details */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Project</p>
          <div className="space-y-2 text-[12px]">
            {project.panelCount != null && (
              <div className="flex gap-2">
                <span className="text-white/30 w-16 shrink-0">Panelen</span>
                <span className="text-ghs-text">{project.panelCount}</span>
              </div>
            )}
            {project.roofType && (
              <div className="flex gap-2">
                <span className="text-white/30 w-16 shrink-0">Dak</span>
                <span className="text-ghs-text">{project.roofType}</span>
              </div>
            )}
            {project.sellerNotes && (
              <div>
                <span className="text-white/30 text-[10px] block mb-1">Notities verkoper</span>
                <p className="text-[11px] text-ghs-muted bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 leading-relaxed">
                  {project.sellerNotes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Survey action — CAT2 only */}
        {project.category === 'CAT2' && (
          <section className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Opmeting</p>
            {surveyDone ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] text-ghs-green/80 mb-1">
                  <span>✓</span>
                  <span>Opmeting afgerond</span>
                </div>
                <a
                  href={`/api/surveys/${project.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center bg-white/[0.05] border border-white/[0.08] hover:bg-white/10 rounded-lg px-3 py-2 text-[11px] text-white/60 transition-colors"
                >
                  📄 Rapport bekijken (PDF)
                </a>
                <Link
                  href={`/app/survey/${project.id}`}
                  className="text-center bg-white/[0.03] border border-white/[0.07] hover:border-white/15 rounded-lg px-3 py-2 text-[11px] text-white/35 hover:text-white/60 transition-colors"
                >
                  ✏ Opmeting bewerken
                </Link>
              </div>
            ) : (
              <Link
                href={`/app/survey/${project.id}`}
                className="block text-center bg-ghs-green/10 border border-ghs-green/25 hover:bg-ghs-green/15 text-ghs-green rounded-lg px-3 py-2.5 text-[11px] font-semibold transition-colors"
              >
                {project.survey?.isDraft ? '✏ Opmeting hervatten' : '▶ Opmeting starten'}
              </Link>
            )}
          </section>
        )}

        {/* External tools */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Externe tools</p>
          <div className="grid grid-cols-2 gap-2">
            {EXTERNAL_TOOLS.map(tool => (
              <a
                key={tool.label}
                href={tool.href(project)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-[11px] text-ghs-muted hover:border-ghs-green/30 hover:text-white/60 transition-colors text-center"
              >
                {tool.label}
              </a>
            ))}
          </div>
        </section>

        {/* Email templates */}
        <section className="px-5 py-4">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">E-mail templates</p>
          <div className="flex flex-col gap-2">
            {(['afspraak', 'verslag', 'wijzigingen'] as EmailTemplate[]).map(tpl => (
              <button
                key={tpl}
                onClick={() => setActiveTemplate(activeTemplate === tpl ? null : tpl)}
                className={`text-left rounded-lg px-3 py-2.5 text-[11px] border transition-colors ${
                  activeTemplate === tpl
                    ? 'bg-ghs-green/[0.08] border-ghs-green/30 text-ghs-green'
                    : 'bg-white/[0.03] border-white/[0.07] text-ghs-muted hover:border-white/15 hover:text-white/60'
                }`}
              >
                ✉{' '}
                {tpl === 'afspraak'    && 'Afspraak inplannen'}
                {tpl === 'verslag'     && 'Verslag doorsturen'}
                {tpl === 'wijzigingen' && 'Wijzigingen bespreken'}
              </button>
            ))}
          </div>
        </section>

        {activeTemplate && (
          <div className="px-5 pb-5">
            <EmailComposer template={activeTemplate} project={project} />
          </div>
        )}
      </div>
    </aside>
  )
}
