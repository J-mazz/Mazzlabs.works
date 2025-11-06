import { useState } from 'react';
import axios from 'axios';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

export default function MFAVerification({ mfaToken, onSuccess }) {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/verify-mfa', {
        mfaToken,
        code: useBackupCode ? undefined : code,
        backupCode: useBackupCode ? backupCode : undefined
      });

      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 15 }
    }
  };

  return (
    <div className="auth-container">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="auth-particle"
          style={{
            width: Math.random() * 300 + 100,
            height: Math.random() * 300 + 100,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      <motion.div
        className="auth-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="auth-header" variants={itemVariants}>
          <motion.div variants={iconVariants}>
            <Shield size={48} className="auth-icon" />
          </motion.div>
          <h1>Two-Factor Authentication</h1>
          <p>Enter the code from your authenticator app</p>
        </motion.div>

        {error && (
          <motion.div
            className="auth-error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!useBackupCode ? (
            <motion.div className="form-group" variants={itemVariants}>
              <label htmlFor="code">Authentication Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                style={{
                  fontSize: '24px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </motion.div>
          ) : (
            <motion.div className="form-group" variants={itemVariants}>
              <label htmlFor="backupCode">Backup Code</label>
              <input
                id="backupCode"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                required
                maxLength={8}
                style={{
                  fontSize: '18px',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                Enter one of your backup codes
              </p>
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="auth-button"
            disabled={loading}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </motion.button>
        </form>

        <motion.div className="auth-footer" variants={itemVariants}>
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setBackupCode('');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              font: 'inherit'
            }}
          >
            {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
