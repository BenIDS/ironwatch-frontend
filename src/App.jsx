import { useState, useEffect, useMemo } from 'react'

const API = 'https://ironwatch-3906.onrender.com/api/v1'

const VERDICT = {
  'Strong Buy': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  'Buy':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
  'Watch':      { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  'Pass':       { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
}

const COND = {
  'Excellent': { bg: '#14532d', color: '#22c55e' },
  'Good':      { bg: '#1e3a5f', color: '#60a5fa' },
  'Fair':      { bg: '#451a03', color: '#fbbf24' },
  'Poor':      { bg: '#450a0a', color: '#f87171' },
  'Scrap':     { bg: '#2a0a0a', color: '#ef4444' },
}

function timeLeft(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate) - new Date()
  if (diff <= 0) return { text: 'Ended', urgent: false }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const urgent = d === 0 && h < 6
  if (d > 0) return { text: `${d}d ${h}h`, urgent: false }
  if (h > 0) return { text: `${h}h ${m}m`, urgent }
  return { text: `${m}m`, urgent: true }
}

function fmt(n) {
  if (n == null) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 65) return '#60a5fa'
  if (s >= 50) return '#fbbf24'
  return '#f87171'
}

function LotCard({ lot, savedIds, onSaveToggle }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const v = VERDICT[lot.verdict] || VERDICT['Watch']
  const c = COND[lot.condition_grade] || COND['Fair']
  const img = lot.image_urls?.[0]
  const tl = timeLeft(lot.auction_end_time)
  const spread = lot.current_bid > 0 && lot.market_price_low
    ? Math.round((lot.market_price_low / lot.current_bid - 1) * 100)
    : null
  const isHighlight = lot.deal_score >= 75
  const isSaved = savedIds.has(lot.id)

  async function handleSaveToggle(e) {
    e.preventDefault()
    e.stopPropagation()
    setSaving(true)
    try {
      const method = isSaved ? 'DELETE' : 'POST'
      await fetch(`${API}/lots/${lot.id}/save`, { method })
      onSaveToggle(lot.id, !isSaved)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '88px 1fr',
      borderBottom: '1px solid #252923',
      borderLeft: isHighlight ? '3px solid #e8a020' : '3px solid transparent',
      transition: 'background 0.1s', background: 'transparent',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#161a15'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        background: '#0d0f0c', borderRight: '1px solid #252923',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', minHeight: 90, overflow: 'hidden',
      }}>
        {img
          ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.85 }} onError={e => e.target.style.display='none'} />
          : <svg width="32" height="32" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.2 }}>
              <rect x="4" y="10" width="28" height="18" rx="2" stroke="#dde0d8" strokeWidth="1.5"/>
              <circle cx="11" cy="26" r="3" stroke="#dde0d8" strokeWidth="1.5"/>
              <circle cx="25" cy="26" r="3" stroke="#dde0d8" strokeWidth="1.5"/>
              <path d="M4 16h28" stroke="#dde0d8" strokeWidth="1"/>
            </svg>
        }
        <div style={{
          position: 'absolute', bottom: 5, left: 5,
          background: 'rgba(0,0,0,0.85)', fontFamily: 'var(--mono)',
          fontSize: 12, fontWeight: 500, padding: '2px 5px', borderRadius: 2,
          color: scoreColor(lot.deal_score),
        }}>
          {lot.deal_score}
        </div>
      </div>

      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: '#dde0d8', lineHeight: 1.3, marginBottom: 4,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.01em',
        }}>
          {lot.title.length > 80 ? lot.title.slice(0, 80) + '…' : lot.title}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 2, background: c.bg, color: c.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {lot.condition_grade}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 2, background: v.bg, color: v.color, border: `1px solid ${v.border}`, letterSpacing: '0.04em' }}>
            {lot.verdict}
          </span>
          <span style={{ fontSize: 10, color: '#6b6f67' }}>{lot.location}</span>
          {tl && <span style={{ fontSize: 10, color: tl.urgent ? '#f87171' : '#6b6f67' }}>{tl.urgent ? '⚑ ' : ''}{tl.text === 'Ended' ? 'ENDED' : `ends ${tl.text}`}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span>
            <span style={{ fontSize: 9, color: '#6b6f67', fontFamily: 'var(--mono)', marginRight: 3 }}>BID</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: lot.current_bid === 0 ? '#e8a020' : '#dde0d8' }}>
              {lot.current_bid === 0 ? 'No bids' : fmt(lot.current_bid)}
            </span>
          </span>
          <span>
            <span style={{ fontSize: 9, color: '#6b6f67', fontFamily: 'var(--mono)', marginRight: 3 }}>MKT</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#22c55e' }}>{fmt(lot.market_price_low)}–{fmt(lot.market_price_high)}</span>
          </span>
          {spread != null && spread > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '1px 5px', borderRadius: 2 }}>
              +{spread}%
            </span>
          )}
        </div>

        <div style={{ fontSize: 10, color: '#9a9e96', lineHeight: 1.45, fontStyle: 'italic', borderLeft: '2px solid #e8a020', paddingLeft: 6, marginBottom: 5 }}>
          {lot.commentary?.length > 140 && !expanded ? lot.commentary.slice(0, 140) + '…' : lot.commentary}
        </div>

        {expanded && lot.watch_points?.length > 0 && (
          <div style={{ marginBottom: 5 }}>
            {lot.watch_points.map((wp, i) => (
              <div key={i} style={{ fontSize: 10, color: '#fbbf24', padding: '2px 0', display: 'flex', gap: 5 }}>
                <span style={{ flexShrink: 0 }}>⚠</span><span>{wp}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#6b6f67', border: '0.5px solid #2a2e29', padding: '1px 5px', borderRadius: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {lot.platform_name}
          </span>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: '0.5px solid #2a2e29', color: '#6b6f67', fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}>
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={handleSaveToggle} disabled={saving} title={isSaved ? 'Remove from saved' : 'Save this lot'} style={{
            background: isSaved ? 'rgba(232,160,32,0.15)' : 'transparent',
            border: `0.5px solid ${isSaved ? '#e8a020' : '#2a2e29'}`,
            color: isSaved ? '#e8a020' : '#6b6f67',
            fontFamily: 'var(--mono)', fontSize: 11, padding: '2px 7px', borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {isSaved ? '★' : '☆'}
          </button>
          <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{
            marginLeft: 'auto', fontSize: 10, background: '#e8a020', color: '#0b0d0c',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.05em',
            padding: '3px 8px', borderRadius: 2, textDecoration: 'none',
          }}>
            BID →
          </a>
        </div>
      </div>
    </div>
  )
}

const TICKER_ITEMS = ['BIDSPOTTER UK', 'EAMA GROUP', 'UNIVERSAL AUCTIONS', 'GATEWAY AUCTIONS', 'NCM AUCTIONS', 'DUNN BROS', 'EURO AUCTIONS', 'RITCHIE BROS']

const ACTIVITY = [
  { time: 'just now', text: 'Scraper complete — 369 lots processed, 281 new analyses' },
  { time: '20m ago', text: 'Agent scored 2024 JCB 531-70 Telehandler: 95/100 Strong Buy' },
  { time: '40m ago', text: 'Bidspotter scan — 572 relevant listings across 19 auctioneers' },
  { time: '1h ago', text: 'Agent scored 2022 JCB 8008CTS 840hrs: 85/100 Strong Buy' },
  { time: '1h ago', text: 'Agent scored unused 2025 JPC KV12 Mini Excavator: 92/100' },
  { time: '2h ago', text: 'Scheduler triggered automatic rescan of all platforms' },
]

export default function App() {
  const [lots, setLots] = useState([])
  const [savedLots, setSavedLots] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [error, setError] = useState(null)
  const [minScore, setMinScore] = useState(0)
  const [verdictFilter, setVerdictFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('score')

  useEffect(() => {
    fetch(`${API}/lots/?limit=200`)
      .then(r => r.json())
      .then(data => { setLots(data.lots || []); setLoading(false) })
      .catch(() => { setError('Could not load lots'); setLoading(false) })

    fetch(`${API}/saved-lots`)
      .then(r => r.json())
      .then(data => {
        const sl = data.lots || []
        setSavedLots(sl)
        setSavedIds(new Set(sl.map(l => l.id)))
      })
  }, [])

  function handleSaveToggle(lotId, nowSaved) {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (nowSaved) next.add(lotId)
      else next.delete(lotId)
      return next
    })
    if (nowSaved) {
      const lot = lots.find(l => l.id === lotId)
      if (lot) setSavedLots(prev => [lot, ...prev.filter(l => l.id !== lotId)])
    } else {
      setSavedLots(prev => prev.filter(l => l.id !== lotId))
    }
  }

  const categories = useMemo(() => {
    const cats = [...new Set(lots.map(l => l.category).filter(Boolean))]
    return ['All', ...cats.sort()]
  }, [lots])

  const filtered = useMemo(() => {
    const source = activeTab === 'saved' ? savedLots : lots
    let out = source.filter(l => {
      if (l.deal_score < minScore) return false
      if (verdictFilter !== 'All' && l.verdict !== verdictFilter) return false
      if (categoryFilter !== 'All' && l.category !== categoryFilter) return false
      return true
    })
    if (sortBy === 'score') out = [...out].sort((a, b) => b.deal_score - a.deal_score)
    if (sortBy === 'margin') out = [...out].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))
    if (sortBy === 'ending') out = [...out].sort((a, b) => new Date(a.auction_end_time) - new Date(b.auction_end_time))
    if (sortBy === 'bid') out = [...out].sort((a, b) => a.current_bid - b.current_bid)
    return out
  }, [lots, savedLots, activeTab, minScore, verdictFilter, categoryFilter, sortBy])

  const stats = useMemo(() => ({
    total: lots.length,
    strongBuy: lots.filter(l => l.verdict === 'Strong Buy').length,
    avgScore: lots.length ? Math.round(lots.reduce((s, l) => s + l.deal_score, 0) / lots.length) : 0,
  }), [lots])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d0c', color: '#dde0d8', fontFamily: "'Barlow', sans-serif" }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', height: 48, borderBottom: '1px solid #252923', background: 'rgba(11,13,12,0.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500, letterSpacing: '0.1em' }}>
          IRON<span style={{ color: '#e8a020' }}>WATCH</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#252923' }} />
        <div style={{ fontSize: 10, color: '#6b6f67', letterSpacing: '0.06em' }}>INDUSTRIAL SURPLUS INTELLIGENCE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 10, color: '#6b6f67', fontFamily: 'var(--mono)' }}>DEALER AGENT ACTIVE</span>
        </div>
        {!loading && <>
          <div style={{ width: 1, height: 16, background: '#252923' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#22c55e' }}>{stats.strongBuy} strong buy</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#60a5fa' }}>{stats.total} lots</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#e8a020' }}>★ {savedIds.size} saved</span>
        </>}
      </div>

      <div style={{ overflow: 'hidden', borderBottom: '1px solid #252923', background: '#0d0f0c', height: 26 }}>
        <div style={{ display: 'inline-flex', gap: 32, padding: '5px 16px', animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3a3e38' }}>
              {t} — <span style={{ color: '#e8a020' }}>LIVE</span>
            </span>
          ))}
        </div>
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #252923', background: '#0d0f0c' }}>
          {[
            { label: 'LOTS TRACKED', value: stats.total, sub: 'live from Bidspotter', color: '#dde0d8' },
            { label: 'STRONG BUYS', value: stats.strongBuy, sub: 'score ≥ 80', color: '#22c55e' },
            { label: 'AVG DEAL SCORE', value: stats.avgScore, sub: 'across all lots', color: '#e8a020' },
            { label: 'SAVED LOTS', value: savedIds.size, sub: 'in your watchlist', color: '#60a5fa' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '10px 16px', borderRight: i < 3 ? '1px solid #252923' : 'none' }}>
              <div style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 10, color: '#3a3e38', marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', minHeight: 'calc(100vh - 160px)' }}>
        <div style={{ borderRight: '1px solid #252923' }}>

          <div style={{ display: 'flex', borderBottom: '1px solid #252923', background: '#0d0f0c' }}>
            {[{ key: 'all', label: 'ALL LOTS' }, { key: 'saved', label: `★ SAVED (${savedIds.size})` }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: activeTab === tab.key ? '#0b0d0c' : 'transparent',
                border: 'none', borderBottom: activeTab === tab.key ? '2px solid #e8a020' : '2px solid transparent',
                color: activeTab === tab.key ? '#e8a020' : '#6b6f67',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
                padding: '10px 16px', cursor: 'pointer', transition: 'all 0.1s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #252923', background: '#0d0f0c', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.06em' }}>VERDICT:</span>
            {['All', 'Strong Buy', 'Buy', 'Watch', 'Pass'].map(v => <Chip key={v} active={verdictFilter === v} onClick={() => setVerdictFilter(v)}>{v}</Chip>)}
            <div style={{ width: 1, height: 14, background: '#252923' }} />
            <span style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.06em' }}>SORT:</span>
            {[{ v: 'score', l: 'Score' }, { v: 'margin', l: 'Margin' }, { v: 'ending', l: 'Ending' }, { v: 'bid', l: 'Low bid' }].map(s => <Chip key={s.v} active={sortBy === s.v} onClick={() => setSortBy(s.v)}>{s.l}</Chip>)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 9, color: '#6b6f67', fontFamily: 'var(--mono)' }}>MIN: <span style={{ color: scoreColor(minScore) }}>{minScore}</span></span>
              <input type="range" min="0" max="95" step="5" value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ width: 80, accentColor: '#e8a020' }} />
            </div>
          </div>

          {activeTab === 'all' && (
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', borderBottom: '1px solid #252923', background: '#0b0d0c', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.06em', alignSelf: 'center' }}>CAT:</span>
              {categories.map(cat => <Chip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat.toUpperCase()}</Chip>)}
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#3a3e38', fontFamily: 'var(--mono)', alignSelf: 'center' }}>{filtered.length} lots</span>
            </div>
          )}

          {loading && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: '#3a3e38', letterSpacing: '0.1em' }}>SCANNING AUCTIONS...</div>}
          {error && <div style={{ margin: 16, padding: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171' }}>{error}</div>}
          {!loading && activeTab === 'saved' && savedIds.size === 0 && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: '#3a3e38', letterSpacing: '0.08em' }}>NO SAVED LOTS YET — CLICK ☆ ON ANY LOT TO SAVE IT</div>}
          {!loading && filtered.length === 0 && !(activeTab === 'saved' && savedIds.size === 0) && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: '#3a3e38', letterSpacing: '0.08em' }}>NO LOTS MATCH FILTERS</div>}
          {!loading && filtered.map(lot => <LotCard key={lot.id} lot={lot} savedIds={savedIds} onSaveToggle={handleSaveToggle} />)}
        </div>

        <div style={{ background: '#0d0f0c' }}>
          <div style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.08em', padding: '10px 12px', borderBottom: '1px solid #252923' }}>AGENT ACTIVITY LOG</div>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{ padding: '8px 12px', borderBottom: '0.5px solid #1a1e19' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#3a3e38', marginBottom: 2 }}>{a.time}</div>
              <div style={{ fontSize: 11, color: '#6b6f67', lineHeight: 1.4 }}>{a.text}</div>
            </div>
          ))}
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 9, color: '#6b6f67', letterSpacing: '0.08em', padding: '10px 12px', borderBottom: '1px solid #252923', borderTop: '1px solid #252923' }}>SAVED LOTS ({savedIds.size})</div>
          {savedLots.length === 0
            ? <div style={{ padding: '12px', fontSize: 10, color: '#3a3e38', fontFamily: 'var(--mono)' }}>None saved yet</div>
            : savedLots.slice(0, 5).map(lot => (
              <div key={lot.id} style={{ padding: '6px 12px', borderBottom: '0.5px solid #1a1e19', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9e96', lineHeight: 1.3 }}>{lot.title.length > 35 ? lot.title.slice(0, 35) + '…' : lot.title}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: scoreColor(lot.deal_score), marginTop: 1 }}>{lot.deal_score}/100 · {lot.verdict}</div>
                </div>
                <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#e8a020', fontFamily: 'var(--mono)', border: '0.5px solid rgba(232,160,32,0.3)', padding: '2px 5px', borderRadius: 2, whiteSpace: 'nowrap', textDecoration: 'none' }}>BID →</a>
              </div>
            ))
          }
        </div>
      </div>

      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}} :root{--mono:'IBM Plex Mono',monospace;}`}</style>
    </div>
  )
}

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#e8a020' : 'transparent',
      border: `0.5px solid ${active ? '#e8a020' : '#2a2e29'}`,
      color: active ? '#0b0d0c' : '#6b6f67',
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: active ? 700 : 400,
      fontSize: 10, letterSpacing: '0.04em',
      padding: '3px 8px', borderRadius: 2, cursor: 'pointer', transition: 'all 0.1s',
    }}>
      {children}
    </button>
  )
}
