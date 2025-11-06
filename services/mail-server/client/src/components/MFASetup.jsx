import { useState } from 'react';
import axios from 'axios';
import { X, Shield, Download, Copy, Check } from 'lucide-react';
import './Compose.css';

export default function MFASetup({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: setup, 2: verify, 3: backup codes
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/users/mfa/setup');
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/users/mfa/verify-setup', {
        secret,
        code
      });

      setBackupCodes(response.data.backupCodes);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mazzlabs-mail-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  if (step === 1) {
    return (
      <div className="compose-overlay" onClick={onClose}>
        <div className="compose-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="compose-header">
            <h2>Enable Two-Factor Authentication</h2>
            <button onClick={onClose} className="compose-close">
              <X size={20} />
            </button>
          </div>

          {error && <div className="compose-error">{error}</div>}

          <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <Shield size={48} style={{ color: '#667eea' }} />
              <div>
                <h3 style={{ margin: 0, marginBottom: '5px', color: '#e0e0e0' }}>
                  Secure Your Account
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
              <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '14px', color: '#e0e0e0' }}>
                What you'll need:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#ccc' }}>
                <li style={{ marginBottom: '5px' }}>An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Your phone or device</li>
              </ul>
            </div>

            <button
              onClick={handleSetup}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Setting up...' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="compose-overlay" onClick={onClose}>
        <div className="compose-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="compose-header">
            <h2>Scan QR Code</h2>
            <button onClick={onClose} className="compose-close">
              <X size={20} />
            </button>
          </div>

          {error && <div className="compose-error">{error}</div>}

          <form onSubmit={handleVerify} style={{ padding: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#ccc', marginBottom: '15px' }}>
                Scan this QR code with your authenticator app
              </p>
              {qrCode && (
                <img
                  src={qrCode}
                  alt="MFA QR Code"
                  style={{
                    width: '200px',
                    height: '200px',
                    border: '2px solid #3a3a3a',
                    borderRadius: '8px',
                    padding: '10px',
                    background: 'white'
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', background: '#2a2a2a', borderRadius: '6px' }}>
              <p style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                Can't scan? Enter this code manually:
              </p>
              <code style={{ fontSize: '14px', color: '#667eea', wordBreak: 'break-all' }}>
                {secret}
              </code>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#ccc', fontSize: '14px' }}>
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                pattern="\d{6}"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  background: '#2a2a2a',
                  color: '#e0e0e0'
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                Enter the 6-digit code from your app
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
                opacity: (loading || code.length !== 6) ? 0.6 : 1
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="compose-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="compose-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="compose-header">
            <h2>Save Backup Codes</h2>
            <button onClick={handleComplete} className="compose-close">
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '30px' }}>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#2a3a2a', borderRadius: '8px', border: '1px solid #4a8a4a' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#8ae88a' }}>
                <strong>Two-Factor Authentication Enabled!</strong>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#ccc', marginBottom: '10px' }}>
                <strong>Save these backup codes in a safe place.</strong> You can use them to access your account if you lose your authenticator device.
              </p>
              <p style={{ fontSize: '13px', color: '#999' }}>
                Each code can only be used once.
              </p>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '6px', border: '1px solid #444' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'monospace', fontSize: '16px', color: '#e0e0e0' }}>
                {backupCodes.map((code, i) => (
                  <div key={i} style={{ padding: '5px' }}>
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCopyBackupCodes}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2a2a2a',
                  color: '#d0d0d0',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadBackupCodes}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2a2a2a',
                  color: '#d0d0d0',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Download size={18} />
                Download
              </button>
            </div>

            <button
              onClick={handleComplete}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
