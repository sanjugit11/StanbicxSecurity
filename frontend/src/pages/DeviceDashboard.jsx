import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Monitor, Smartphone, Tablet, Trash2, ShieldCheck, MapPin, Clock, AlertTriangle, Plus, Settings } from 'lucide-react'
import { revokeDevice } from '../services/authService'

const MOCK_DEVICES = [
  {
    id: '1',
    name: 'MacBook Pro 16"',
    type: 'desktop',
    os: 'macOS Sonoma 14.5',
    browser: 'Chrome 124',
    location: 'Lagos, Nigeria',
    lastSeen: 'Active now',
    trusted: true,
    current: true,
    ip: '197.211.xx.xx',
  },
  {
    id: '2',
    name: 'iPhone 15 Pro',
    type: 'mobile',
    os: 'iOS 17.5',
    browser: 'Safari',
    location: 'Lagos, Nigeria',
    lastSeen: '2 hours ago',
    trusted: true,
    current: false,
    ip: '197.211.xx.xx',
  },
  {
    id: '3',
    name: 'iPad Air',
    type: 'tablet',
    os: 'iPadOS 17.4',
    browser: 'Safari',
    location: 'Abuja, Nigeria',
    lastSeen: '3 days ago',
    trusted: false,
    current: false,
    ip: '105.112.xx.xx',
  },
  {
    id: '4',
    name: 'Unknown Device',
    type: 'desktop',
    os: 'Windows 11',
    browser: 'Firefox 125',
    location: 'London, UK',
    lastSeen: '7 days ago',
    trusted: false,
    current: false,
    ip: '82.44.xx.xx',
    suspicious: true,
  },
]

const DeviceIcon = ({ type, size = 20, ...props }) => {
  if (type === 'mobile') return <Smartphone size={size} {...props} />
  if (type === 'tablet') return <Tablet size={size} {...props} />
  return <Monitor size={size} {...props} />
}

export default function DeviceDashboard() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState(MOCK_DEVICES)
  const [revoking, setRevoking] = useState(null)

  const handleRevoke = async (id) => {
    if (!confirm('Remove this device? It will be signed out immediately.')) return
    setRevoking(id)
    try {
      // await revokeDevice(id)
      await new Promise((r) => setTimeout(r, 700))
      setDevices((d) => d.filter((x) => x.id !== id))
    } finally {
      setRevoking(null)
    }
  }

  const trusted = devices.filter((d) => d.trusted).length
  const suspicious = devices.filter((d) => d.suspicious).length

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
          <Link to="/devices" className="nav-link active"><Monitor size={15} />Devices</Link>
          <Link to="/security" className="nav-link"><Settings size={15} />Security</Link>
          <Link to="/kyc" className="nav-link"><ShieldCheck size={15} />KYC</Link>
        </div>
      </nav>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Monitor size={20} color="var(--accent-hover)" />
            <span className="badge badge-accent">{devices.length}</span>
          </div>
          <div className="stat-value">{devices.length}</div>
          <div className="stat-label">Total Devices</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <ShieldCheck size={20} color="var(--green)" />
            <span className="badge badge-green">{trusted}</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{trusted}</div>
          <div className="stat-label">Trusted Devices</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <AlertTriangle size={20} color={suspicious ? 'var(--red)' : 'var(--text-muted)'} />
            <span className={`badge ${suspicious ? 'badge-red' : 'badge-accent'}`}>{suspicious}</span>
          </div>
          <div className="stat-value" style={{ color: suspicious ? 'var(--red)' : 'var(--text-primary)' }}>{suspicious}</div>
          <div className="stat-label">Suspicious</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Clock size={20} color="var(--cyan)" />
          </div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--cyan)' }}>Active</div>
          <div className="stat-label">Session Status</div>
        </div>
      </div>

      {/* Alert for suspicious */}
      {suspicious > 0 && (
        <div className="info-block red" style={{ marginBottom: 24 }}>
          <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 14 }}>
            <strong style={{ color: 'var(--red)' }}>Suspicious activity detected.</strong>{' '}
            An unrecognized device accessed your account from London, UK. Review and remove it if this wasn't you.
          </p>
        </div>
      )}

      {/* Devices list */}
      <div className="card-wide">
        <div className="flex justify-between items-center mb-6">
          <h2 className="section-title">Active Sessions</h2>
          <button className="btn btn-ghost btn-sm">
            <Plus size={14} /> Trust New Device
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {devices.map((d) => (
            <div
              key={d.id}
              className="device-card"
              style={{ borderColor: d.suspicious ? 'rgba(239,68,68,0.3)' : d.current ? 'rgba(99,102,241,0.3)' : 'var(--border)' }}
            >
              {/* Icon */}
              <div
                className="icon-badge-sm"
                style={{
                  background: d.suspicious ? 'rgba(239,68,68,0.1)' :
                               d.current ? 'rgba(99,102,241,0.1)' :
                               d.trusted ? 'rgba(34,197,94,0.1)' : 'var(--bg-surface)',
                  border: `1px solid ${d.suspicious ? 'rgba(239,68,68,0.2)' : d.current ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
                }}
              >
                <DeviceIcon
                  type={d.type}
                  color={d.suspicious ? 'var(--red)' : d.current ? 'var(--accent-hover)' : d.trusted ? 'var(--green)' : 'var(--text-muted)'}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</span>
                  {d.current && <span className="badge badge-accent">Current</span>}
                  {d.trusted && !d.current && <span className="badge badge-green">Trusted</span>}
                  {d.suspicious && <span className="badge badge-red">⚠ Suspicious</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                  <span>{d.os} • {d.browser}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {d.location}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {d.lastSeen}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  IP: {d.ip}
                </div>
              </div>

              {/* Revoke */}
              {!d.current && (
                <button
                  id={`revoke-${d.id}`}
                  onClick={() => handleRevoke(d.id)}
                  disabled={revoking === d.id}
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    color: 'var(--red)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'var(--transition)',
                    flexShrink: 0,
                  }}
                >
                  {revoking === d.id ? <div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--red)' }} /> : <Trash2 size={14} />}
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {devices.length === 0 && (
          <div className="text-center" style={{ padding: '48px 0', color: 'var(--text-muted)' }}>
            <Monitor size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No devices found</p>
          </div>
        )}
      </div>
    </div>
  )
}
