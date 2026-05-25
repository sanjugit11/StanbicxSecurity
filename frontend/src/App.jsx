import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TameProvider } from './components/TameNotification'
import Login from './pages/Login'
import OTPVerification from './pages/OTPVerification'
import CreateAccount from './pages/CreateAccount'
import AccountInfo from './pages/AccountInfo'
import PasscodeSetup from './pages/PasscodeSetup'
import BiometricsSetup from './pages/BiometricsSetup'
import KYCVerification from './pages/KYCVerification'
import DeviceDashboard from './pages/DeviceDashboard'
import SecuritySettings from './pages/SecuritySettings'

export default function App() {
  return (
    <TameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/otp" element={<OTPVerification />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/account-info" element={<AccountInfo />} />
          <Route path="/passcode" element={<PasscodeSetup />} />
          <Route path="/biometrics" element={<BiometricsSetup />} />
          <Route path="/kyc" element={<KYCVerification />} />
          <Route path="/devices" element={<DeviceDashboard />} />
          <Route path="/security" element={<SecuritySettings />} />
        </Routes>
      </BrowserRouter>
    </TameProvider>
  )
}
