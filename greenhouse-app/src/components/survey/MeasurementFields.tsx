// src/components/survey/MeasurementFields.tsx
'use client'

import type { SurveyMeasurements } from '@/lib/survey'

interface Props {
  values: SurveyMeasurements
  onChange: (next: SurveyMeasurements) => void
}

function TextInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-ghs-text outline-none focus:border-ghs-green/40 transition-colors"
      />
    </div>
  )
}

function BoolToggle({
  label, value, onChange,
}: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 mb-1">{label}</label>
      <div className="flex gap-1.5">
        {([true, false, null] as const).map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
              value === v
                ? v === true
                  ? 'bg-ghs-green/10 border-ghs-green/40 text-ghs-green'
                  : v === false
                    ? 'bg-red-500/10 border-red-500/40 text-red-400'
                    : 'bg-white/[0.07] border-white/20 text-white/50'
                : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:border-white/15'
            }`}
          >
            {v === true ? 'Ja' : v === false ? 'Nee' : '—'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MeasurementFields({ values, onChange }: Props) {
  function set<K extends keyof SurveyMeasurements>(key: K, value: SurveyMeasurements[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div id="section-measurements">
      <h3 className="text-[10px] uppercase tracking-widest text-white/25 mb-3 pt-2">
        Metingen &amp; notities
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Netspanning"          value={values.netspanning}          onChange={v => set('netspanning', v)} />
        <TextInput label="Hoofdzekering"        value={values.hoofdzekering}        onChange={v => set('hoofdzekering', v)} />
        <TextInput label="Geschatte lengte DC"  value={values.geschatteLengteDc}   onChange={v => set('geschatteLengteDc', v)} />
        <TextInput label="Geschatte lengte AC"  value={values.geschatteLengteAc}   onChange={v => set('geschatteLengteAc', v)} />
        <TextInput label="Locatie omvormer"     value={values.locatieOmvormer}      onChange={v => set('locatieOmvormer', v)} />
        <TextInput label="Soort bevestiging"    value={values.soortBevestiging}     onChange={v => set('soortBevestiging', v)} />
        <TextInput label="Aantal muurdoorvoeren" value={values.aantalMuurdoorvoeren} onChange={v => set('aantalMuurdoorvoeren', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <BoolToggle label="Aarding ok?"         value={values.aardingOk}        onChange={v => set('aardingOk', v)} />
        <BoolToggle label="Elektriciteit ok?"   value={values.elektriciteitsOk} onChange={v => set('elektriciteitsOk', v)} />
      </div>
      <div className="mt-3">
        <BoolToggle label="Internet beschikbaar?" value={values.internet} onChange={v => set('internet', v)} />
        {values.internet === true && (
          <div className="mt-2">
            <TextInput label="Type internet" value={values.internetType} onChange={v => set('internetType', v)} />
          </div>
        )}
      </div>
      <div className="mt-3">
        <label className="block text-[10px] text-white/40 mb-1">Samenvatting opmeting</label>
        <textarea
          value={values.samenvatting}
          onChange={e => set('samenvatting', e.target.value)}
          rows={4}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-ghs-text outline-none focus:border-ghs-green/40 transition-colors resize-none"
        />
      </div>
    </div>
  )
}
