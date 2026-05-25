// StanbicX Local Storage Service
// Handles: user data, passcode (AVV), biometrics (WebAuthn mock), KYC files, notifications

const KEYS = {
  USER:          'sxs_user',
  PASSCODE:      'sxs_passcode',
  BIOMETRICS:    'sxs_biometrics',
  KYC_META:      'sxs_kyc_meta',
  KYC_FILES:     'sxs_kyc_files',
  NOTIFICATIONS: 'sxs_notifications',
  TOKEN:         'sxs_token',
  ONBOARDING:    'sxs_onboarding',
}

// ── Simple hash (demo only, NOT production crypto) ────────────────────────────
const djb2Hash = (str) => {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
  return h.toString(16)
}

// ── User ──────────────────────────────────────────────────────────────────────
export const saveUser = (user) =>
  localStorage.setItem(KEYS.USER, JSON.stringify({ ...user, updatedAt: new Date().toISOString() }))

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.USER)) } catch { return null }
}

// ── Passcode ──────────────────────────────────────────────────────────────────
export const savePasscode = (code) =>
  localStorage.setItem(KEYS.PASSCODE, JSON.stringify({
    hash: djb2Hash(code),
    createdAt: new Date().toISOString(),
  }))

export const verifyPasscode = (code) => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS.PASSCODE))
    return stored?.hash === djb2Hash(code)
  } catch { return false }
}

export const hasPasscode = () => !!localStorage.getItem(KEYS.PASSCODE)

// ── AVV: Passcode validation against DOB + simplicity rules ───────────────────
export const validatePasscodeAVV = (code, dob) => {
  const issues = []

  // Simplicity rules
  if (/^(\d)\1{5}$/.test(code)) issues.push('Cannot use all identical digits')
  if (['123456','654321','123123','000000','111111','999999','112233','121212'].includes(code))
    issues.push('Passcode is too predictable')

  // DOB check (HTML date input: YYYY-MM-DD)
  if (dob) {
    const [year, month, day] = dob.split('-')
    if (year && month && day) {
      const yy = year.slice(2)
      const patterns = [
        day + month + yy,
        month + day + yy,
        yy + month + day,
        day + month + year,
        year + month + day,
      ].map(p => p.replace(/\D/g, '').slice(0, 6))

      const matched = patterns.some(p => p.length >= 4 && code.includes(p.slice(0, 4)))
      if (matched) issues.push('Passcode must not be based on your date of birth')
    }
  }

  return { valid: issues.length === 0, issues }
}

// ── Biometrics (WebAuthn Mock) ────────────────────────────────────────────────
export const saveBiometrics = (method) => {
  const credential = {
    method,
    credentialId:      `cred_${btoa(Math.random().toString()).replace(/[^a-z0-9]/gi,'').slice(0,16)}`,
    publicKey:         `pk_${Array.from({length:32},()=>Math.floor(Math.random()*16).toString(16)).join('')}`,
    attestationFormat: 'packed',
    alg:               -7, // ES256
    counter:           0,
    registeredAt:      new Date().toISOString(),
    deviceInfo: {
      userAgent: navigator.userAgent.slice(0, 100),
      platform:  navigator.platform || 'Web',
    },
  }
  localStorage.setItem(KEYS.BIOMETRICS, JSON.stringify(credential))
  return credential
}

export const getBiometrics = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.BIOMETRICS)) } catch { return null }
}

export const hasBiometrics = () => !!localStorage.getItem(KEYS.BIOMETRICS)

// ── KYC ───────────────────────────────────────────────────────────────────────
export const saveKYCMeta = (meta) =>
  localStorage.setItem(KEYS.KYC_META, JSON.stringify({
    ...meta,
    status:      'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt:  null,
  }))

export const getKYCMeta = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.KYC_META)) } catch { return null }
}

// Store file metadata + base64 previews in sessionStorage
export const saveKYCFiles = async (files) => {
  const toBase64 = (file) => new Promise((res, rej) => {
    if (!file) { res(null); return }
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const meta = {
    front:  files.front  ? { name: files.front.name,  size: files.front.size,  type: files.front.type  } : null,
    back:   files.back   ? { name: files.back.name,   size: files.back.size,   type: files.back.type   } : null,
    selfie: files.selfie ? { name: files.selfie.name, size: files.selfie.size, type: files.selfie.type } : null,
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(KEYS.KYC_FILES, JSON.stringify(meta))

  // Store image previews in sessionStorage (best-effort)
  try {
    const [front64, selfie64] = await Promise.all([toBase64(files.front), toBase64(files.selfie)])
    if (front64)  sessionStorage.setItem('sxs_kyc_front_preview',  front64)
    if (selfie64) sessionStorage.setItem('sxs_kyc_selfie_preview', selfie64)
  } catch { /* storage full – skip previews */ }

  return meta
}

export const getKYCFiles = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.KYC_FILES)) } catch { return null }
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || [] } catch { return [] }
}

export const addNotification = (notif) => {
  const list = getNotifications()
  const n = { id: `notif_${Date.now()}`, timestamp: new Date().toISOString(), read: false, ...notif }
  list.unshift(n)
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list.slice(0, 100)))
  return n
}

export const markAllNotificationsRead = () => {
  const list = getNotifications().map(n => ({ ...n, read: true }))
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list))
}

export const getUnreadCount = () => getNotifications().filter(n => !n.read).length

// ── Onboarding state ──────────────────────────────────────────────────────────
export const getOnboarding = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.ONBOARDING)) || {} } catch { return {} }
}
export const setOnboarding = (data) =>
  localStorage.setItem(KEYS.ONBOARDING, JSON.stringify({ ...getOnboarding(), ...data }))

// ── Token ─────────────────────────────────────────────────────────────────────
export const saveToken = (token) => localStorage.setItem(KEYS.TOKEN, token)
export const getToken  = ()      => localStorage.getItem(KEYS.TOKEN)

// ── Clear all ─────────────────────────────────────────────────────────────────
export const clearAll = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  sessionStorage.clear()
}
