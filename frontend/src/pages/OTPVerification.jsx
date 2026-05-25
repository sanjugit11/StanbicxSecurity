import { useState, useEffect, useRef } from 'react'
import { verifyTelegramOTP, sendTelegramOTP } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, RefreshCw, ChevronLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'

const EXPIRY = 600

export default function OTPVerification() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(EXPIRY)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const refs = useRef([])
  
  const identifier = sessionStorage.getItem('sxs_identifier') || '@user'
  const mode = sessionStorage.getItem('sxs_otp_mode') || 'signin'

  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

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
      // Call backend to verify OTP
      await verifyTelegramOTP(identifier, code)
      setSuccess(true)

      push({
        type: 'success',
        title: mode === 'signup' ? 'Telegram Verified' : 'Authentication Successful',
        message: mode === 'signup' 
          ? 'Account created successfully! Proceeding to setup your profile details.'
          : 'Welcome back! Granting access to your dashboard.',
        duration: 4000,
      })

      addNotification({
        type: 'success',
        title: mode === 'signup' ? 'Account Created' : 'Access Granted',
        message: `Session verified successfully for ${identifier}`,
      })

      setTimeout(() => {
        if (mode === 'signup') {
          navigate('/account-info')
        } else {
          navigate('/devices')
        }
      }, 1200)
    } catch (e) {
      setError(e.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true); setError('')
    try {
      // Resend OTP via backend
      await sendTelegramOTP(identifier)
      setTimer(EXPIRY)
      setOtp(['', '', '', '', '', ''])

      push({
        type: 'telegram',
        title: 'OTP Resent',
        message: `A fresh OTP was sent to ${identifier}`,
        duration: 20000,
      })

      addNotification({
        type: 'telegram',
        title: 'OTP Resent',
        message: `A fresh OTP was sent to ${identifier}`,
      })

      refs.current[0]?.focus()
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
    <div className="page">
      <div className="card animate-in">

        {/* Back */}
        <button
          onClick={() => navigate('/login')}
          className="btn btn-ghost btn-sm"
          style={{ width: 'auto', marginBottom: 24 }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`icon-badge ${success ? 'green' : ''}`} style={{ margin: '0 auto 18px' }}>
            {success ? <CheckCircle2 size={30} color="#fff" /> : <MessageCircle size={30} color="#fff" />}
          </div>
          <h1 className="page-title">{success ? 'Verified!' : 'Enter OTP'}</h1>
          <p className="page-subtitle">
            {success ? 'Authentication successful. Redirecting…' : (
              <>OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{identifier}</strong> via Telegram</>
            )}
          </p>
        </div>

        {/* Steps */}
        <div className="steps">
          {stepsList.map((s, i) => (
            <div key={s} className={`step-item ${i === 0 ? 'done' : i === 1 ? 'active' : ''}`}>
              <div className="step-circle">{i === 0 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* OTP Cells */}
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
                fontSize: 22,
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
          <div className="info-block red" style={{ marginBottom: 16 }}>
            <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button
          id="verify-otp-btn"
          className={`btn ${success ? 'btn-green' : 'btn-primary'}`}
          onClick={handleVerify}
          disabled={loading || success}
        >
          {loading ? <div className="loader" /> : success ? <><CheckCircle2 size={16} /> Verified</> : 'Verify OTP'}
        </button>

        {/* Timer + Resend */}
        <div className="flex justify-between items-center mt-4" style={{ fontSize: 13 }}>
          <span className="text-muted">OTP expires in:</span>
          <span style={{ color: timer < 60 ? 'var(--red)' : 'var(--amber)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {timer > 0 ? fmt() : 'Expired'}
          </span>
        </div>

        <button
          id="resend-otp-btn"
          className="btn btn-outline mt-3"
          onClick={handleResend}
          disabled={resending || timer > 540}
        >
          {resending ? <div className="loader" style={{ borderTopColor: 'var(--accent)' }} /> : <><RefreshCw size={14} /> Resend OTP</>}
        </button>

        {timer > 540 && (
          <p className="text-center text-muted mt-2" style={{ fontSize: 12 }}>
            You can resend in {fmt()}
          </p>
        )}
      </div>
    </div>
  )
}
