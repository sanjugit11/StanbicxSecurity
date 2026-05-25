import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Send, Lock, ArrowRight, MessageSquareCode, ArrowUpRight } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'
import { createSession } from '../services/authService'

export default function Login() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleContinueWithTelegram = async () => {
    setError('')
    setLoading(true)
    try {
      // 3. Backend generates temporary login session ID
      const res = await createSession()
      const { sessionId } = res

      // Save sessionId and metadata for the OTP screen
      sessionStorage.setItem('sxs_session_id', sessionId)
      sessionStorage.setItem('sxs_identifier', '@StanbicxBot')
      sessionStorage.setItem('sxs_otp_mode', 'signin')
      sessionStorage.setItem('sxs_otp_ts', Date.now().toString())

      addNotification({
        type: 'telegram',
        title: 'Session Initiated',
        message: 'A temporary secure session has been created. Redirecting to Telegram…',
      })

      push({
        type: 'telegram',
        title: 'Connecting to Telegram',
        message: 'Opening the Telegram bot to securely verify your identity.',
        duration: 8000,
      })

      // 4. Frontend redirects user to: https://t.me/BOT_USERNAME?start=<sessionId>
      const botUrl = `https://t.me/StanbicxBot?start=${sessionId}`
      
      // Open Telegram bot in a new tab so they don't lose the main site tab
      window.open(botUrl, '_blank')

      // Smoothly navigate the main tab to the OTP entry screen
      setTimeout(() => {
        navigate('/otp')
      }, 1000)

    } catch (e) {
      setError(e.message || 'Failed to initialize secure session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page animate-scale">
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', top: '10%', left: '15%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(40px)', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '15%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(50px)', zIndex: 0
      }} />

      <div className="card" style={{ maxWidth: 440, padding: '48px 36px', overflow: 'hidden' }}>
        
        {/* Decorative corner accent */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '90px', height: '90px',
          background: 'linear-gradient(225deg, rgba(6,182,212,0.15), transparent 60%)',
          borderBottomLeftRadius: '100%', pointerEvents: 'none'
        }} />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="icon-badge cyan" style={{ margin: '0 auto 22px', transform: 'scale(1.05)', boxShadow: '0 0 32px rgba(6,182,212,0.3)' }}>
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h1 className="page-title" style={{ background: 'linear-gradient(to right, #ffffff, #8b8ba8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            StanbicX Security
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Multi-layered Decentralized Identity System
          </p>
        </div>

        {/* Dynamic Flow Steps Map */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: 28,
        }}>
          <span style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
            How Verification Works
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--cyan)', fontWeight: 'bold' }}>1</div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click <strong>Continue with Telegram</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--cyan)', fontWeight: 'bold' }}>2</div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Press <strong>Start</strong> in Telegram bot</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--cyan)', fontWeight: 'bold' }}>3</div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Get secure <strong>OTP via Chat ID</strong></span>
            </div>
          </div>
        </div>

        {error && (
          <div className="info-block red animate-in" style={{ marginBottom: 20 }}>
            <p style={{ color: 'var(--red)', fontSize: '12.5px' }}>{error}</p>
          </div>
        )}

        {/* Telegram Connect Button */}
        <button
          id="continue-telegram-btn"
          className="btn btn-primary"
          onClick={handleContinueWithTelegram}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #0088cc, #00a2ed)',
            boxShadow: '0 8px 30px rgba(0, 136, 204, 0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '15px 24px',
            fontSize: '15.5px',
            borderRadius: '14px',
            marginBottom: 20,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {loading ? (
            <>
              <div className="loader" style={{ borderTopColor: '#fff' }} />
              Connecting Securely…
            </>
          ) : (
            <>
              {/* Inline Telegram Logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              Continue with Telegram
              <ArrowUpRight size={15} style={{ opacity: 0.8, marginLeft: '2px' }} />
            </>
          )}
        </button>

        <div className="divider" style={{ margin: '22px 0' }} />

        {/* Enterprise Security info */}
        <div className="info-block" style={{ background: 'rgba(6,182,212,0.04)', borderColor: 'rgba(6,182,212,0.1)' }}>
          <Lock size={17} style={{ flexShrink: 0, marginTop: 2, color: 'var(--cyan)' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            No phone lookup is used. Your privacy remains fully protected under secure cryptographic standards.
          </p>
        </div>

        {/* Sign up / settings link */}
        <div className="text-center mt-6">
          <span className="text-muted" style={{ fontSize: '13px' }}>Need a new account?{' '}</span>
          <Link to="/create-account" className="link" style={{ fontSize: '13px', fontWeight: 600 }}>
            Create Account <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '2px' }} />
          </Link>
        </div>
      </div>
    </div>
  )
}
