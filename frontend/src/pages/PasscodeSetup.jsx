import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Delete, CheckCircle2, ChevronLeft, ShieldCheck } from 'lucide-react'
import { savePasscode, getUser, validatePasscodeAVV, addNotification } from '../services/storageService'
import { useTame } from '../components/TameNotification'

const KEYS = [
  { label: '1', sub: '' }, { label: '2', sub: 'ABC' }, { label: '3', sub: 'DEF' },
  { label: '4', sub: 'GHI' }, { label: '5', sub: 'JKL' }, { label: '6', sub: 'MNO' },
  { label: '7', sub: 'PQRS' }, { label: '8', sub: 'TUV' }, { label: '9', sub: 'WXYZ' },
  { label: '', sub: '' }, { label: '0', sub: '+' }, { label: 'del', sub: '' },
]

const LENGTH = 6

export default function PasscodeSetup() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [phase, setPhase] = useState('create') // 'create' | 'confirm'
  const [code, setCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleKey = (key) => {
    if (key === '') return
    if (key === 'del') { setCode((c) => c.slice(0, -1)); setError(''); return }
    if (code.length >= LENGTH) return
    const next = code + key
    setCode(next)
    setError('')

    if (next.length === LENGTH) {
      setTimeout(() => {
        if (phase === 'create') {
          // Validate passcode against DOB and simplicity rules
          const user = getUser()
          const validation = validatePasscodeAVV(next, user?.dob)
          if (!validation.valid) {
            setError(validation.issues.join('. '))
            setCode('')
            return
          }
          setSavedCode(next)
          setCode('')
          setPhase('confirm')
        } else {
          if (next === savedCode) {
            handleSubmit(next)
          } else {
            setError('Passcodes do not match. Try again.')
            setCode('')
          }
        }
      }, 300)
    }
  }

  const handleSubmit = async (finalCode) => {
    setLoading(true)
    try {
      savePasscode(finalCode)
      await new Promise((r) => setTimeout(r, 1000))
      
      push({
        type: 'success',
        title: 'Passcode Established',
        message: 'Your account security passcode has been updated successfully.',
        duration: 4000
      })

      addNotification({
        type: 'security',
        title: 'Passcode Updated',
        message: 'Security passcode updated successfully.'
      })

      setSuccess(true)
      setTimeout(() => navigate('/biometrics'), 1000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setPhase('create'); setCode(''); setSavedCode(''); setError('') }

  return (
    <div className="page">
      <div className="card animate-in">

        <button onClick={() => navigate('/account-info')} className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 24 }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className={`icon-badge ${success ? 'green' : ''}`} style={{ margin: '0 auto 18px' }}>
            {success ? <CheckCircle2 size={30} color="#fff" /> : <Lock size={30} color="#fff" />}
          </div>
          <h1 className="page-title">{phase === 'create' ? 'Create Passcode' : 'Confirm Passcode'}</h1>
          <p className="page-subtitle">
            {success ? 'Passcode saved! Setting up biometrics…'
              : phase === 'create'
                ? 'Choose a 6-digit passcode to secure your account'
                : 'Re-enter your passcode to confirm'}
          </p>
        </div>

        {/* Steps */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i < 3 ? 'done' : i === 3 ? 'active' : ''}`}>
              <div className="step-circle">{i < 3 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Dot display */}
        <div className="passcode-display">
          {Array.from({ length: LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`passcode-dot ${i < code.length ? 'filled' : ''}`}
            />
          ))}
        </div>

        {error && (
          <div className="info-block red" style={{ marginBottom: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--red)', fontSize: 13, width: '100%' }}>{error}</p>
          </div>
        )}
        {error && phase === 'confirm' && (
          <button className="link" style={{ display: 'block', margin: '0 auto 16px', fontSize: 13 }} onClick={reset}>
            Start over
          </button>
        )}

        {/* Keypad */}
        {!success && (
          <div className="keypad">
            {KEYS.map((k, i) =>
              k.label === '' ? (
                <div key={i} className="key empty" />
              ) : k.label === 'del' ? (
                <button key={i} id="passcode-del" className="key danger" onClick={() => handleKey('del')}>
                  <Delete size={22} />
                </button>
              ) : (
                <button key={i} id={`key-${k.label}`} className="key" onClick={() => handleKey(k.label)}>
                  {k.label}
                  {k.sub && <sub>{k.sub}</sub>}
                </button>
              )
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-6">
            <div className="loader" style={{ borderTopColor: 'var(--accent)', width: 28, height: 28 }} />
          </div>
        )}

        <div className="info-block mt-6">
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-hover)' }} />
          <p style={{ fontSize: 12 }}>Your passcode is stored using AES-256 encryption and never transmitted in plaintext.</p>
        </div>
      </div>
    </div>
  )
}
