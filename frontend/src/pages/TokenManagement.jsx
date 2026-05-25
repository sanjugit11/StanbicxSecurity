import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ShieldCheck, ArrowLeft, ArrowRight, Send, RefreshCw, 
  Layers, Monitor, Settings, Wallet, Cpu, Coins, Copy, Check 
} from 'lucide-react'
import { useTame } from '../components/TameNotification'
import { addNotification } from '../services/storageService'
import { connectWallet, getBalance, mintToken, transferToken } from '../services/blockchainService'

const CONTRACT_ADDRESS = '0x76166d0B869aB54ddC4deEA690A300B4d8cD0022'

export default function TokenManagement() {
  const navigate = useNavigate()
  const { push } = useTame()
  const [wallet, setWallet] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [mintTo, setMintTo] = useState('')
  const [mintAmt, setMintAmt] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmt, setTransferAmt] = useState('')

  // Connect wallet on component mount if possible
  useEffect(() => {
    ;(async () => {
      try {
        const addr = await connectWallet()
        setWallet(addr)
        const bal = await getBalance(addr)
        setBalance(bal)
      } catch (e) {
        console.warn(e.message)
      }
    })()
  }, [])

  const refreshBalance = async () => {
    if (!wallet) return
    try {
      const bal = await getBalance(wallet)
      setBalance(bal)
      push({ type: 'success', title: 'Balance Updated', message: `Current Balance: ${bal} tokens` })
    } catch (e) {
      setError(e.message)
    }
  }

  const handleConnect = async () => {
    setError('')
    setLoading(true)
    try {
      const addr = await connectWallet()
      setWallet(addr)
      const bal = await getBalance(addr)
      setBalance(bal)
      push({ type: 'success', title: 'Wallet Connected', message: `Successfully connected: ${addr.slice(0, 6)}...${addr.slice(-4)}` })
      addNotification({
        type: 'wallet',
        title: 'MetaMask Connected',
        message: `Wallet ${addr.slice(0, 6)}...${addr.slice(-4)} linked successfully.`
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMint = async () => {
    if (!mintTo || !mintAmt) { setError('Provide target address & token amount'); return }
    setLoading(true); setError('')
    try {
      const txHash = await mintToken(mintTo, mintAmt)
      push({ type: 'success', title: 'Mint Executed', message: `Transaction broadcasted successfully!` })
      addNotification({
        type: 'blockchain',
        title: 'Token Minted',
        message: `Minted ${mintAmt} tokens to ${mintTo.slice(0,6)}...`
      })
      await refreshBalance()
      setMintTo('')
      setMintAmt('')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const handleTransfer = async () => {
    if (!transferTo || !transferAmt) { setError('Provide recipient address & token amount'); return }
    setLoading(true); setError('')
    try {
      const txHash = await transferToken(transferTo, transferAmt)
      push({ type: 'success', title: 'Transfer Sent', message: `Transaction broadcasted successfully!` })
      addNotification({
        type: 'blockchain',
        title: 'Tokens Transferred',
        message: `Transferred ${transferAmt} tokens to ${transferTo.slice(0,6)}...`
      })
      await refreshBalance()
      setTransferTo('')
      setTransferAmt('')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const copyContractAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    push({ type: 'info', title: 'Copied', message: 'Contract address copied to clipboard.' })
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
          <Link to="/security" className="nav-link"><Settings size={15} />Security</Link>
          <Link to="/account-info" className="nav-link"><ShieldCheck size={15} />KYC</Link>
          <Link to="/token-management" className="nav-link active"><Layers size={15} />Contract Interaction</Link>
        </div>
      </nav>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1080, margin: '0 auto', paddingTop: 12 }}>
        
        {/* Left Column: Wallet Status & Contract Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Wallet Connection Card */}
          <div className="card-wide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} color="var(--cyan)" />
                MetaMask Wallet
              </h2>
              {wallet && (
                <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  ● Connected
                </span>
              )}
            </div>

            {wallet ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Wallet Details */}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Connected Address</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {wallet}
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(wallet);
                        push({ type: 'info', title: 'Address Copied', message: 'Wallet address copied to clipboard.' });
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      title="Copy Address"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Token Balance */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Token Balance</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {balance} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>STX</span>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '8px 10px', height: 'auto', width: 'auto' }} onClick={refreshBalance} title="Refresh Balance">
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Coins size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                  Connect your MetaMask wallet to view your token balance and perform secure contract transactions.
                </p>
                <button className="btn btn-primary" onClick={handleConnect} disabled={loading} style={{ margin: '0 auto', maxWidth: 220 }}>
                  {loading ? <div className="loader" /> : 'Connect MetaMask'}
                </button>
              </div>
            )}
          </div>

          {/* Contract Metadata Card */}
          <div className="card-wide">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Cpu size={20} color="var(--accent-hover)" />
              Smart Contract Specifications
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Token Name</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>StanbicX Secure Token</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Token Symbol</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>STX</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Standard</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>ERC-20 Role-Based Access Control</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Network</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Sepolia / Local Hardhat Devnet</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Contract Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                    {CONTRACT_ADDRESS}
                  </span>
                  <button 
                    onClick={copyContractAddress}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                  >
                    {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Mint Section */}
          <div className="card-wide">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Coins size={20} color="var(--amber)" />
              Mint Secure Tokens
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Mint new STX tokens to any designated cryptographic address. (Minter role required)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Minter Target Address</label>
                <div className="input-wrap">
                  <span className="input-icon"><Wallet size={15} /></span>
                  <input 
                    id="mint-address-input"
                    className="input" 
                    placeholder="0x..." 
                    value={mintTo} 
                    onChange={e => setMintTo(e.target.value)} 
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Amount to Mint (STX)</label>
                <div className="input-wrap">
                  <span className="input-icon"><Coins size={15} /></span>
                  <input 
                    id="mint-amount-input"
                    className="input" 
                    placeholder="0.00" 
                    type="number" 
                    value={mintAmt} 
                    onChange={e => setMintAmt(e.target.value)} 
                  />
                </div>
              </div>

              {error && (
                <div className="info-block red" style={{ margin: 0 }}>
                  <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
                </div>
              )}

              <button className="btn btn-primary" onClick={handleMint} disabled={loading || !wallet} style={{ marginTop: 8 }}>
                {loading ? <div className="loader" /> : <><Send size={14} /> Mint Tokens</>}
              </button>
            </div>
          </div>

          {/* Transfer Section */}
          <div className="card-wide">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Send size={20} color="var(--accent-hover)" />
              Transfer Tokens
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Transfer your personal STX tokens to another recipient wallet address securely.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Recipient Wallet Address</label>
                <div className="input-wrap">
                  <span className="input-icon"><Wallet size={15} /></span>
                  <input 
                    id="transfer-address-input"
                    className="input" 
                    placeholder="0x..." 
                    value={transferTo} 
                    onChange={e => setTransferTo(e.target.value)} 
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Amount to Transfer (STX)</label>
                <div className="input-wrap">
                  <span className="input-icon"><Coins size={15} /></span>
                  <input 
                    id="transfer-amount-input"
                    className="input" 
                    placeholder="0.00" 
                    type="number" 
                    value={transferAmt} 
                    onChange={e => setTransferAmt(e.target.value)} 
                  />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleTransfer} disabled={loading || !wallet} style={{ marginTop: 8 }}>
                {loading ? <div className="loader" /> : <><ArrowRight size={14} /> Send Tokens</>}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
