import { useState } from 'react';
import { changePassword } from '../utils/api';
import { Lock, Save, X } from 'lucide-react';
import './Settings.css';

export default function Settings({ user, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="settings-close">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {/* Account Info Section */}
          <section className="settings-section">
            <h3>Account Information</h3>
            <div className="settings-info">
              <div className="settings-info-row">
                <label>Email</label>
                <span>{user?.email}</span>
              </div>
              <div className="settings-info-row">
                <label>Username</label>
                <span>{user?.username}</span>
              </div>
              <div className="settings-info-row">
                <label>Account Type</label>
                <span>{user?.isAdmin ? 'Administrator' : 'User'}</span>
              </div>
            </div>
          </section>

          {/* Change Password Section */}
          <section className="settings-section">
            <h3>
              <Lock size={18} />
              Change Password
            </h3>

            {error && <div className="settings-error">{error}</div>}
            {success && <div className="settings-success">{success}</div>}

            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="settings-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="settings-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  required
                  minLength={8}
                />
              </div>

              <div className="settings-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
              </div>

              <div className="settings-actions">
                <button type="submit" className="btn-save" disabled={loading}>
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </section>

          {/* Storage Info Section */}
          <section className="settings-section">
            <h3>Storage</h3>
            <div className="settings-info">
              <div className="settings-info-row">
                <label>Used</label>
                <span>{((user?.storageUsed || 0) / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="settings-info-row">
                <label>Quota</label>
                <span>{((user?.storageQuota || 0) / 1024 / 1024 / 1024).toFixed(2)} GB</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
