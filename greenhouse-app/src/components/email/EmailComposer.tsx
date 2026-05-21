import type { Project } from '@prisma/client'

export type EmailTemplate = 'afspraak' | 'verslag' | 'wijzigingen'

interface Props {
  template: EmailTemplate
  project: Project
}

export default function EmailComposer({ template, project: _project }: Props) {
  return (
    <div className="bg-ghs-bg border border-white/[0.08] rounded-xl p-4 mt-3 text-[11px] text-ghs-muted">
      Email composer ({template}) — komt in Task 10
    </div>
  )
}
