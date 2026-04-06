import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

const API = 'https://ironwatch-3906.onrender.com/api/v1'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const VERDICT = {
  'Strong Buy': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)' },
  'Buy':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.4)' },
  'Watch':      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)' },
  'Pass':       { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)' },
}
const COND = {
  'Excellent': { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  'Good':      { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  'Fair':      { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  'Poor':      { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  'Scrap':     { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
}

function timeLeft(iso) {
  if (!iso) return null
  const diff = new Date(iso) - new Date()
  if (diff <= 0) return { text: 'Ended', urgent: false }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const urgent = d === 0 && h < 6
  if (d > 0) return { text: `${d}d ${h}h`, urgent: false }
  if (h > 0) return { text: `${h}h ${m}m`, urgent }
  return { text: `${m}m`, urgent: true }
}
function fmt(n) { return n == null ? '—' : '£' + Math.round(n).toLocaleString('en-GB') }
function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 65) return '#60a5fa'
  if (s >= 50) return '#fbbf24'
  return '#f87171'
}

const DEALER_SYSTEM = `You are a blunt, experienced UK industrial surplus dealer with 25 years in the trade. You buy and sell plant machinery, CNC machines, forklifts, compressors, generators and all kinds of industrial equipment at auction across the UK. You speak plainly and honestly — no corporate waffle. You are margin-focused and call it as you see it. You give practical, specific advice based on your real experience of the UK surplus market. You know what things sell for, what buyers want, and what to watch out for. Keep answers concise and punchy.`

function dealerPromptForLot(lot) {
  return `${DEALER_SYSTEM}

You are analysing this specific auction lot:

Title: ${lot.title}
Location: ${lot.location}
Current bid: ${lot.current_bid === 0 ? 'No bids yet' : fmt(lot.current_bid)}
Market value range: ${fmt(lot.market_price_low)} – ${fmt(lot.market_price_high)}
Deal score: ${lot.deal_score}/100
Verdict: ${lot.verdict}
Condition grade: ${lot.condition_grade}
Margin potential: ${lot.margin_pct ? Math.round(lot.margin_pct) + '%' : 'Unknown'}
Auction ends: ${lot.auction_end_time ? new Date(lot.auction_end_time).toLocaleDateString('en-GB') : 'Unknown'}
Platform: ${lot.platform_name}

Watch points flagged by the system:
${(lot.watch_points || []).map(w => '- ' + w).join('\n')}

The user wants your expert dealer's opinion. Be direct, practical and specific. Give them the real picture — the margin potential, what to inspect, what could go wrong, and whether you'd buy it yourself.`
}

const VALUATION_SYSTEM = `You are a blunt, experienced UK industrial surplus dealer with 25 years in the trade. You value industrial equipment from photographs. You speak plainly and honestly. You give specific GBP price estimates based on the UK surplus market. You identify make, model and approximate age from photos where possible. You tell the user what condition indicators you can see and what they should physically inspect. You give a realistic price range for what it would sell for at UK auction and what a dealer could retail it for.`

async function callAI(messages, systemPrompt) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || 'No response received.'
}

function ChatOverlay({ lot, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const system = dealerPromptForLot(lot)

  useEffect(() => {
    setLoading(true)
    callAI([{ role: 'user', content: 'Give me your honest dealer assessment of this lot. Would you buy it?' }], system)
      .then(text => {
        setMessages([
          { role: 'user', content: 'Give me your honest dealer assessment of this lot. Would you buy it?' },
          { role: 'assistant', content: text },
        ])
        setLoading(false)
      })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    const reply = await callAI(newMessages, system)
    setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  const v = VERDICT[lot.verdict] || VERDICT['Watch']
  const spread = lot.current_bid > 0 && lot.market_price_low
    ? Math.round((lot.market_price_low / lot.current_bid - 1) * 100) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0d0c', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #252923', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #252923', color: '#6b6f67', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, padding: '6px 12px', borderRadius: 3, cursor: 'pointer' }}>
          ← BACK
        </button>
        <div style={{ width: 1, height: 20, background: '#252923' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 600, color: '#dde0d8', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lot.title}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: scoreColor(lot.deal_score), fontWeight: 500 }}>{lot.deal_score}/100</span>
            <span style={{ fontSize: 11, color: v.color }}>{lot.verdict}</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6b6f67' }}>{fmt(lot.current_bid)} bid · MKT {fmt(lot.market_price_low)}–{fmt(lot.market_price_high)}</span>
            {spread != null && spread > 0 && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#22c55e' }}>+{spread}%</span>}
          </div>
        </div>
        <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{ background: '#e8a020', color: '#0b0d0c', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 3, textDecoration: 'none', letterSpacing: '0.05em', flexShrink: 0 }}>
          GO TO AUCTION →
        </a>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.length === 0 && loading && (
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#3a3e38', letterSpacing: '0.08em', paddingTop: 20 }}>
            DEALER IS ASSESSING THE LOT...
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: m.role === 'user' ? '#60a5fa' : '#e8a020', letterSpacing: '0.08em', marginBottom: 6 }}>
              {m.role === 'user' ? 'YOU' : 'DEALER AGENT'}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: m.role === 'user' ? '#9a9e96' : '#dde0d8', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3a3e38', letterSpacing: '0.08em' }}>
            THINKING...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #252923', padding: '12px 16px', display: 'flex', gap: 10, maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask the dealer anything about this lot..."
          style={{ flex: 1, background: '#161a15', border: '1px solid #2a2e29', borderRadius: 4, padding: '10px 14px', color: '#dde0d8', fontSize: 14, fontFamily: 'Barlow, sans-serif', outline: 'none' }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? '#1c211b' : '#e8a020', color: loading || !input.trim() ? '#3a3e38' : '#0b0d0c', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 4, border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s' }}>
          SEND
        </button>
      </div>
    </div>
  )
}

function ValuationTool({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState([])
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Right, let's have a look at what you've got. Upload some photos of the equipment — the more the better. Front, back, sides, any nameplate with the make and model, and any obvious wear or damage. I'll give you a straight valuation and tell you what to look out for.",
    }])
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const base64 = e.target.result.split(',')[1]
        const mediaType = file.type
        setImages(prev => [...prev, { base64, mediaType, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
  }

  async function send() {
    if ((!input.trim() && images.length === 0) || loading) return

    const content = []
    images.forEach(img => {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })
    })
    if (input.trim()) content.push({ type: 'text', text: input.trim() })
    if (content.length === 0) return

    const userMsg = { role: 'user', content }
    const displayMsg = { role: 'user', content: input.trim() || `[${images.length} photo${images.length > 1 ? 's' : ''} uploaded]`, images: images.map(i => i.name) }

    setMessages(prev => [...prev, displayMsg])
    setImages([])
    setInput('')
    setLoading(true)

    const apiMessages = [...messages
      .filter(m => m.role !== 'assistant' || typeof m.content === 'string')
      .map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content })),
      userMsg
    ]

    const reply = await callAI(apiMessages, VALUATION_SYSTEM)
    setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0d0c', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #252923', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #252923', color: '#6b6f67', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, padding: '6px 12px', borderRadius: 3, cursor: 'pointer' }}>
          ← BACK
        </button>
        <div style={{ width: 1, height: 20, background: '#252923' }} />
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 500, color: '#e8a020', letterSpacing: '0.08em' }}>VALUATION TOOL</div>
          <div style={{ fontSize: 11, color: '#6b6f67', marginTop: 1 }}>Upload photos for an instant dealer valuation</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: m.role === 'user' ? '#60a5fa' : '#e8a020', letterSpacing: '0.08em', marginBottom: 6 }}>
              {m.role === 'user' ? 'YOU' : 'DEALER AGENT'}
            </div>
            {m.images?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {m.images.map((name, j) => (
                  <span key={j} style={{ fontSize: 10, color: '#6b6f67', background: '#161a15', border: '1px solid #252923', padding: '3px 8px', borderRadius: 3, fontFamily: 'IBM Plex Mono, monospace' }}>📎 {name}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 14, lineHeight: 1.65, color: m.role === 'user' ? '#9a9e96' : '#dde0d8', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3a3e38', letterSpacing: '0.08em' }}>ASSESSING...</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #252923', padding: '12px 16px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {images.map((img, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#161a15', border: '1px solid #2a2e29', borderRadius: 3, padding: '3px 8px' }}>
                <span style={{ fontSize: 10, color: '#e8a020', fontFamily: 'IBM Plex Mono, monospace' }}>📎 {img.name}</span>
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#6b6f67', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={{ background: 'transparent', border: '1px solid #2a2e29', color: '#6b6f67', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, padding: '10px 14px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📎 PHOTO
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Describe the equipment or ask anything..."
            style={{ flex: 1, background: '#161a15', border: '1px solid #2a2e29', borderRadius: 4, padding: '10px 14px', color: '#dde0d8', fontSize: 14, fontFamily: 'Barlow, sans-serif', outline: 'none' }}
          />
          <button onClick={send} disabled={loading || (!input.trim() && images.length === 0)} style={{ background: loading ? '#1c211b' : '#e8a020', color: loading ? '#3a3e38' : '#0b0d0c', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 4, border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}

function LotCard({ lot, savedIds, onSaveToggle, onDeepDive }) {
  const [saving, setSaving] = useState(false)
  const v = VERDICT[lot.verdict] || VERDICT['Watch']
  const c = COND[lot.condition_grade] || COND['Fair']
  const img = lot.image_urls?.[0]
  const tl = timeLeft(lot.auction_end_time)
  const spread = lot.current_bid > 0 && lot.market_price_low
    ? Math.round((lot.market_price_low / lot.current_bid - 1) * 100) : null
  const isHighlight = lot.deal_score >= 75
  const isSaved = savedIds.has(lot.id)

  async function handleSaveToggle(e) {
    e.preventDefault(); e.stopPropagation()
    setSaving(true)
    try {
      await fetch(`${API}/lots/${lot.id}/save`, { method: isSaved ? 'DELETE' : 'POST' })
      onSaveToggle(lot.id, !isSaved)
    } catch(err) {}
    setSaving(false)
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr',
      borderBottom: '1px solid #1e2220',
      borderLeft: isHighlight ? '3px solid #e8a020' : '3px solid transparent',
      transition: 'background 0.1s', background: 'transparent',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#111413'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Image */}
      <div style={{ background: '#0d0f0c', borderRight: '1px solid #1e2220', position: 'relative', minHeight: 110, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img
          ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.9 }} onError={e => e.target.style.display='none'} />
          : <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.15 }}>
              <rect x="4" y="10" width="28" height="18" rx="2" stroke="#dde0d8" strokeWidth="1.5"/>
              <circle cx="11" cy="26" r="3" stroke="#dde0d8" strokeWidth="1.5"/>
              <circle cx="25" cy="26" r="3" stroke="#dde0d8" strokeWidth="1.5"/>
              <path d="M4 16h28" stroke="#dde0d8" strokeWidth="1"/>
            </svg>
        }
        <div style={{ position: 'absolute', bottom: 7, left: 7, background: 'rgba(0,0,0,0.9)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 500, padding: '3px 7px', borderRadius: 3, color: scoreColor(lot.deal_score), lineHeight: 1 }}>
          {lot.deal_score}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 600, color: '#e8e8e4', lineHeight: 1.3, letterSpacing: '0.01em' }}>
          {lot.title.length > 90 ? lot.title.slice(0, 90) + '…' : lot.title}
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 3, background: c.bg, color: c.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {lot.condition_grade}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 3, background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
            {lot.verdict}
          </span>
          <span style={{ fontSize: 12, color: '#7a7d76' }}>{lot.location}</span>
          {tl && (
            <span style={{ fontSize: 12, color: tl.urgent ? '#f87171' : '#5a5e58' }}>
              {tl.urgent ? '⚑ ' : ''}{tl.text === 'Ended' ? 'ENDED' : `ends ${tl.text}`}
            </span>
          )}
        </div>

        {/* Pricing row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 11, color: '#5a5e58', fontFamily: 'IBM Plex Mono, monospace', marginRight: 4 }}>BID</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 500, color: lot.current_bid === 0 ? '#e8a020' : '#e8e8e4' }}>
              {lot.current_bid === 0 ? 'No bids' : fmt(lot.current_bid)}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#5a5e58', fontFamily: 'IBM Plex Mono, monospace', marginRight: 4 }}>MKT</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#22c55e' }}>
              {fmt(lot.market_price_low)}–{fmt(lot.market_price_high)}
            </span>
          </div>
          {spread != null && spread > 0 && (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, background: 'rgba(34,197,94,0.12)', color: '#22c55e', padding: '3px 8px', borderRadius: 3, fontWeight: 500 }}>
              +{spread}%
            </span>
          )}
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: '#5a5e58', border: '0.5px solid #2a2e29', padding: '2px 6px', borderRadius: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {lot.platform_name}
          </span>
          <button onClick={handleSaveToggle} disabled={saving} style={{
            background: isSaved ? 'rgba(232,160,32,0.15)' : 'transparent',
            border: `1px solid ${isSaved ? '#e8a020' : '#2a2e29'}`,
            color: isSaved ? '#e8a020' : '#5a5e58',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 13,
            padding: '4px 10px', borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {isSaved ? '★' : '☆'}
          </button>
          <button onClick={() => onDeepDive(lot)} style={{
            background: 'transparent', border: '1px solid #2a2e29',
            color: '#9a9e96', fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 600, fontSize: 12, letterSpacing: '0.05em',
            padding: '5px 12px', borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8a020'; e.currentTarget.style.color = '#e8a020' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2e29'; e.currentTarget.style.color = '#9a9e96' }}
          >
            DEEP DIVE →
          </button>
          <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{
            marginLeft: 'auto', fontSize: 12, background: '#e8a020', color: '#0b0d0c',
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em',
            padding: '5px 14px', borderRadius: 3, textDecoration: 'none',
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
  { time: '40m ago', text: 'Bidspotter scan — 572 relevant listings, 19 auctioneers' },
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
  const [deepDiveLot, setDeepDiveLot] = useState(null)
  const [showValuation, setShowValuation] = useState(false)

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
    setSavedIds(prev => { const n = new Set(prev); nowSaved ? n.add(lotId) : n.delete(lotId); return n })
    if (nowSaved) {
      const lot = lots.find(l => l.id === lotId)
      if (lot) setSavedLots(prev => [lot, ...prev.filter(l => l.id !== lotId)])
    } else {
      setSavedLots(prev => prev.filter(l => l.id !== lotId))
    }
  }

  const categories = useMemo(() => ['All', ...[...new Set(lots.map(l => l.category).filter(Boolean))].sort()], [lots])

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

  if (deepDiveLot) return <ChatOverlay lot={deepDiveLot} onClose={() => setDeepDiveLot(null)} />
  if (showValuation) return <ValuationTool onClose={() => setShowValuation(false)} />

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d0c', color: '#dde0d8', fontFamily: 'Barlow, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', height: 52, borderBottom: '1px solid #1e2220', background: 'rgba(11,13,12,0.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 17, fontWeight: 500, letterSpacing: '0.1em' }}>
          IRON<span style={{ color: '#e8a020' }}>WATCH</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#1e2220' }} />
        <div style={{ fontSize: 11, color: '#5a5e58', letterSpacing: '0.06em' }}>INDUSTRIAL SURPLUS INTELLIGENCE</div>
        <button onClick={() => setShowValuation(true)} style={{
          marginLeft: 'auto', background: 'transparent',
          border: '1px solid #2a2e29', color: '#9a9e96',
          fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600,
          fontSize: 12, letterSpacing: '0.06em', padding: '6px 14px',
          borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8a020'; e.currentTarget.style.color = '#e8a020' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2e29'; e.currentTarget.style.color = '#9a9e96' }}
        >
          VALUATION TOOL
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#5a5e58', fontFamily: 'IBM Plex Mono, monospace' }}>AGENT ACTIVE</span>
        </div>
        {!loading && <>
          <div style={{ width: 1, height: 16, background: '#1e2220' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#22c55e' }}>{stats.strongBuy} strong buy</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#60a5fa' }}>{stats.total} lots</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#e8a020' }}>★ {savedIds.size}</span>
        </>}
      </div>

      {/* Ticker */}
      <div style={{ overflow: 'hidden', borderBottom: '1px solid #1e2220', background: '#0d0f0c', height: 28 }}>
        <div style={{ display: 'inline-flex', gap: 40, padding: '6px 16px', animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#2e3230' }}>
              {t} — <span style={{ color: '#e8a020' }}>LIVE</span>
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #1e2220', background: '#0d0f0c' }}>
          {[
            { label: 'LOTS TRACKED', value: stats.total, sub: 'live from Bidspotter', color: '#dde0d8' },
            { label: 'STRONG BUYS', value: stats.strongBuy, sub: 'score ≥ 80', color: '#22c55e' },
            { label: 'AVG DEAL SCORE', value: stats.avgScore, sub: 'across all lots', color: '#e8a020' },
            { label: 'SAVED LOTS', value: savedIds.size, sub: 'in your watchlist', color: '#60a5fa' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '12px 20px', borderRight: i < 3 ? '1px solid #1e2220' : 'none' }}>
              <div style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.08em', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 24, fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: '#2e3230', marginTop: 4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', minHeight: 'calc(100vh - 180px)' }}>
        <div style={{ borderRight: '1px solid #1e2220' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e2220', background: '#0d0f0c' }}>
            {[{ key: 'all', label: 'ALL LOTS' }, { key: 'saved', label: `★ SAVED (${savedIds.size})` }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: 'transparent', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #e8a020' : '2px solid transparent',
                color: activeTab === tab.key ? '#e8a020' : '#5a5e58',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
                padding: '12px 18px', cursor: 'pointer', transition: 'all 0.1s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #1e2220', background: '#0d0f0c', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.06em' }}>VERDICT:</span>
            {['All', 'Strong Buy', 'Buy', 'Watch', 'Pass'].map(v => <Chip key={v} active={verdictFilter === v} onClick={() => setVerdictFilter(v)}>{v}</Chip>)}
            <div style={{ width: 1, height: 16, background: '#1e2220' }} />
            <span style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.06em' }}>SORT:</span>
            {[{ v: 'score', l: 'Score' }, { v: 'margin', l: 'Margin' }, { v: 'ending', l: 'Ending' }, { v: 'bid', l: 'Low bid' }].map(s => <Chip key={s.v} active={sortBy === s.v} onClick={() => setSortBy(s.v)}>{s.l}</Chip>)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 10, color: '#5a5e58', fontFamily: 'IBM Plex Mono, monospace' }}>MIN: <span style={{ color: scoreColor(minScore) }}>{minScore}</span></span>
              <input type="range" min="0" max="95" step="5" value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ width: 90, accentColor: '#e8a020' }} />
            </div>
          </div>

          {activeTab === 'all' && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid #1e2220', background: '#0b0d0c', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.06em' }}>CAT:</span>
              {categories.map(cat => <Chip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat.toUpperCase()}</Chip>)}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#2e3230', fontFamily: 'IBM Plex Mono, monospace' }}>{filtered.length} lots</span>
            </div>
          )}

          {loading && <div style={{ padding: 60, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#2e3230', letterSpacing: '0.1em' }}>SCANNING AUCTIONS...</div>}
          {error && <div style={{ margin: 16, padding: 14, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#f87171' }}>{error}</div>}
          {!loading && activeTab === 'saved' && savedIds.size === 0 && <div style={{ padding: 60, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#2e3230', letterSpacing: '0.08em' }}>NO SAVED LOTS YET — CLICK ☆ ON ANY LOT TO SAVE IT</div>}
          {!loading && filtered.length === 0 && !(activeTab === 'saved' && savedIds.size === 0) && <div style={{ padding: 60, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#2e3230', letterSpacing: '0.08em' }}>NO LOTS MATCH FILTERS</div>}
          {!loading && filtered.map(lot => <LotCard key={lot.id} lot={lot} savedIds={savedIds} onSaveToggle={handleSaveToggle} onDeepDive={setDeepDiveLot} />)}
        </div>

        {/* Sidebar */}
        <div style={{ background: '#0d0f0c' }}>
          <div style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.08em', padding: '12px 14px', borderBottom: '1px solid #1e2220' }}>AGENT ACTIVITY LOG</div>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '0.5px solid #141714' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#2e3230', marginBottom: 3 }}>{a.time}</div>
              <div style={{ fontSize: 12, color: '#5a5e58', lineHeight: 1.45 }}>{a.text}</div>
            </div>
          ))}
          <div style={{ height: 12 }} />
          <div style={{ fontSize: 10, color: '#5a5e58', letterSpacing: '0.08em', padding: '12px 14px', borderBottom: '1px solid #1e2220', borderTop: '1px solid #1e2220' }}>SAVED LOTS ({savedIds.size})</div>
          {savedLots.length === 0
            ? <div style={{ padding: '14px', fontSize: 11, color: '#2e3230', fontFamily: 'IBM Plex Mono, monospace' }}>None saved yet</div>
            : savedLots.slice(0, 6).map(lot => (
              <div key={lot.id} style={{ padding: '8px 14px', borderBottom: '0.5px solid #141714', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#9a9e96', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lot.title}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: scoreColor(lot.deal_score), marginTop: 2 }}>{lot.deal_score}/100 · {lot.verdict}</div>
                </div>
                <a href={lot.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#e8a020', fontFamily: 'IBM Plex Mono, monospace', border: '0.5px solid rgba(232,160,32,0.3)', padding: '3px 6px', borderRadius: 2, whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0 }}>BID →</a>
              </div>
            ))
          }
          <div style={{ padding: '12px 14px', borderTop: '1px solid #1e2220', marginTop: 8 }}>
            <button onClick={() => setShowValuation(true)} style={{
              width: '100%', background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.25)',
              color: '#e8a020', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
              fontSize: 12, letterSpacing: '0.06em', padding: '10px', borderRadius: 3, cursor: 'pointer',
            }}>
              VALUATION TOOL →
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#e8a020' : 'transparent',
      border: `0.5px solid ${active ? '#e8a020' : '#2a2e29'}`,
      color: active ? '#0b0d0c' : '#5a5e58',
      fontFamily: 'Barlow Condensed, sans-serif', fontWeight: active ? 700 : 400,
      fontSize: 11, letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 3,
      cursor: 'pointer', transition: 'all 0.1s', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  )
}
