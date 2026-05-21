import type { Project } from '@prisma/client'

export type EmailTemplate = 'afspraak' | 'verslag' | 'wijzigingen'

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

export const EMAIL_TEMPLATES = {
  afspraak: {
    label: 'Afspraak inplannen',
    subject: (p: Project) => `Afspraak opmeting zonnepanelen — ${p.clientName}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

We willen graag een afspraak inplannen voor de opmeting van uw installatie op ${p.street}, ${p.postalCode} ${p.city}.

Zou een van de volgende momenten passen voor u?

  • [Datum voorstel 1]
  • [Datum voorstel 2]

Gelieve te laten weten welk moment het beste uitkomt, of stel gerust een alternatief voor.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },

  verslag: {
    label: 'Verslag doorsturen',
    subject: (p: Project) => `Opmetingsverslag — ${p.clientName} — ${p.street}, ${p.city}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

In bijlage vindt u het opmetingsverslag voor uw installatie op ${p.street}, ${p.postalCode} ${p.city}.

Gelieve dit verslag door te nemen en te bevestigen. Bij vragen of opmerkingen kan u ons steeds contacteren.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },

  wijzigingen: {
    label: 'Wijzigingen bespreken',
    subject: (p: Project) => `Wijzigingen opmetingsverslag — ${p.clientName}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

We ontvingen uw vraag tot aanpassingen aan het opmetingsverslag voor de installatie op ${p.street}, ${p.postalCode} ${p.city}.

We bekijken de gevraagde wijzigingen en nemen zo snel mogelijk contact met u op.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },
} as const

export function buildMailtoUrl(template: EmailTemplate, project: Project): string {
  const tpl = EMAIL_TEMPLATES[template]
  const subject = encodeURIComponent(tpl.subject(project))
  const body = encodeURIComponent(tpl.body(project))
  return `mailto:${project.email}?subject=${subject}&body=${body}`
}
