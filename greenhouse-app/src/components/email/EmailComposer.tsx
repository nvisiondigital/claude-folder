'use client'

import { useState } from 'react'
import type { Project } from '@prisma/client'
import { buildMailtoUrl, EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/email'

// Re-export so ProjectDetailPanel can import EmailTemplate from this file
export type { EmailTemplate }

interface Props {
  template: EmailTemplate
  project: Project
}

export default function EmailComposer({ template, project }: Props) {
  const [copied, setCopied] = useState(false)
  const tpl = EMAIL_TEMPLATES[template]
  const body = tpl.body(project)
  const subject = tpl.subject(project)
  const mailtoUrl = buildMailtoUrl(template, project)

  async function handleCopy() {
    await navigator.clipboard.writeText(`Onderwerp: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-ghs-bg border border-white/[0.08] rounded-xl overflow-hidden mt-3">
      {/* To + Subject */}
      <div className="px-4 py-3 space-y-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px]">Aan</span>
          <span className="text-ghs-text font-medium">{project.email}</span>
        </div>
        <div className="flex items-start gap-3 text-[11px]">
          <span className="text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px] pt-0.5">Onderwerp</span>
          <span className="text-ghs-muted">{subject}</span>
        </div>
      </div>

      {/* Body preview */}
      <pre className="px-4 py-3 text-[11px] text-ghs-muted whitespace-pre-wrap leading-relaxed font-sans max-h-52 overflow-y-auto">
        {body}
      </pre>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex gap-2">
        <a
          href={mailtoUrl}
          className="flex-[2] bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-2 text-[11px] text-center shadow-[0_0_10px_rgba(114,217,70,0.2)] hover:shadow-[0_0_16px_rgba(114,217,70,0.35)] transition-shadow"
        >
          ✉ Versturen via Outlook
        </a>
        <button
          onClick={handleCopy}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 text-[11px] text-ghs-muted hover:text-white/60 transition-colors"
        >
          {copied ? '✓ Gekopieerd' : '📋 Kopieer'}
        </button>
      </div>
    </div>
  )
}
