import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Send, Lock, ArrowRight, Smartphone, MessageCircle, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'
import { registerUser, createSession } from '../services/authService'

export default function CreateAccount() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [phone, setPhone] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  const handleSend = async () => {
    const phoneVal = phone.trim()
    const usernameVal = telegramUsername.trim()
    
    if (!phoneVal) { setError('Please enter your phone number'); return }
    if (!usernameVal) { setError('Please enter your Telegram username'); return }
    if (!usernameVal.startsWith('@')) { setError('Telegram username must start with @'); return }
    if (!agreed) { setError('Please accept the Terms of Service & Privacy Policy'); return }
    
    setError('')
    setLoading(true)
    
    try {
      // 1. Register mapping relation (Phone <-> Telegram Username)
      await registerUser({ phone: phoneVal, telegramUsername: usernameVal })
      
      // 2. Generate secure session for OTP flow
      const res = await createSession(phoneVal)
      const { sessionId } = res

      // Save sessionId, username, and metadata for verification
      sessionStorage.setItem('sxs_session_id', sessionId)
      sessionStorage.setItem('sxs_identifier', usernameVal)
      sessionStorage.setItem('sxs_phone', phoneVal)
      sessionStorage.setItem('sxs_otp_mode', 'signup')
      sessionStorage.setItem('sxs_otp_ts', Date.now().toString())

      addNotification({
        type: 'success',
        title: 'Registration Initiated',
        message: 'Phone mapping linked! Launching StanbicX Bot...',
      })

      push({
        type: 'telegram',
        title: 'Linking Telegram Bot',
        message: 'Redirecting to Telegram. Press START inside the bot to activate OTP.',
        duration: 10000,
      })

      // 4. Redirect user to: https://t.me/BOT_USERNAME?start=<sessionId>
      const botUrl = `https://t.me/StanbicxBot?start=${sessionId}`
      
      // Open in a new tab so user preserves current onboarding state
      window.open(botUrl, '_blank')

      // Move current tab to the OTP verification step
      setTimeout(() => {
        navigate('/otp')
      }, 1000)

    } catch (e) {
      setError(e.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSend() }

  return (
    <div className="page animate-scale" style={{ alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute', top: '5%', left: '10%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(45px)', zIndex: 0
      }} />

      <div className="card" style={{ maxWidth: 450, padding: '44px 32px' }}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="icon-badge cyan" style={{ margin: '0 auto 20px', boxShadow: '0 0 28px rgba(6,182,212,0.25)' }}>
            <User size={30} color="#fff" />
          </div>
          <h1 className="page-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create Account
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px' }}>
            Map your phone number to Telegram chat secure credentials
          </p>
        </div>

        {/* Steps indicator */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i === 0 ? 'active' : ''}`}>
              <div className="step-circle">{i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 22,
        }}>
          <MessageCircle size={17} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '12px', color: '#8b8ba8', lineHeight: 1.5 }}>
            To link your account securely, we map your phone number to your Telegram Chat ID via <strong style={{ color: 'var(--cyan)' }}>@StanbicxBot</strong>.
          </p>
        </div>

        {/* Phone Input */}
        <div className="input-group">
          <label className="label">Phone Number</label>
          <div className="input-wrap">
            <span className="input-icon"><Smartphone size={17} /></span>
            <input
              id="phone-input"
              className="input"
              type="tel"
              placeholder="+234 80 0000 0000"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Telegram Username Input */}
        <div className="input-group" style={{ marginBottom: 24 }}>
          <label className="label">Telegram Username</label>
          <div className="input-wrap">
            {/* Custom Telegram Icon for Input */}
            <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </span>
            <input
              id="telegram-username-input"
              className="input"
              type="text"
              placeholder="@username"
              value={telegramUsername}
              onChange={e => { setTelegramUsername(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', marginLeft: '2px' }}>
            Requires public username (Settings &gt; Username in Telegram)
          </span>
        </div>

        {/* Terms and conditions */}
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 24 }}>
          <div
            id="terms-checkbox"
            onClick={() => { setAgreed(!agreed); setError('') }}
            style={{
              width: 18, height: 18, borderRadius: 5, marginTop: 2, flexShrink: 0,
              border: `2px solid ${agreed ? 'var(--cyan)' : 'var(--border)'}`,
              background: agreed ? 'var(--cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
          >
            {agreed && <CheckCircle2 size={11} color="#fff" />}
          </div>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, userSelect: 'none' }}>
            I agree to the <span className="text-accent" style={{ cursor: 'pointer', fontWeight: 600 }}>Terms of Service</span> and <span className="text-accent" style={{ cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</span>.
          </span>
        </label>

        {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: 16 }} className="animate-in">{error}</p>}

        {/* Register Button */}
        <button
          id="send-signup-otp-btn"
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            boxShadow: '0 8px 24px rgba(6,182,212,0.22)',
            marginBottom: 20,
            borderRadius: '12px',
            padding: '14px 20px'
          }}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loader" /> Registering mapping…
            </>
          ) : (
            <>
              Register &amp; Open Bot
              <ArrowUpRight size={15} />
            </>
          )}
        </button>

        <div className="divider" style={{ margin: '20px 0' }} />

        {/* Security protection banner */}
        <div className="info-block" style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.1)' }}>
          <Lock size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-hover)' }} />
          <p style={{ fontSize: '12px', lineHeight: '1.45' }}>
            Protected by end-to-end multi-layer Telegram verification protocols.
          </p>
        </div>

        {/* Redirect to sign in */}
        <div className="text-center mt-6">
          <span className="text-muted" style={{ fontSize: '13px' }}>Already registered?{' '}</span>
          <Link to="/login" className="link" style={{ fontSize: '13px', fontWeight: 600 }}>
            Sign In <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '2px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
