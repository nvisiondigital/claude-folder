import type { Project } from '@prisma/client'

const CAT_COLOURS = {
  CAT1: { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]', btn: '' },
  CAT2: { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]', btn: 'bg-ghs-green/10 border border-ghs-green/25 text-ghs-green' },
  CAT3: { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  btn: 'bg-cat3/10 border border-cat3/25 text-cat3' },
}

const CAT_LABELS = { CAT1: 'CAT 1', CAT2: 'CAT 2', CAT3: 'CAT 3' }

function PrimaryButton({ category }: { category: 'CAT1' | 'CAT2' | 'CAT3' }) {
  if (category === 'CAT2') {
    return (
      <button className={`w-full text-center rounded-md py-1.5 text-[11px] font-semibold mt-2 ${CAT_COLOURS.CAT2.btn}`}>
        ▶ Opmeting starten
      </button>
    )
  }
  if (category === 'CAT3') {
    return (
      <button className={`w-full text-center rounded-md py-1.5 text-[11px] font-semibold mt-2 ${CAT_COLOURS.CAT3.btn}`}>
        → Stuur naar dispatch
      </button>
    )
  }
  return null
}

interface Props {
  project: Project
  onSelect: (p: Project) => void
}

export default function ProjectCard({ project, onSelect }: Props) {
  const colours = CAT_COLOURS[project.category]

  return (
    <div
      onClick={() => onSelect(project)}
      className="bg-white/[0.04] border border-ghs-border rounded-lg p-3 cursor-pointer hover:border-white/15 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${colours.dot}`} />
        <span className="text-[9px] text-white/25 uppercase tracking-wider">{CAT_LABELS[project.category]}</span>
      </div>
      <div className="text-[12px] font-bold text-ghs-text mb-0.5">{project.clientName}</div>
      <div className="text-[11px] text-ghs-muted">
        {project.city}{project.description ? ` · ${project.description}` : ''}
      </div>
      <PrimaryButton category={project.category} />
    </div>
  )
}
