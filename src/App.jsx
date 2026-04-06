import { useState, useEffect, useMemo } from 'react'

const API = 'https://ironwatch-3906.onrender.com/api/v1/lots/'

const VERDICT = {
  'Strong Buy': { color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
  'Buy':        { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)'  },
  'Watch':      { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  'Pass':       { color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)'   },
}

const CONDITION = {
  'Excellent': { bg: '#0d2818', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  'Good':      { bg: '#0d2818', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  'Fair':      { bg: '#2a1f00', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  'Poor':      { bg: '#2a0a0a', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
  'Scrap':     { bg: '#2a0a0a', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
}

const CATEGORIES = ['All', 'excavator', 'telehandler', 'forklift', 'generator', 'plant', 'other']

const TICKER_ITEMS = [
  'BIDSPOTTER UK — live auction data',
  'EURO AUCTIONS — coming soon',
  'RITCHIE BROS — coming soon',
  'MASCUS — coming soon',
  'HILCO — coming soon',
  'Last scan: auto every 20 min',
]

function timeLeft(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate) - new Date()
  if (diff <= 0) return { text: 'Ended', urgent: false, ended: true }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const urgent = d === 0 && h < 6
  if (d > 0) return { text: `${d}d ${h}h`, urgent: false, ended: false }
  if (h > 0) return { text: `${h}h ${m}m`, urgent, ended: false }
  return { text: `${m}m`, urgent: true, ended: false }
}

function fmt(n) {
  if (n == null) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function scoreColor(s) {
  if (s >= 80) return 'var(--green)'
  if (s >= 65) return 'var(--blue)'
  if (s >= 50) return 'var(--amber)'
  return 'var(--red)'
}

function LotCard({ lot }) {
  const [expanded, setExpanded] = useState(false)
  const v = VERDICT[lot.verdict] || VERDICT['Watch']
  const cond = CONDITION[lot.condition_grade] || CONDITION['Fair']
  const img = lot.image_urls?.[0]
  const tl = timeLeft(lot.auction_end_time)
  const spread = lot.current_bid > 0 && lot.market_price_low
    ? Math.round((lot.market_price_low / lot.current_bid - 1) * 100)
    : null
  const isHighlight = lot.deal_score >= 80

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr',
      borderBottom: '1px solid var(--border)',
      borderLeft: isHighlight ? '3px solid var(--accent)' : '3px solid transparent',
      background: 'var(--card)', transition: 'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
    onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}
    >
      <div style={{
        background: '#0d0f0c', borderRight: '1px solid var(--border)',
        position: 'relative', minHeight: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {img ? (
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.85 }} onError={e => e.target.style.display='none'} />
        ) : (
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" style={{opacity:0.2}}>
            <rect x="4" y="10" width="28" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="11" cy="26" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="25" cy="26" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 16h28" stroke="currentColor" strokeWidth="1"/>
          </svg>
        )}
        <div style={{
          position: 'absolute', bottom: 5, left: 5, zIndex: 1,
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
          background: 'rgba(0,0,0,0.85)', color: scoreColor(lot.deal_score),
          padding: '2px 6px', borderRadius: 3, border: `1px solid ${scoreColor(lot.deal_score)}`, lineHeight: 1,
        }}>
          {lot.deal_score}
        </div>
      </div>

      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--head)', fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {lot.title.length > 68 ? lot.title.slice(0, 68) + '…' : lot.title}
          </div>
          <span style={{
            flexShrink: 0, background: v.bg, border: `1px solid ${v.border}`,
            color: v.color, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2, whiteSpace: 'nowrap',
          }}>
            {lot.verdict?.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 6px', borderRadius: 2,
            background: cond.bg, color: cond.color, border: `1px solid ${cond.border}`,
          }}>
            {lot.condition_grade?.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{lot.location}</span>
          {tl && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)',
              color: tl.ended ? 'var(--red)' : tl.urgent ? 'var(--amber)' : 'var(--muted)',
            }}>
              {tl.urgent && !tl.ended ? '⚑ ' : ''}{tl.ended ? 'ENDED' : `ends ${tl.text}`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', marginRight: 3 }}>BID</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, color: lot.current_bid === 0 ? 'var(--accent)' : 'var(--text)' }}>
              {lot.current_bid === 0 ? 'No bids' : fmt(lot.current_bid)}
            </span>
          </span>
          <span>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', marginRight: 3 }}>MARKET</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>
              {fmt(lot.market_price_low)}–{fmt(lot.market_price_high)}
            </span>
          </span>
          {spread !== null && spread > 0 && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
              background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
              border: '1px solid rgba(34,197,94,0.25)', padding: '1px 5px', borderRadius: 2,
            }}>
              +{spread}%
            </span>
          )}
        </div>

        {lot.commentary && (
          <div style={{
            fontSize: 10, color: '#a0a49c', lineHeight: 1.5,
            borderLeft: '2px solid var(--accent)', paddingLeft: 6,
            fontStyle: 'italic', marginBottom: 6,
          }}>
            "{lot.commentary.length > 140 && !expanded ? lot.commentary.slice(0, 140) + '…' : lot.commentary}"
          </div>
        )}

        {expanded && lot.watch_points?.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            {lot.watch_points.map((wp, i) => (
              <div key={i} style={{ fontSize: 10, color: 'var(--amber)', display: 'flex', gap: 4, padding: '2px 0', lineHeight: 1.4 }}>
                <span style={{ flexShrink: 0 }}>⚠</span><span>{wp}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2, letterSpacing: '0.04em' }}>
            {lot.platform_name?.toUpperCase()}
          </span>
          {lot.year_of_manufacture && (
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2 }}>
              {lot.year_of_manufacture}
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 9,
            padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
          }}>
            {expanded ? '▲ LESS' : '▼ MORE'}
          </button>
          <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{
            marginLeft: 'auto', background: 'var(--accent)', color: '#0b0d0c',
            fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
            padding: '3px 8px', borderRadius: 2, letterSpacing: '0.06em',
          }}>
            BID →
          </a>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10, padding: '3px 9px',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-light)'}`,
      borderRadius: 3, cursor: 'pointer',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#0b0d0c' : 'var(--muted)',
      fontFamily: 'var(--mono)', fontWeight: active ? 700 : 400,
      letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.1s',
    }}>
      {label}
    </button>
  )
}

const ACTIVITY_LOG = [
  { time: 'Now',  text: 'Dealer agent scoring live lots from Bidspotter UK' },
  { time: '20m',  text: 'Scraper run complete — lots indexed and scored' },
  { time: '40m',  text: 'Previous scraper run complete' },
  { time: '1h',   text: 'Scheduler triggered automatic scan' },
]

export default function App() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [minScore, setMinScore] = useState(0)
  const [verdictFilter, setVerdictFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('score')

  useEffect(() => {
    fetch(`${API}?limit=200`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => { setLots(data.lots || []); setLoading(false) })
      .catch(e => { setError('Could not reach API — ' + e.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let out = lots.filter(l => {
      if (l.deal_score < minScore) return false
      if (verdictFilter !== 'All' && l.verdict !== verdictFilter) return false
      if (categoryFilter !== 'All' && l.category !== categoryFilter) return false
      return true
    })
    if (sortBy === 'score')  out = [...out].sort((a, b) => b.deal_score - a.deal_score)
    if (sortBy === 'margin') out = [...out].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))
    if (sortBy === 'ending') out = [...out].sort((a, b) => new Date(a.auction_end_time) - new Date(b.auction_end_time))
    if (sortBy === 'bid')    out = [...out].sort((a, b) => a.current_bid - b.current_bid)
    return out
  }, [lots, minScore, verdictFilter, categoryFilter, sortBy])

  const stats = useMemo(() => ({
    total: lots.length,
    strongBuy: lots.filter(l => l.deal_score >= 80).length,
    avgScore: lots.length ? Math.round(lots.reduce((s, l) => s + l.deal_score, 0) / lots.length) : 0,
    noBids: lots.filter(l => l.current_bid === 0).length,
  }), [lots])

  const tickerDouble = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        borderBottom: '1px solid var(--border)', padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12, height: 46,
        background: 'rgba(11,13,12,0.97)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500, letterSpacing: '0.1em' }}>
          IRON<span style={{ color: 'var(--accent)' }}>WATCH</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>
          INDUSTRIAL SURPLUS INTELLIGENCE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>DEALER AGENT ACTIVE</span>
        </div>
      </div>

      <div style={{ overflow: 'hidden', borderBottom: '1px solid var(--border)', background: 'var(--surface)', height: 26, display: 'flex', alignItems: 'center' }}>
        <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
        <div style={{
          display: 'flex', gap: 32, whiteSpace: 'nowrap',
          animation: 'ticker 30s linear infinite',
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
        }}>
          {tickerDouble.map((item, i) => (
            <span key={i}>
              {item.includes('—') ? (
                <><span style={{ color: 'var(--text)' }}>{item.split('—')[0]}</span><span style={{ color: 'var(--accent)' }}>—</span><span>{item.split('—')[1]}</span></>
              ) : item}
              <span style={{ marginLeft: 32, color: 'var(--faint)' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'LOTS TRACKED',  value: stats.total,    color: 'var(--text)',   sub: 'Bidspotter UK' },
            { label: 'SCORE ≥ 80',    value: stats.strongBuy, color: 'var(--green)',  sub: 'strong buy signals' },
            { label: 'AVG DEAL SCORE',value: stats.avgScore,  color: 'var(--accent)', sub: 'across all lots' },
            { label: 'NO BIDS YET',   value: stats.noBids,    color: 'var(--blue)',   sub: 'open floor lots' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--surface)', padding: '10px 16px' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', flex: 1 }}>

        <div style={{ borderRight: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', gap: 8, padding: '8px 12px', flexWrap: 'wrap',
            borderBottom: '1px solid var(--border)', background: 'var(--surface)', alignItems: 'center',
            position: 'sticky', top: 46, zIndex: 50,
          }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>VERDICT</span>
            {['All', 'Strong Buy', 'Buy', 'Watch', 'Pass'].map(v => (
              <Chip key={v} label={v.toUpperCase()} active={verdictFilter === v} onClick={() => setVerdictFilter(v)} />
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>CAT</span>
            {CATEGORIES.map(c => (
              <Chip key={c} label={c.toUpperCase()} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
            ))}
          </div>

          <div style={{
            display: 'flex', gap: 8, padding: '6px 12px', alignItems: 'center',
            borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>SORT</span>
            {[{v:'score',l:'TOP SCORE'},{v:'margin',l:'MARGIN %'},{v:'ending',l:'ENDING SOON'},{v:'bid',l:'LOWEST BID'}].map(s => (
              <Chip key={s.v} label={s.l} active={sortBy === s.v} onClick={() => setSortBy(s.v)} />
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                MIN SCORE: <span style={{ color: scoreColor(minScore) }}>{minScore}</span>
              </span>
              <input type="range" min="0" max="95" step="5" value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                style={{ width: 80, accentColor: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{filtered.length} lots</span>
          </div>

          <div>
            {loading && <div style={{ padding: '60px 16px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>SCANNING AUCTIONS...</div>}
            {error && <div style={{ margin: 16, padding: 12, background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 4, color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>{error}</div>}
            {!loading && !error && filtered.length === 0 && <div style={{ padding: '60px 16px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>NO LOTS MATCH FILTERS</div>}
            {!loading && !error && filtered.map(lot => <LotCard key={lot.id} lot={lot} />)}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 8 }}>AGENT ACTIVITY</div>
            {ACTIVITY_LOG.map((a, i) => (
              <div key={i} style={{ paddingBottom: 8, borderBottom: i < ACTIVITY_LOG.length-1 ? '1px solid var(--border)' : 'none', marginBottom: i < ACTIVITY_LOG.length-1 ? 8 : 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>{a.time} ago</div>
                <div style={{ fontSize: 10, color: '#a0a49c', lineHeight: 1.4 }}>{a.text}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 8 }}>WATCHLISTS</div>
            {[
              { name: 'Excavators',   cat: 'excavator'  },
              { name: 'Telehandlers', cat: 'telehandler' },
              { name: 'Generators',   cat: 'generator'  },
              { name: 'Forklifts',    cat: 'forklift'   },
            ].map(w => {
              const count = lots.filter(l => l.category === w.cat && l.deal_score >= 75).length
              return (
                <div key={w.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text)' }}>{w.name}</span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                    background: count > 0 ? 'rgba(232,160,32,0.15)' : 'var(--surface)',
                    color: count > 0 ? 'var(--accent)' : 'var(--muted)',
                    border: `1px solid ${count > 0 ? 'rgba(232,160,32,0.3)' : 'var(--border)'}`,
                    padding: '1px 6px', borderRadius: 2,
                  }}>{count > 0 ? `${count} deals` : '—'}</span>
                </div>
              )
            })}
          </div>

          {!loading && !error && lots.length > 0 && (() => {
            const top = [...lots].sort((a, b) => b.deal_score - a.deal_score)[0]
            return (
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', marginBottom: 8 }}>TOP DEAL RIGHT NOW</div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--accent)', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color: 'var(--green)', marginBottom: 4 }}>{top.deal_score}/100</div>
                  <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.3, marginBottom: 6 }}>{top.title.length > 50 ? top.title.slice(0, 50) + '…' : top.title}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', marginBottom: 8 }}>{fmt(top.market_price_low)}–{fmt(top.market_price_high)} market</div>
                  <a href={top.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', textAlign: 'center', background: 'var(--accent)', color: '#0b0d0c',
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                    padding: '5px', borderRadius: 3, letterSpacing: '0.06em',
                  }}>VIEW LOT →</a>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
