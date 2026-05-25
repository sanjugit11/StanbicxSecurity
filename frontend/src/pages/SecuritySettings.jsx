import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck, Bell, Lock, Fingerprint, Smartphone,
  LogOut, ChevronRight, Settings, Monitor, KeyRound,
  AlertTriangle, Globe, Eye, EyeOff, RefreshCw, Trash2
} from 'lucide-react'
import { updateSecuritySettings, logoutAllSessions } from '../services/authService'

const Toggle = ({ id, on, onToggle }) => (
  <div id={id} className={`toggle ${on ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={on} />
)

const SettingRow = ({ id, icon: Icon, iconColor = 'var(--accent-hover)', label, desc, children, danger }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <div
      style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon size={18} color={danger ? 'var(--red)' : iconColor} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: danger ? 'var(--red)' : 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
)

const SectionCard = ({ title, subtitle, children }) => (
  <div className="card-wide" style={{ marginBottom: 20 }}>
    <div style={{ marginBottom: 4 }}>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</p>}
    </div>
    {children}
  </div>
)

export default function SecuritySettings() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const [settings, setSettings] = useState({
    twoFactor: true,
    biometrics: true,
    loginAlerts: true,
    suspiciousAlerts: true,
    newDeviceAlerts: true,
    sessionTimeout: '30',
    allowedRegions: 'all',
    showActivity: true,
    dataCollection: false,
  })

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      // await updateSecuritySettings(settings)
      await new Promise((r) => setTimeout(r, 900))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    const { current, newPw, confirm } = pwForm
    if (!current || !newPw || !confirm) { setPwError('All fields required'); return }
    if (newPw !== confirm) { setPwError('Passwords do not match'); return }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwError('')
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 900))
      setPwSuccess(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoutAll = async () => {
    if (!confirm('Sign out from ALL devices except this one?')) return
    setLoggingOut(true)
    try {
      // await logoutAllSessions()
      await new Promise((r) => setTimeout(r, 1000))
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="page-wide">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="icon-badge" style={{ width: 36, height: 36 }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          StanbicX Security
        </div>
        <div className="nav-links">
          <Link to="/devices" className="nav-link"><Monitor size={15} />Devices</Link>
          <Link to="/security" className="nav-link active"><Settings size={15} />Security</Link>
          <Link to="/kyc" className="nav-link"><ShieldCheck size={15} />KYC</Link>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 960, margin: '0 auto' }}>

        {/* ── Authentication ── */}
        <div>
          <SectionCard title="Authentication" subtitle="Control how you sign in to StanbicX">
            <SettingRow
              id="setting-2fa"
              icon={ShieldCheck}
              label="Two-Factor Authentication"
              desc="Require OTP every time you sign in"
            >
              <Toggle id="toggle-2fa" on={settings.twoFactor} onToggle={() => toggle('twoFactor')} />
            </SettingRow>
            <SettingRow
              id="setting-biometrics"
              icon={Fingerprint}
              label="Biometric Authentication"
              desc="Use Face ID or Touch ID to unlock"
            >
              <Toggle id="toggle-biometrics" on={settings.biometrics} onToggle={() => toggle('biometrics')} />
            </SettingRow>
            <SettingRow
              id="setting-timeout"
              icon={Lock}
              label="Session Timeout"
              desc="Auto sign-out after inactivity"
            >
              <select
                id="session-timeout-select"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings((s) => ({ ...s, sessionTimeout: e.target.value }))}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                }}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="0">Never</option>
              </select>
            </SettingRow>
            <SettingRow
              id="setting-regions"
              icon={Globe}
              label="Allowed Regions"
              desc="Restrict logins to specific countries"
            >
              <select
                id="region-select"
                value={settings.allowedRegions}
                onChange={(e) => setSettings((s) => ({ ...s, allowedRegions: e.target.value }))}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                }}
              >
                <option value="all">All Regions</option>
                <option value="ng">Nigeria Only</option>
                <option value="africa">Africa</option>
                <option value="custom">Custom…</option>
              </select>
            </SettingRow>
          </SectionCard>

          {/* ── Change Password ── */}
          <SectionCard title="Change Password" subtitle="Update your account password">
            {pwSuccess && (
              <div className="info-block green" style={{ marginBottom: 12 }}>
                <ShieldCheck size={15} color="var(--green)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>Password updated successfully!</span>
              </div>
            )}
            {(['current', 'newPw', 'confirm']).map((k) => (
              <div key={k} className="input-group" style={{ marginBottom: 12 }}>
                <label className="label">
                  {k === 'current' ? 'Current Password' : k === 'newPw' ? 'New Password' : 'Confirm New Password'}
                </label>
                <div className="input-wrap">
                  <span className="input-icon"><KeyRound size={15} /></span>
                  <input
                    id={`pw-${k}`}
                    className="input"
                    type={
                      (k === 'current' && showCurrentPw) || (k !== 'current' && showNewPw) ? 'text' : 'password'
                    }
                    placeholder="••••••••"
                    value={pwForm[k]}
                    onChange={(e) => { setPwForm((f) => ({ ...f, [k]: e.target.value })); setPwError('') }}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => k === 'current' ? setShowCurrentPw((v) => !v) : setShowNewPw((v) => !v)}
                    style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {(k === 'current' ? showCurrentPw : showNewPw) ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            {pwError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{pwError}</p>}
            <button id="change-password-btn" className="btn btn-primary" onClick={handlePasswordChange} disabled={saving}>
              {saving ? <div className="loader" /> : <><RefreshCw size={14} /> Update Password</>}
            </button>
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div>
          {/* Notifications */}
          <SectionCard title="Security Alerts" subtitle="Choose when to be notified">
            <SettingRow id="setting-login-alert" icon={Bell} label="Login Notifications" desc="Alert on every sign-in">
              <Toggle id="toggle-login-alert" on={settings.loginAlerts} onToggle={() => toggle('loginAlerts')} />
            </SettingRow>
            <SettingRow id="setting-suspicious" icon={AlertTriangle} iconColor="var(--amber)" label="Suspicious Activity" desc="Alert on unusual account behaviour">
              <Toggle id="toggle-suspicious" on={settings.suspiciousAlerts} onToggle={() => toggle('suspiciousAlerts')} />
            </SettingRow>
            <SettingRow id="setting-new-device" icon={Smartphone} iconColor="var(--cyan)" label="New Device Logins" desc="Alert when a new device is detected">
              <Toggle id="toggle-new-device" on={settings.newDeviceAlerts} onToggle={() => toggle('newDeviceAlerts')} />
            </SettingRow>
          </SectionCard>

          {/* Privacy */}
          <SectionCard title="Privacy" subtitle="Control your data and visibility">
            <SettingRow id="setting-activity" icon={Eye} label="Activity Visibility" desc="Show login activity to account managers">
              <Toggle id="toggle-activity" on={settings.showActivity} onToggle={() => toggle('showActivity')} />
            </SettingRow>
            <SettingRow id="setting-data" icon={Globe} label="Analytics Opt-In" desc="Share anonymised usage data to improve StanbicX">
              <Toggle id="toggle-data" on={settings.dataCollection} onToggle={() => toggle('dataCollection')} />
            </SettingRow>
          </SectionCard>

          {/* Danger zone */}
          <SectionCard title="Danger Zone" subtitle="Irreversible actions — proceed with caution">
            <SettingRow
              id="setting-logout-all"
              icon={LogOut}
              label="Sign Out All Devices"
              desc="Immediately end all active sessions except this one"
              danger
            >
              <button
                id="logout-all-btn"
                className="btn btn-danger btn-sm"
                onClick={handleLogoutAll}
                disabled={loggingOut}
              >
                {loggingOut ? <div className="loader" style={{ borderTopColor: '#fff', width: 14, height: 14 }} /> : <><LogOut size={13} /> Sign Out All</>}
              </button>
            </SettingRow>
            <SettingRow
              id="setting-delete"
              icon={Trash2}
              label="Delete Account"
              desc="Permanently erase your account and all associated data"
              danger
            >
              <button
                id="delete-account-btn"
                className="btn btn-danger btn-sm"
                onClick={() => alert('Contact support@stanbicx.com to delete your account.')}
              >
                <Trash2 size={13} /> Delete
              </button>
            </SettingRow>
          </SectionCard>

          {/* Save */}
          <button id="save-settings-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <div className="loader" /> : <><ShieldCheck size={16} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
