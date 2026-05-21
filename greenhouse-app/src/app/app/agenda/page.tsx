import CalendarEmbed from '@/components/agenda/CalendarEmbed'
import UpcomingList from '@/components/agenda/UpcomingList'

export default function AgendaPage() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main: Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] bg-ghs-surface shrink-0">
          <h1 className="text-sm font-bold text-white">Agenda</h1>
          <p className="text-[11px] text-white/30 mt-0.5">Google Calendar</p>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <CalendarEmbed />
        </div>
      </div>

      {/* Right: Upcoming opmetingen */}
      <aside className="w-56 shrink-0 border-l border-white/[0.05] bg-white/[0.015] flex flex-col overflow-hidden">
        <div className="px-3.5 py-3 border-b border-white/[0.05] shrink-0">
          <p className="text-[11px] font-bold text-white/60">Aankomende opmetingen</p>
          <p className="text-[10px] text-white/20 mt-0.5">Komende 2 weken</p>
        </div>
        <UpcomingList />
        <div className="p-2.5 border-t border-white/[0.05] shrink-0">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 text-[10px] text-white/30 hover:text-white/50 hover:border-ghs-green/30 transition-colors"
          >
            ↗ Openen in Google Calendar
          </a>
        </div>
      </aside>
    </div>
  )
}
