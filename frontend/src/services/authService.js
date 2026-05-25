import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Interceptors ──────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sxs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

// ── Auth Endpoints ────────────────────────────────

/** POST /auth/send-telegram-otp */
export const sendTelegramOTP = (identifier) =>
  API.post('/auth/send-telegram-otp', { identifier })

/** POST /auth/verify-telegram-otp */
export const verifyTelegramOTP = (identifier, otp) =>
  API.post('/auth/verify-telegram-otp', { identifier, otp })

/** POST /auth/register */
export const registerUser = (payload) =>
  API.post('/auth/register', payload)

/** POST /auth/verify-passcode */
export const verifyPasscode = (passcode) =>
  API.post('/auth/verify-passcode', { passcode })

/** POST /auth/set-passcode */
export const setPasscode = (passcode) =>
  API.post('/auth/set-passcode', { passcode })

// ── Biometrics ────────────────────────────────────

/** POST /auth/biometrics/register — WebAuthn registration */
export const registerBiometrics = (credential) =>
  API.post('/auth/biometrics/register', { credential })

/** POST /auth/biometrics/authenticate */
export const authenticateBiometrics = (assertion) =>
  API.post('/auth/biometrics/authenticate', { assertion })

// ── KYC ──────────────────────────────────────────

/** POST /kyc/upload */
export const uploadKYCDocument = (formData) =>
  API.post('/kyc/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/** GET /kyc/status */
export const getKYCStatus = () => API.get('/kyc/status')

// ── Devices ──────────────────────────────────────

/** GET /devices */
export const getDevices = () => API.get('/devices')

/** DELETE /devices/:id */
export const revokeDevice = (deviceId) =>
  API.delete(`/devices/${deviceId}`)

// ── Security Settings ─────────────────────────────

/** GET /security/settings */
export const getSecuritySettings = () => API.get('/security/settings')

/** PATCH /security/settings */
export const updateSecuritySettings = (settings) =>
  API.patch('/security/settings', settings)

/** POST /security/logout-all */
export const logoutAllSessions = () => API.post('/security/logout-all')

export default API
