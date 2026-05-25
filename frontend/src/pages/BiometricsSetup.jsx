import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, ScanFace, ChevronLeft, CheckCircle2, AlertCircle, Shield } from 'lucide-react'
import { saveBiometrics, addNotification } from '../services/storageService'
import { useTame } from '../components/TameNotification'

const METHODS = [
  {
    id: 'face',
    icon: ScanFace,
    label: 'Face ID',
    desc: 'Authenticate using facial recognition via your device camera',
    color: 'var(--cyan)',
  },
  {
    id: 'touch',
    icon: Fingerprint,
    label: 'Touch ID',
    desc: 'Use your fingerprint sensor for fast, secure authentication',
    color: 'var(--accent-hover)',
  },
]

export default function BiometricsSetup() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [selected, setSelected] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('idle') // idle | scanning | success | error
  const [error, setError] = useState('')

  const handleScan = async () => {
    if (!selected) { setError('Please select a biometric method first'); return }
    setError('')
    setScanning(true)
    setStatus('scanning')
    try {
      // WebAuthn placeholder — replace with real navigator.credentials.create()
      // const credential = await navigator.credentials.create({ publicKey: { ... } })
      saveBiometrics(selected)
      await new Promise((r) => setTimeout(r, 2500))
      
      setStatus('success')
      push({
        type: 'success',
        title: 'Biometrics Registered',
        message: `Your WebAuthn mock biometric signature (${selected === 'face' ? 'Face ID' : 'Touch ID'}) was saved successfully.`,
        duration: 4000
      })

      addNotification({
        type: 'security',
        title: 'Biometrics Added',
        message: `Biometric credential created using ${selected === 'face' ? 'Face ID' : 'Touch ID'}`
      })

      setTimeout(() => navigate('/kyc'), 1200)
    } catch (e) {
      setStatus('error')
      setError(e.message || 'Biometric scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const ringColor =
    status === 'scanning' ? 'var(--amber)' :
    status === 'success' ? 'var(--green)' :
    status === 'error' ? 'var(--red)' :
    'var(--accent)'

  const SelIcon = selected ? METHODS.find((m) => m.id === selected)?.icon : Shield

  return (
    <div className="page">
      <div className="card animate-in">

        <button onClick={() => navigate('/passcode')} className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 24 }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="page-title">Biometric Setup</h1>
          <p className="page-subtitle">Secure your account with Face ID or Touch ID</p>
        </div>

        {/* Steps */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i < 4 ? 'done' : i === 4 ? 'active' : ''}`}>
              <div className="step-circle">{i < 4 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Biometric ring */}
        <div style={{ margin: '8px auto 32px', position: 'relative', width: 200, height: 200 }}>
          {/* outer pulse rings */}
          {[0, 1, 2].map((n) => (
            <div key={n} style={{
              position: 'absolute',
              inset: -(n * 18),
              borderRadius: '50%',
              border: `1px solid ${ringColor}`,
              opacity: status === 'scanning' ? 0.25 : 0.1,
              animation: status === 'scanning' ? `pulse-ring 2s ease-out ${n * 0.4}s infinite` : 'none',
            }} />
          ))}
          {/* inner circle */}
          <div
            id="biometric-scan-btn"
            onClick={status === 'idle' || status === 'error' ? handleScan : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: `2px solid ${ringColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scanning ? 'default' : 'pointer',
              transition: 'all 0.4s',
              boxShadow: `0 0 40px ${ringColor}33`,
              gap: 8,
            }}
          >
            {status === 'success' ? (
              <CheckCircle2 size={52} color="var(--green)" />
            ) : status === 'error' ? (
              <AlertCircle size={52} color="var(--red)" />
            ) : scanning ? (
              <div className="loader" style={{ width: 40, height: 40, borderWidth: 3, borderTopColor: ringColor }} />
            ) : selected ? (
              <SelIcon size={52} color={ringColor} />
            ) : (
              <Shield size={52} color="var(--text-muted)" />
            )}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {status === 'scanning' ? 'Scanning…' :
               status === 'success' ? 'Verified!' :
               status === 'error' ? 'Try Again' :
               selected ? 'Tap to Scan' : 'Select Method'}
            </span>
          </div>
        </div>

        {/* Method picker */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          {METHODS.map((m) => (
            <button
              key={m.id}
              id={`biometric-${m.id}`}
              onClick={() => { if (!scanning) { setSelected(m.id); setStatus('idle'); setError('') } }}
              style={{
                background: selected === m.id ? `${m.color}11` : 'var(--bg-elevated)',
                border: `1px solid ${selected === m.id ? m.color : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                boxShadow: selected === m.id ? `0 0 16px ${m.color}22` : 'none',
              }}
            >
              <m.icon size={22} color={selected === m.id ? m.color : 'var(--text-muted)'} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: selected === m.id ? m.color : 'var(--text-primary)', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="info-block red" style={{ marginBottom: 16 }}>
            <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0 }} />
            <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button id="start-scan-btn" className="btn btn-primary" onClick={handleScan} disabled={scanning || status === 'success'}>
          {scanning ? <div className="loader" /> :
           status === 'success' ? <><CheckCircle2 size={16} /> Biometrics Registered</> :
           'Start Biometric Scan'}
        </button>

        <button
          id="skip-biometrics-btn"
          className="btn btn-outline mt-3"
          onClick={() => navigate('/kyc')}
          disabled={scanning}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
