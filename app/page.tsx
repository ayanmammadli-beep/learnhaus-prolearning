'use client'

import { useState, useRef, useEffect } from 'react'

interface Activity {
  id: number
  title: string
  provider: string
  type: string
  url: string
  description: string
  cost: string
  modality: string
  level: string
  tags: string
  eligibility: string
  location: string
  freshness: string
  matchScore?: number
  matchReason?: string
}

type Column = 'saved' | 'enrolled' | 'completed'
interface ShortlistEntry { activity: Activity; column: Column }
type Phase = 'idle' | 'loading' | 'done' | 'error'
type View = 'search' | 'shortlist'

// ── Helpers ──────────────────────────────────────────────────────

function parseThinking(text: string): string {
  const match = text.match(/<thinking>([\s\S]*?)(<\/thinking>|$)/)
  return match ? match[1].trim() : ''
}

function parseRecommendations(text: string): string {
  const match = text.match(/<recommendations>([\s\S]*?)(<\/recommendations>|$)/)
  return match ? match[1].trim() : ''
}

function getActivityReason(activity: Activity, recsText: string, thinkingText: string): string {
  if (activity.matchReason) return activity.matchReason
  const searchIn = recsText || thinkingText
  if (!searchIn) return activity.description.slice(0, 200)
  const titleWords = activity.title.toLowerCase().split(' ').slice(0, 3).join(' ')
  let idx = searchIn.toLowerCase().indexOf(titleWords)
  if (idx === -1) idx = searchIn.toLowerCase().indexOf(activity.provider.toLowerCase().slice(0, 12))
  if (idx !== -1) {
    return searchIn.slice(idx, Math.min(searchIn.length, idx + 350))
      .replace(/\*\*/g, '').replace(/\[ID:\d+\]/g, '').replace(/[*#]/g, '')
      .replace(/\n+/g, ' ').trim().slice(0, 240)
  }
  return activity.description.slice(0, 200)
}

function costBadgeClass(cost: string): string {
  const c = cost.toLowerCase()
  if (c.startsWith('free')) return 'bg-green-100 text-green-800'
  if (c === 'freemium') return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function matchScoreBadgeClass(score: number): string {
  if (score >= 8) return 'bg-green-100 text-green-800 border-green-300'
  return 'bg-yellow-100 text-yellow-800 border-yellow-300'
}

const TYPE_COLORS: Record<string, string> = {
  course: 'bg-blue-100 text-blue-800',
  certificate: 'bg-purple-100 text-purple-800',
  hackathon: 'bg-orange-100 text-orange-800',
  community: 'bg-green-100 text-green-800',
  volunteering: 'bg-pink-100 text-pink-800',
  meetup: 'bg-yellow-100 text-yellow-800',
  'professional association': 'bg-teal-100 text-teal-800',
}
function typeBadgeClass(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
}

function parseDollarAmount(cost: string): number | null {
  const match = cost.match(/\$([0-9,]+)/)
  if (!match) return null
  return parseInt(match[1].replace(',', ''), 10)
}

function loadShortlist(): Record<number, ShortlistEntry> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('prolearner-shortlist') ?? '{}') }
  catch { return {} }
}

// ── Pill Button ───────────────────────────────────────────────────

function PillButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors duration-150 ${
        selected
          ? 'bg-[#0050B5] text-white border-[#0050B5]'
          : 'bg-white text-[#0F0F0F] border-[#0F0F0F]/30 hover:border-[#0050B5] hover:text-[#0050B5]'
      }`}
    >
      {label}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────

export default function Home() {
  const [view, setView] = useState<View>('search')
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedModalities, setSelectedModalities] = useState<Set<string>>(new Set())
  const [selectedCosts, setSelectedCosts] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedEligibilities, setSelectedEligibilities] = useState<Set<string>>(new Set())
  const [showThinking, setShowThinking] = useState(false)
  const [shortlist, setShortlist] = useState<Record<number, ShortlistEntry>>(loadShortlist)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  // Context form state
  const [background, setBackground] = useState('')
  const [budget, setBudget] = useState('')
  const [locationPref, setLocationPref] = useState('')
  const [showContext, setShowContext] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Persist shortlist to localStorage
  useEffect(() => {
    localStorage.setItem('prolearner-shortlist', JSON.stringify(shortlist))
  }, [shortlist])

  const thinkingText = parseThinking(streamingText)
  const recsText = parseRecommendations(streamingText)
  const isThinkingDone = streamingText.includes('</thinking>')

  const uniqueModalities = [...new Set(activities.map(a => a.modality).filter(Boolean))]
  const uniqueCosts = [...new Set(activities.map(a => a.cost).filter(Boolean))]
  const uniqueTypes = [...new Set(activities.map(a => a.type).filter(Boolean))]
  const uniqueEligibilities = [...new Set(activities.map(a => a.eligibility).filter(Boolean))]

  const filteredActivities = activities.filter(a => {
    const mOk = selectedModalities.size === 0 || selectedModalities.has(a.modality)
    const cOk = selectedCosts.size === 0 || selectedCosts.has(a.cost)
    const tOk = selectedTypes.size === 0 || selectedTypes.has(a.type)
    const eligibilityOk = selectedEligibilities.size === 0 || selectedEligibilities.has(a.eligibility)
    return mOk && cOk && tOk && eligibilityOk
  })

  const savedCount = Object.values(shortlist).filter(e => e.column === 'saved').length
  const enrolledCount = Object.values(shortlist).filter(e => e.column === 'enrolled').length
  const completedCount = Object.values(shortlist).filter(e => e.column === 'completed').length
  const totalShortlistCount = Object.keys(shortlist).length

  // Total cost of saved items
  const savedCostTotal = Object.values(shortlist)
    .filter(e => e.column === 'saved')
    .reduce((sum, e) => {
      const amt = parseDollarAmount(e.activity.cost)
      return amt ? sum + amt : sum
    }, 0)

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim()
    if (!q) return
    setQuery(q)
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setPhase('loading')
    setStreamingText('')
    setActivities([])
    setSelectedModalities(new Set())
    setSelectedCosts(new Set())
    setSelectedTypes(new Set())
    setSelectedEligibilities(new Set())
    setErrorMsg('')
    setShowThinking(false)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          background: background || undefined,
          budget: budget || undefined,
          location_pref: locationPref || undefined,
        }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error('Search failed')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (!json) continue
          try {
            const event = JSON.parse(json)
            if (event.type === 'text') {
              setStreamingText(prev => prev + event.text)
            } else if (event.type === 'done') {
              const newActs: Activity[] = event.activities ?? []
              setActivities(newActs)
              setSelectedModalities(new Set(newActs.map((a: Activity) => a.modality).filter(Boolean)))
              setSelectedCosts(new Set(newActs.map((a: Activity) => a.cost).filter(Boolean)))
              setSelectedTypes(new Set(newActs.map((a: Activity) => a.type).filter(Boolean)))
              setSelectedEligibilities(new Set(newActs.map((a: Activity) => a.eligibility).filter(Boolean)))
              setPhase('done')
            } else if (event.type === 'error') {
              setErrorMsg(event.message)
              setPhase('error')
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) {
    setter(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n })
  }

  function saveToShortlist(activity: Activity) {
    setShortlist(prev => ({ ...prev, [activity.id]: { activity, column: 'saved' } }))
  }
  function removeFromShortlist(id: number) {
    setShortlist(prev => { const n = { ...prev }; delete n[id]; return n })
  }
  function moveToColumn(id: number, column: Column) {
    setShortlist(prev => ({
      ...prev,
      [id]: { ...prev[id], column },
    }))
  }

  // ── Shared Top Nav (results + shortlist) ─────────────────────

  function TopNav({ activeView }: { activeView: View }) {
    return (
      <div className="relative flex h-auto w-full flex-col bg-white overflow-x-hidden border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 md:px-10 flex flex-1 justify-center py-3">
          <div className="flex flex-col w-full max-w-[1440px] flex-1">
            <header className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-8 w-full justify-between lg:justify-start">
                {/* Logo */}
                <div
                  className="flex items-center gap-4 text-[#111418] cursor-pointer"
                  onClick={() => { setPhase('idle'); setQuery(''); setStreamingText(''); setActivities([]); setView('search') }}
                >
                  <div className="size-6 text-[#0d52a5]">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd" />
                      <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-[#111418] text-xl font-bold leading-tight tracking-tight uppercase">LearnHaus</h2>
                </div>

                {/* Inline search (results view only) */}
                {activeView === 'search' && (
                  <label className="hidden md:flex flex-col flex-1 max-w-2xl ml-8">
                    <form onSubmit={e => { e.preventDefault(); handleSearch(query) }} className="flex w-full flex-1 items-stretch rounded h-12">
                      <div className="text-[#617389] flex border-2 border-r-0 border-[#111418] bg-white items-center justify-center pl-4 rounded-l">
                        <span className="material-symbols-outlined">search</span>
                      </div>
                      <input
                        className="flex w-full min-w-0 flex-1 text-[#111418] focus:outline-none focus:ring-0 border-2 border-l-0 border-[#111418] bg-white h-full placeholder:text-[#617389] px-4 pl-2 text-lg font-medium leading-normal"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search for a topic..."
                      />
                    </form>
                  </label>
                )}

                {/* Nav links */}
                <div className="flex items-center gap-6 ml-auto">
                  <button
                    className={`font-bold uppercase tracking-wide border-b-2 transition-all ${activeView === 'search' ? 'text-[#0d52a5] border-[#0d52a5]' : 'text-[#111418] border-transparent hover:border-[#111418]'}`}
                    onClick={() => setView('search')}
                  >
                    Search
                  </button>
                  <button
                    className={`font-bold uppercase tracking-wide border-b-2 transition-all flex items-center gap-1.5 ${activeView === 'shortlist' ? 'text-[#0d52a5] border-[#0d52a5]' : 'text-[#111418] border-transparent hover:border-[#111418]'}`}
                    onClick={() => setView('shortlist')}
                  >
                    Shortlist
                    {totalShortlistCount > 0 && (
                      <span className="bg-[#0d52a5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {totalShortlistCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </header>
          </div>
        </div>
      </div>
    )
  }

  // ── SCREEN 1+LOADING: Search Home ───────────────────────────

  if (view === 'search' && (phase === 'idle' || phase === 'loading')) {
    return (
      <div
        className="h-screen w-full overflow-hidden flex flex-col antialiased transition-colors duration-300"
        style={{ fontFamily: 'var(--font-body)', backgroundColor: phase === 'loading' ? '#FFCD00' : '#F4F4F0', color: '#0F0F0F' }}
      >
        <div className="absolute top-6 left-6 w-12 h-12 bg-[#FFCD00] brutalist-border flex items-center justify-center shadow-hard">
          <span className="font-bold text-2xl text-[#0F0F0F] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>L</span>
        </div>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="max-w-[800px] w-full flex flex-col items-center gap-8">
            <h1 className="font-bold text-[40px] md:text-[64px] leading-[1.1] uppercase text-center text-[#0F0F0F] tracking-tight w-full" style={{ fontFamily: 'var(--font-heading)' }}>
              {phase === 'loading' ? 'COMPUTING MATCHES...' : 'What do you want to master?'}
            </h1>
            <form className="w-full flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleSearch() }}>
              {/* Main search bar */}
              <div className="w-full flex h-[72px] shadow-hard hover:shadow-hard-hover transition-shadow duration-200">
                <input
                  aria-label="Search for a topic to master"
                  className="flex-1 bg-white brutalist-border border-r-0 h-full px-6 text-lg md:text-2xl text-[#0F0F0F] placeholder:text-[#0F0F0F]/50 focus:ring-0 focus:outline-none focus:border-[#0050B5] transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-body)' }}
                  placeholder="Advanced React Patterns"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={phase === 'loading'}
                  autoFocus
                />
                <button
                  className="w-[120px] h-full bg-[#0050B5] text-white font-bold text-lg uppercase brutalist-border hover:bg-[#0050B5]/90 transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#FFCD00]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                  type="submit"
                  disabled={phase === 'loading'}
                >
                  Search
                </button>
              </div>

              {/* Add context toggle */}
              {phase !== 'loading' && (
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => setShowContext(v => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#0F0F0F]/60 hover:text-[#0050B5] transition-colors uppercase tracking-wide"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showContext ? 'expand_less' : 'tune'}
                    </span>
                    {showContext ? 'Hide context' : 'Add context'}
                  </button>

                  {showContext && (
                    <div className="mt-4 bg-white brutalist-border p-5 flex flex-col gap-5 shadow-hard">
                      {/* Background */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#0F0F0F]/50">Background</span>
                        <div className="flex flex-wrap gap-2">
                          {['High School', 'College', 'Professional'].map(opt => (
                            <PillButton
                              key={opt}
                              label={opt}
                              selected={background === opt.toLowerCase()}
                              onClick={() => setBackground(prev => prev === opt.toLowerCase() ? '' : opt.toLowerCase())}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#0F0F0F]/50">Budget</span>
                        <div className="flex flex-wrap gap-2">
                          {['Free Only', 'Under $100', 'No Limit'].map(opt => (
                            <PillButton
                              key={opt}
                              label={opt}
                              selected={budget === opt.toLowerCase()}
                              onClick={() => setBudget(prev => prev === opt.toLowerCase() ? '' : opt.toLowerCase())}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Format */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#0F0F0F]/50">Format</span>
                        <div className="flex flex-wrap gap-2">
                          {['Online', 'In-Person', 'Either'].map(opt => (
                            <PillButton
                              key={opt}
                              label={opt}
                              selected={locationPref === opt.toLowerCase()}
                              onClick={() => setLocationPref(prev => prev === opt.toLowerCase() ? '' : opt.toLowerCase())}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </main>
      </div>
    )
  }

  // ── SCREEN 3: Shortlist Kanban ────────────────────────────────

  if (view === 'shortlist') {
    const columns: { id: Column; label: string }[] = [
      { id: 'saved', label: 'Saved' },
      { id: 'enrolled', label: 'Enrolled' },
      { id: 'completed', label: 'Completed' },
    ]
    const counts = { saved: savedCount, enrolled: enrolledCount, completed: completedCount }

    return (
      <div className="bg-[#F4F4F0] text-[#0F0F0F] min-h-screen flex flex-col overflow-hidden" style={{ fontFamily: 'var(--font-display)' }}>
        <TopNav activeView="shortlist" />

        {/* Kanban board */}
        <main
          className="flex-1 overflow-x-auto kanban-scroll p-8 pb-32 flex items-start gap-8 max-w-[1600px] mx-auto w-full"
          style={{ minHeight: 'calc(100vh - 4rem - 5rem)' }}
        >
          {columns.map(col => {
            const entries = Object.values(shortlist).filter(e => e.column === col.id)
            return (
              <section
                key={col.id}
                className="flex flex-col min-w-[350px] w-[350px] shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (draggedId !== null) { moveToColumn(draggedId, col.id); setDraggedId(null) }
                }}
              >
                <header className="border-b-thick border-[#0F0F0F] pb-4 mb-6 flex justify-between items-end">
                  <h2 className={`text-3xl font-bold uppercase tracking-tight ${col.id === 'completed' ? 'text-gray-400' : ''}`}>
                    {col.label}
                  </h2>
                  <span className={`px-2 py-1 text-sm font-bold rounded-sm ${col.id === 'completed' ? 'bg-gray-300 text-gray-600' : 'bg-[#0F0F0F] text-white'}`}>
                    {counts[col.id]}
                  </span>
                </header>

                <div className="flex flex-col gap-6 min-h-[120px]">
                  {entries.length === 0 && (
                    <div className="h-32 border-thick border-dashed border-gray-300 bg-gray-50 rounded-sm flex flex-col items-center justify-center opacity-60">
                      {col.id === 'completed'
                        ? <><span className="material-symbols-outlined text-gray-400 mb-2" style={{ fontSize: '32px' }}>check_circle</span><span className="text-gray-400 font-bold uppercase tracking-widest text-sm text-center px-4">Drag here when finished</span></>
                        : <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Drop here</span>
                      }
                    </div>
                  )}

                  {entries.map(({ activity }) => (
                    <article
                      key={activity.id}
                      draggable
                      onDragStart={() => setDraggedId(activity.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`bg-white border-thick border-[#0F0F0F] p-5 transition-all group rounded-sm relative cursor-grab active:cursor-grabbing ${
                        draggedId === activity.id
                          ? 'opacity-50 shadow-[12px_12px_0px_#0d52a5] -translate-y-1 -translate-x-1'
                          : 'shadow-hard hover:shadow-hard-hover hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="absolute right-4 top-4 text-[#0F0F0F] opacity-30 group-hover:opacity-80 transition-opacity">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>drag_indicator</span>
                      </div>
                      <div className="pr-8 mb-4">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded capitalize mb-2 ${typeBadgeClass(activity.type)}`}>
                          {activity.type}
                        </span>
                        <h3 className="text-xl font-bold uppercase leading-tight mb-1">{activity.title}</h3>
                        <p className="text-sm font-medium uppercase tracking-wider text-gray-600">{activity.provider}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#0F0F0F]">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm border border-[#0F0F0F] ${costBadgeClass(activity.cost)}`}>
                            {activity.cost}
                          </span>
                          <span className="bg-[#F4F4F0] px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm border border-[#0F0F0F]">
                            {activity.modality}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromShortlist(activity.id)}
                          className="text-gray-400 hover:text-[#E00025] transition-colors"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </main>

        {/* Fixed bottom bar */}
        <footer className="fixed bottom-0 left-0 right-0 bg-[#FFCD00] border-t-thick border-[#0F0F0F] z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          <div className="max-w-[1600px] mx-auto w-full px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold uppercase tracking-tight">Total Cost (Saved):</span>
              <span className="text-3xl font-black bg-white px-4 py-1 border-thick border-[#0F0F0F] rounded-sm shadow-hard">
                {savedCostTotal > 0 ? `$${savedCostTotal.toLocaleString()}` : 'Free'}
              </span>
            </div>
            <button
              className="bg-[#0d52a5] text-white text-xl font-bold uppercase px-12 py-4 border-thick border-[#0F0F0F] shadow-hard hover:shadow-hard-hover hover:-translate-y-1 transition-all rounded-sm flex items-center gap-3"
              onClick={() => {
                Object.values(shortlist)
                  .filter(e => e.column === 'saved')
                  .forEach(e => window.open(e.activity.url, '_blank'))
              }}
            >
              Enroll All
              <span className="material-symbols-outlined font-bold">arrow_forward</span>
            </button>
          </div>
        </footer>
      </div>
    )
  }

  // ── SCREEN 2: Ranked Results ──────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-display)', backgroundColor: '#f6f7f8', color: '#111418' }}>
      <TopNav activeView="search" />

      <div className="flex-1 w-full max-w-[1440px] mx-auto flex flex-col md:flex-row px-4 md:px-10 py-6 md:py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-[250px] shrink-0">
          <div className="sticky top-24 flex flex-col gap-8">

            {/* Type */}
            {uniqueTypes.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-2 text-[#111418]">Opportunity Type</h3>
                <div className="flex flex-col gap-3">
                  {uniqueTypes.map(t => (
                    <label key={t} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="bauhaus-checkbox" checked={selectedTypes.has(t)} onChange={() => toggle(setSelectedTypes, t)} />
                      <span className="text-base font-medium text-gray-700 group-hover:text-black capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Modality */}
            {uniqueModalities.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-2 text-[#111418]">Modality</h3>
                <div className="flex flex-col gap-3">
                  {uniqueModalities.map(m => (
                    <label key={m} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="bauhaus-checkbox" checked={selectedModalities.has(m)} onChange={() => toggle(setSelectedModalities, m)} />
                      <span className="text-base font-medium text-gray-700 group-hover:text-black">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Cost */}
            {uniqueCosts.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-2 text-[#111418]">Cost</h3>
                <div className="flex flex-col gap-3">
                  {uniqueCosts.map(c => (
                    <label key={c} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="bauhaus-checkbox" checked={selectedCosts.has(c)} onChange={() => toggle(setSelectedCosts, c)} />
                      <span className="text-base font-medium text-gray-700 group-hover:text-black">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Eligibility */}
            {uniqueEligibilities.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-2 text-[#111418]">Eligibility</h3>
                <div className="flex flex-col gap-3">
                  {uniqueEligibilities.map(e => (
                    <label key={e} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="bauhaus-checkbox" checked={selectedEligibilities.has(e)} onChange={() => toggle(setSelectedEligibilities, e)} />
                      <span className="text-base font-medium text-gray-700 group-hover:text-black capitalize">{e}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Results header */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-[#111418] pb-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-[#111418]">
                {filteredActivities.length} Match{filteredActivities.length !== 1 ? 'es' : ''} Found
              </h1>
              <p className="text-gray-600 font-medium text-sm uppercase tracking-wider mt-1">Sorted by AI Relevance Score</p>
            </div>
            {/* AI Thinking toggle */}
            <button
              onClick={() => setShowThinking(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-[#111418] text-sm font-bold uppercase tracking-wide transition-colors ${showThinking ? 'bg-[#111418] text-white' : 'bg-white text-[#111418] hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>psychology</span>
              {showThinking ? 'Hide' : 'See'} AI Reasoning
              {!isThinkingDone && thinkingText && (
                <span className="w-2 h-2 rounded-full bg-[#0d52a5] animate-pulse ml-1" />
              )}
            </button>
          </div>

          {/* AI Thinking panel */}
          {showThinking && (
            <div className="border-2 border-[#0d52a5] bg-blue-50/40 rounded overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#0d52a5] bg-blue-50">
                <span className="material-symbols-outlined text-[#0d52a5]" style={{ fontSize: '18px' }}>smart_toy</span>
                <span className="text-sm font-bold text-[#0d52a5] uppercase tracking-wider">AI Reasoning</span>
                {!isThinkingDone
                  ? <span className="ml-1 w-2 h-2 rounded-full bg-[#0d52a5] animate-pulse" />
                  : <span className="ml-1 text-xs text-green-600 font-bold uppercase tracking-wide">Complete</span>
                }
              </div>
              <div
                className="p-4 max-h-52 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}
              >
                {thinkingText || <span className="text-gray-400">Thinking...</span>}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600 text-sm font-medium">{errorMsg}</div>
          )}

          {/* Streaming indicator */}
          {activities.length === 0 && phase === 'done' && !errorMsg && (
            <div className="flex items-center gap-3 py-8 text-gray-500">
              <div className="w-4 h-4 border-2 border-[#0d52a5] border-t-transparent rounded-full animate-spin" />
              <span className="font-medium text-sm uppercase tracking-wide">AI is analyzing your query...</span>
            </div>
          )}

          {/* Empty filter state */}
          {filteredActivities.length === 0 && activities.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>filter_list_off</span>
              <p className="font-bold uppercase tracking-wide text-sm">No results match your filters — try adjusting them</p>
            </div>
          )}

          {/* Results grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
            {filteredActivities.map(activity => {
              const isSaved = !!shortlist[activity.id]
              const reason = getActivityReason(activity, recsText, thinkingText)
              return (
                <article key={activity.id} className="result-card bg-white rounded border border-gray-200 flex flex-col h-full relative overflow-hidden group">
                  {/* Header */}
                  <div className="p-5 pb-4 flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`self-start inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded capitalize ${typeBadgeClass(activity.type)}`}>
                          {activity.type}
                        </span>
                        {activity.matchScore !== undefined && (
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${matchScoreBadgeClass(activity.matchScore)}`}>
                            {activity.matchScore}/10 match
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold leading-tight text-[#111418] group-hover:text-[#0d52a5] transition-colors">
                        {activity.title}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded ${costBadgeClass(activity.cost)}`}>
                        {activity.cost}
                      </span>
                      {/* Save button */}
                      <button
                        onClick={() => isSaved ? removeFromShortlist(activity.id) : saveToShortlist(activity)}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors rounded ${
                          isSaved
                            ? 'bg-[#0d52a5] text-white border-[#0d52a5]'
                            : 'bg-white text-gray-500 border-gray-300 hover:border-[#0d52a5] hover:text-[#0d52a5]'
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}>
                          bookmark
                        </span>
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata grid */}
                  <div className="px-5 pb-5 grid grid-cols-3 gap-0 border-y border-gray-100 bg-gray-50/50">
                    <div className="py-3 px-2 border-r border-gray-100 flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Source</span>
                      <span className="text-sm font-semibold text-[#111418] truncate">{activity.provider}</span>
                    </div>
                    <div className="py-3 px-2 border-r border-gray-100 flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Level</span>
                      <span className="text-sm font-semibold text-[#111418] truncate capitalize">{activity.level}</span>
                    </div>
                    <div className="py-3 px-2 flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Modality</span>
                      <span className="text-sm font-semibold text-[#111418] truncate capitalize">{activity.modality}</span>
                    </div>
                  </div>

                  {/* AI explanation + link */}
                  <div className="mt-auto p-5 bg-blue-50/30 flex flex-col gap-2 border-t border-blue-100">
                    <span className="text-xs font-bold text-[#0d52a5] uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>smart_toy</span>
                      Why This Match
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{reason}</p>
                    <a
                      href={activity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 self-start text-xs font-bold text-[#0d52a5] uppercase tracking-wider flex items-center gap-1 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      View Resource
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
