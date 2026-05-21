'use client'

import { useState } from 'react'
import { mutate } from 'swr'

interface Props {
  onClose: () => void
}

const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ghs-text placeholder-white/20 outline-none focus:border-ghs-green/40 transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-wider text-white/30 mb-1.5'

export default function AddProjectModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientName: '', email: '', phone: '',
    street: '', postalCode: '', city: '',
    category: 'CAT2',
    panelCount: '', roofType: '', description: '', sellerNotes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          panelCount: form.panelCount ? parseInt(form.panelCount) : undefined,
        }),
      })
      await mutate('/api/projects')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-ghs-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-ghs-teal via-ghs-green to-ghs-teal opacity-60" />

        <div className="p-6">
          <h2 className="text-sm font-bold text-white mb-5">Nieuw project toevoegen</h2>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Client info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="clientName" className={labelClass}>Naam klant *</label>
                <input id="clientName" required value={form.clientName} onChange={e => set('clientName', e.target.value)} className={inputClass} placeholder="Jan Janssen" />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>E-mail *</label>
                <input id="email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="jan@voorbeeld.be" />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Telefoon *</label>
                <input id="phone" required value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="0499 00 00 00" />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label htmlFor="street" className={labelClass}>Straat + nummer *</label>
                <input id="street" required value={form.street} onChange={e => set('street', e.target.value)} className={inputClass} placeholder="Kerkstraat 12" />
              </div>
              <div>
                <label htmlFor="postalCode" className={labelClass}>Postcode *</label>
                <input id="postalCode" required value={form.postalCode} onChange={e => set('postalCode', e.target.value)} className={inputClass} placeholder="9000" />
              </div>
              <div className="col-span-3">
                <label htmlFor="city" className={labelClass}>Gemeente *</label>
                <input id="city" required value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="Gent" />
              </div>
            </div>

            {/* Category + details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="category" className={labelClass}>Categorie *</label>
                <select id="category" value={form.category} onChange={e => set('category', e.target.value)} className={inputClass + ' cursor-pointer'}>
                  <option value="CAT1">CAT 1 — Klaar voor inplanning</option>
                  <option value="CAT2">CAT 2 — Opmeting intern</option>
                  <option value="CAT3">CAT 3 — Extern</option>
                </select>
              </div>
              <div>
                <label htmlFor="panelCount" className={labelClass}>Aantal panelen</label>
                <input id="panelCount" type="number" value={form.panelCount} onChange={e => set('panelCount', e.target.value)} className={inputClass} placeholder="20" />
              </div>
              <div>
                <label htmlFor="roofType" className={labelClass}>Daktype</label>
                <input id="roofType" value={form.roofType} onChange={e => set('roofType', e.target.value)} className={inputClass} placeholder="Hellend dak" />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Beschrijving</label>
                <input id="description" value={form.description} onChange={e => set('description', e.target.value)} className={inputClass} placeholder="Kort omschrijving" />
              </div>
            </div>
            <div>
              <label htmlFor="sellerNotes" className={labelClass}>Notities verkoper</label>
              <textarea id="sellerNotes" value={form.sellerNotes} onChange={e => set('sellerNotes', e.target.value)} className={inputClass + ' resize-none h-20'} placeholder="..." />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg py-2.5 text-sm text-ghs-muted hover:text-white/60 transition-colors">
                Annuleren
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
                {loading ? 'Opslaan...' : 'Project opslaan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
