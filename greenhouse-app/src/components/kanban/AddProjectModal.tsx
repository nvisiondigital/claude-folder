interface Props {
  onClose: () => void
}

export default function AddProjectModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-ghs-surface border border-white/10 rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-sm font-bold text-white mb-4">Nieuw project toevoegen</h2>
        <p className="text-ghs-muted text-xs mb-4">Modal — komt in Task 8</p>
        <button onClick={onClose} className="text-ghs-muted text-sm hover:text-white">Sluiten</button>
      </div>
    </div>
  )
}
