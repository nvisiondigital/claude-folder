export default function CalendarEmbed() {
  const src = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SRC

  if (!src || src.includes('placeholder')) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 text-ghs-muted">
        <p className="text-sm">Google Calendar niet geconfigureerd</p>
        <p className="text-[11px] text-white/20 text-center max-w-xs">
          Voeg <code className="text-ghs-green/70">NEXT_PUBLIC_GOOGLE_CALENDAR_SRC</code> toe aan .env.local
        </p>
      </div>
    )
  }

  return (
    <iframe
      src={src}
      className="flex-1 w-full border-0"
      style={{ colorScheme: 'light' }}
      title="Google Calendar"
    />
  )
}
