import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Send, Lock, ArrowRight, Smartphone, MessageCircle } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification, setOnboarding } from '../services/storageService'

// Generate a random 6-digit OTP (stored in sessionStorage for demo verification)
const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

export default function Login() {
  const navigate    = useNavigate()
  const { push }    = useTame()
  const [identifier, setIdentifier] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleSend = async () => {
    const val = identifier.trim()
    if (!val) { setError('Enter your Telegram username or phone number'); return }
    if (val.startsWith('@') && val.length < 4) { setError('Username too short'); return }
    setError('')
    setLoading(true)

    await new Promise(r => setTimeout(r, 1100))   // simulated network delay

    // Generate OTP and store for verification
    const otp = genOTP()
    sessionStorage.setItem('sxs_identifier', val)
    sessionStorage.setItem('sxs_otp',        otp)
    sessionStorage.setItem('sxs_otp_mode',   'signin')
    sessionStorage.setItem('sxs_otp_ts',     Date.now().toString())

    // Persist notification
    addNotification({ type:'telegram', title:'OTP Sent via Telegram', message:`Verification code dispatched to ${val}` })

    // Show TAME toast with OTP preview (demo mode)
    push({
      type: 'telegram',
      title: 'OTP Sent via Telegram',
      message: `Demo mode: your code is shown below`,
      otp,
      duration: 20000,
    })

    setLoading(false)
    navigate('/otp')
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSend() }

  return (
    <div className="page">
      <div className="card animate-in">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="icon-badge" style={{ margin:'0 auto 20px' }}>
            <ShieldCheck size={30} color="#fff" />
          </div>
          <h1 className="page-title">StanbicX Security</h1>
          <p className="page-subtitle">Multi-layered Authentication System</p>
        </div>

        {/* Steps indicator */}
        <div className="steps">
          {['Telegram','OTP','Passcode','Biometrics'].map((s, i) => (
            <div key={s} className={`step-item ${i === 0 ? 'active' : ''}`}>
              <div className="step-circle">{i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Telegram info banner */}
        <div style={{
          display:'flex', gap:10, alignItems:'flex-start',
          background:'rgba(43,159,216,0.07)', border:'1px solid rgba(43,159,216,0.2)',
          borderRadius:12, padding:'12px 14px', marginBottom:20,
        }}>
          <MessageCircle size={17} color="#2b9fd8" style={{ flexShrink:0, marginTop:1 }} />
          <p style={{ fontSize:12, color:'#8b8ba8', lineHeight:1.55 }}>
            An OTP will be sent to you via <strong style={{ color:'#2b9fd8' }}>@StanbicXBot</strong> on Telegram.
            Make sure you've started a conversation with the bot first.
          </p>
        </div>

        {/* Input */}
        <div className="input-group">
          <label className="label">Telegram Username / Phone Number</label>
          <div className="input-wrap">
            <span className="input-icon"><Smartphone size={17} /></span>
            <input
              id="telegram-input"
              className="input"
              type="text"
              placeholder="@username  or  +234XXXXXXXXXX"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
          {error && <p style={{ color:'var(--red)', fontSize:13, marginTop:8 }}>{error}</p>}
        </div>

        <button
          id="send-otp-btn"
          className="btn btn-primary"
          onClick={handleSend}
          disabled={loading}
          style={{ marginBottom:16 }}
        >
          {loading
            ? <><div className="loader" /> Sending OTP…</>
            : <><Send size={15} /> Send OTP via Telegram</>}
        </button>

        <div className="divider" />

        {/* Security info */}
        <div className="info-block">
          <Lock size={17} style={{ flexShrink:0, marginTop:1, color:'var(--accent-hover)' }} />
          <p>Protected by OTP · Passcode · Biometrics · SXS-ID. Enterprise-grade, end-to-end encrypted.</p>
        </div>

        {/* Sign up link */}
        <div className="text-center mt-4">
          <span className="text-muted" style={{ fontSize:13 }}>New to StanbicX?{' '}</span>
          <Link to="/create-account" className="link" style={{ fontSize:13 }}>
            Create Account <ArrowRight size={13} style={{ display:'inline', verticalAlign:'middle' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
