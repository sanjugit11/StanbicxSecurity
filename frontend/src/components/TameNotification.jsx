import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X, MessageCircle, Shield, Bell } from 'lucide-react'

// TAME = Toast · Alert · Message · Error

const NotifCtx = createContext(null)

const STYLES = {
  success:  { bg:'rgba(34,197,94,0.08)',   border:'rgba(34,197,94,0.3)',   icon:'#22c55e', bar:'#22c55e', Icon: CheckCircle2  },
  error:    { bg:'rgba(239,68,68,0.08)',    border:'rgba(239,68,68,0.3)',    icon:'#ef4444', bar:'#ef4444', Icon: AlertCircle   },
  warning:  { bg:'rgba(245,158,11,0.08)',   border:'rgba(245,158,11,0.3)',   icon:'#f59e0b', bar:'#f59e0b', Icon: AlertCircle   },
  info:     { bg:'rgba(99,102,241,0.08)',   border:'rgba(99,102,241,0.3)',   icon:'#818cf8', bar:'#6366f1', Icon: Info          },
  telegram: { bg:'rgba(38,119,178,0.08)',   border:'rgba(43,159,216,0.35)', icon:'#2b9fd8', bar:'#2b9fd8', Icon: MessageCircle },
  security: { bg:'rgba(99,102,241,0.08)',   border:'rgba(99,102,241,0.3)',   icon:'#818cf8', bar:'#6366f1', Icon: Shield        },
  kyc:      { bg:'rgba(245,158,11,0.08)',   border:'rgba(245,158,11,0.3)',   icon:'#f59e0b', bar:'#f59e0b', Icon: Bell          },
}

function Toast({ notif, onDismiss }) {
  const [show, setShow]   = useState(false)
  const [exit, setExit]   = useState(false)
  const timerRef          = useRef(null)
  const { type='info', title, message, duration=5000, otp } = notif
  const s = STYLES[type] || STYLES.info
  const { Icon } = s

  const dismiss = useCallback(() => {
    setExit(true)
    setTimeout(() => onDismiss(notif.id), 320)
  }, [notif.id, onDismiss])

  useEffect(() => {
    requestAnimationFrame(() => setShow(true))
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration)
    }
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div style={{
      transform: show && !exit ? 'translateX(0) scale(1)' : 'translateX(112%) scale(0.94)',
      opacity:   show && !exit ? 1 : 0,
      transition: 'all 0.32s cubic-bezier(0.4,0,0.2,1)',
      background: '#0f0f18',
      border:    `1px solid ${s.border}`,
      borderRadius: 16,
      padding:  '16px 18px',
      display:  'flex',
      gap:       12,
      alignItems: 'flex-start',
      maxWidth:  380,
      width:    '100%',
      boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: s.bar, borderRadius:'16px 0 0 16px' }} />

      {/* Icon badge */}
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: s.bg, display:'flex', alignItems:'center', justifyContent:'center',
        border: `1px solid ${s.border}`,
      }}>
        <Icon size={17} color={s.icon} />
      </div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        {title && <div style={{ fontSize:14, fontWeight:700, color:'#f0f0ff', marginBottom:3, lineHeight:1.3 }}>{title}</div>}
        {message && <div style={{ fontSize:13, color:'#8b8ba8', lineHeight:1.5 }}>{message}</div>}

        {/* Telegram OTP preview bubble */}
        {otp && (
          <div style={{
            marginTop:10,
            background:'rgba(43,159,216,0.07)',
            border:'1px solid rgba(43,159,216,0.22)',
            borderRadius:10, padding:'10px 12px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{
              width:34, height:34, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#2b9fd8,#1a6fa8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:15, fontWeight:800, color:'#fff',
            }}>S</div>
            <div>
              <div style={{ fontSize:11, color:'#2b9fd8', fontWeight:700, marginBottom:2 }}>@StanbicXBot</div>
              <div style={{ fontSize:12, color:'#c8c8e0' }}>
                Your OTP:{' '}
                <span style={{ fontFamily:'JetBrains Mono,monospace', color:'#fff', fontWeight:700, letterSpacing:3, fontSize:14 }}>{otp}</span>
              </div>
              <div style={{ fontSize:10, color:'#4a4a65', marginTop:3 }}>Valid for 10 minutes · Do not share</div>
            </div>
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button onClick={dismiss} style={{ background:'none', border:'none', cursor:'pointer', color:'#4a4a65', padding:2, flexShrink:0, lineHeight:1 }}>
        <X size={14} />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:2,
          background: s.bar,
          transformOrigin:'left',
          animation: `tame-shrink ${duration}ms linear forwards`,
        }} />
      )}
    </div>
  )
}

export function TameProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((notif) => {
    const id = `tame_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    setToasts(prev => [...prev, { ...notif, id }])
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <NotifCtx.Provider value={{ push, dismiss }}>
      {children}
      {createPortal(
        <>
          <style>{`@keyframes tame-shrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
          <div style={{
            position:'fixed', top:20, right:20, zIndex:9999,
            display:'flex', flexDirection:'column', gap:10,
            pointerEvents:'none', width: 'min(380px, calc(100vw - 40px))',
          }}>
            {toasts.map(t => (
              <div key={t.id} style={{ pointerEvents:'auto' }}>
                <Toast notif={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </NotifCtx.Provider>
  )
}

export const useTame = () => {
  const ctx = useContext(NotifCtx)
  if (!ctx) throw new Error('useTame must be used inside <TameProvider>')
  return ctx
}
