import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'


import { verifyOTP, checkSession, resendSessionOTP } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, RefreshCw, ChevronLeft, CheckCircle2, ShieldCheck, Loader2, ArrowUpRight } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'

const EXPIRY = 600 // 10 minutes

export default function OTPVerification() {
  const navigate = useNavigate()
  const { push } = useTame()
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(EXPIRY)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('');
const [showTokenLink, setShowTokenLink] = useState(false);
  const [success, setSuccess] = useState(false)
  const [isBotConnected, setIsBotConnected] = useState(false)
  const [pollingActive, setPollingActive] = useState(true)

  const refs = useRef([])
  
  const sessionId = sessionStorage.getItem('sxs_session_id')
  const mode = sessionStorage.getItem('sxs_otp_mode') || 'signin'
  const identifier = sessionStorage.getItem('sxs_identifier') || '@StanbicxBot'

  // 1. Poll the session status from backend until bot is connected and OTP is generated
  useEffect(() => {
    if (!sessionId) {
      setError('Active session not found. Please log in first.')
      setPollingActive(false)
      return
    }

    let intervalId
    const pollStatus = async () => {
      try {
        const res = await checkSession(sessionId)
        if (res.connected && res.otpSent) {
          setIsBotConnected(true)
          setPollingActive(false)
          clearInterval(intervalId)
          
          push({
            type: 'success',
            title: 'Telegram Connected',
            message: 'Your Telegram session is verified. An OTP has been delivered.',
            duration: 5000,
          })
          
          addNotification({
            type: 'telegram',
            title: 'Bot Activated',
            message: `Telegram Bot linked successfully to session.`,
          })
        }
      } catch (e) {
        console.error('Session polling error:', e)
      }
    }

    // Run first check immediately
    pollStatus()

    if (pollingActive) {
      intervalId = setInterval(pollStatus, 2000)
    }

    return () => clearInterval(intervalId)
  }, [sessionId, pollingActive])

  // 2. Countdown timer for OTP expiry once bot is connected
  useEffect(() => {
    if (!isBotConnected || success || timer <= 0) return
    const id = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [isBotConnected, timer, success])

  const fmt = () => {
    const m = Math.floor(timer / 60).toString().padStart(2, '0')
    const s = (timer % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleChange = (val, i) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    setError('')
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      refs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP'); return }
    setLoading(true); setError('')
    try {
      // 12. Backend validates OTP, unused status, expiry, and session validity
      await verifyOTP(sessionId, code)
      setSuccess(true);
      setShowTokenLink(true);

      push({
        type: 'success',
        title: mode === 'signup' ? 'Identity Verified' : 'Authentication Successful',
        message: mode === 'signup' 
          ? 'Account created successfully! Proceeding to setup your profile details.'
          : 'Welcome back! Granting secure access to your dashboard.',
        duration: 4000,
      })

      addNotification({
        type: 'success',
        title: mode === 'signup' ? 'Profile Activated' : 'Access Granted',
        message: `Secured session authorized successfully.`,
      })

      // 13. Redirect to the appropriate onboarding step or dashboard
      setTimeout(() => {
        if (mode === 'signup') {
          navigate('/account-info')
        } else {
          navigate('/devices')
        }
      }, 1500)
    } catch (e) {
      setError(e.message || 'Verification failed. Please check the OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true); setError('')
    try {
      // Resend OTP via session trigger
      await resendSessionOTP(sessionId)
      setTimer(EXPIRY)
      setOtp(['', '', '', '', '', ''])

      push({
        type: 'telegram',
        title: 'OTP Resent',
        message: `A fresh secure OTP was dispatched to your Telegram.`,
        duration: 8000,
      })

      addNotification({
        type: 'telegram',
        title: 'OTP Dispatched',
        message: `New secure OTP dispatched via @StanbicxBot`,
      })

      setTimeout(() => refs.current[0]?.focus(), 100)
    } catch (e) {
      setError(e.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  const stepsList = mode === 'signup' 
    ? ['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC']
    : ['Telegram', 'OTP', 'Passcode', 'Biometrics']

  return (
    <div className="page animate-scale">
      {/* Background glow effects */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none', filter: 'blur(50px)'
      }} />

      <div className="card" style={{ maxWidth: 450, padding: '40px 32px' }}>
        
        {/* Back navigation */}
        <button
          onClick={() => navigate('/login')}
          className="btn btn-ghost btn-sm"
          style={{ width: 'auto', marginBottom: 24, paddingLeft: 10 }}
        >
          <ChevronLeft size={16} /> Exit
        </button>

        {/* Header section */}
        <div className="text-center mb-6">
          <div className={`icon-badge ${success ? 'green' : isBotConnected ? 'cyan' : 'amber'}`} style={{ margin: '0 auto 18px', transition: 'all 0.5s' }}>
            {success ? (
              <CheckCircle2 size={30} color="#fff" />
            ) : isBotConnected ? (
              <MessageCircle size={30} color="#fff" />
            ) : (
              <Loader2 size={30} color="#fff" className="spin" />
            )}
          </div>
          <h1 className="page-title" style={{ transition: 'all 0.3s' }}>
            {success ? 'Identity Verified!' : isBotConnected ? 'Enter OTP' : 'Awaiting Bot'}
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            {success 
              ? 'Secure authorization confirmed. Redirecting…' 
              : isBotConnected 
              ? <>Enter the secure 6-digit OTP code sent to your Telegram account.</>
              : <>Please start a conversation with the StanbicX bot to receive your code.</>
            }
          </p>
        </div>

        {/* Dynamic step-by-step progress */}
        <div className="steps" style={{ marginBottom: 30 }}>
          {stepsList.map((s, i) => (
            <div key={s} className={`step-item ${i === 0 ? 'done' : i === 1 ? 'active' : ''}`}>
              <div className="step-circle">{i === 0 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* ── STATE 1: Bot not connected yet ── */}
        {!isBotConnected && !success && (
          <div className="animate-in" style={{ textAlign: 'center' }}>
            
            {/* Pulsating link state card */}
            <div style={{
              background: 'rgba(245,158,11,0.03)',
              border: '1px solid rgba(245,158,11,0.12)',
              borderRadius: '16px',
              padding: '24px 20px',
              marginBottom: 24,
            }}>
              <Loader2 size={24} color="var(--amber)" className="spin" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Connecting secure channel…
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Waiting for the <strong>/start</strong> trigger inside Telegram to bind your session.
              </p>
            </div>

            {/* Direct button to launch bot */}
            <a
              id="start-telegram-bot-btn"
              href={`https://t.me/StanbicxBot?start=${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 18px rgba(245,158,11,0.2)',
                borderRadius: '12px',
                padding: '13px 20px',
                fontSize: '14.5px',
                textDecoration: 'none',
                color: '#fff',
                marginBottom: 20
              }}
            >
              Open Telegram Bot
              <ArrowUpRight size={15} style={{ marginLeft: 2 }} />
            </a>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              If your browser didn't launch the bot automatically, click the button above to pair manually.
            </p>
          </div>
        )}

        {/* ── STATE 2: Bot connected & OTP ready to enter ── */}
        {isBotConnected && (
          <div className="animate-in">
            {/* OTP cells container */}
            <div className="otp-grid" onPaste={handlePaste} style={{ marginBottom: 24 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-cell-${i}`}
                  ref={(el) => (refs.current[i] = el)}
                  className={`otp-cell ${digit ? 'filled' : ''}`}
                  style={{
                    width: '100%',
                    border: `1px solid ${digit ? 'var(--border-active)' : 'var(--border)'}`,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '22px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    padding: '14px 0',
                    outline: 'none',
                    transition: 'var(--transition)',
                    caretColor: 'var(--accent)',
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <div className="info-block red animate-in" style={{ marginBottom: 18 }}>
                <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>
              </div>
            )}

            {/* Verify code action button */}
            <button
              id="verify-otp-btn"
              className={`btn ${success ? 'btn-green' : 'btn-primary'}`}
              onClick={handleVerify}
              disabled={loading || success || otp.join('').length < 6}
              style={{
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '15px'
              }}
            >
              {loading ? (
                <>
                  <div className="loader" /> Authorizing credentials…
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={16} /> Authorized Successfully
                </>
              ) : (
                'Verify Secure Credentials'
              )}
            </button>

            {/* Expiry count and Resend options */}
            <div className="flex justify-between items-center mt-4" style={{ fontSize: '13px' }}>
              <span className="text-muted">OTP Code Expires:</span>
              <span style={{ color: timer < 60 ? 'var(--red)' : 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {timer > 0 ? fmt() : 'Expired'}
              </span>
            </div>

            <button
              id="resend-otp-btn"
              className="btn btn-outline mt-3"
              onClick={handleResend}
              disabled={resending || timer > 540}
              style={{ borderRadius: '12px', padding: '12px 18px', fontSize: '13.5px' }}
            >
              {resending ? (
                <div className="loader" style={{ borderTopColor: 'var(--accent)' }} />
              ) : (
                <>
                  <RefreshCw size={13} />
                  Resend Secure OTP
                </>
              )}
            </button>

            {timer > 540 && (
              <p className="text-center text-muted mt-2" style={{ fontSize: '12px' }}>
                Resend cooling down: {fmt()}
              </p>
            )}
          </div>
        )}

        <div className="divider" style={{ margin: '24px 0' }} />

        {/* Security protection details */}
        <div className="info-block" style={{ background: 'rgba(6,182,212,0.03)', borderColor: 'rgba(6,182,212,0.1)' }}>
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--cyan)' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Each code is highly secure, single-use, and automatically audited by the SXS-ID trust authority.
          </p>
        </div>
      </div>
    </div>
  )
}
