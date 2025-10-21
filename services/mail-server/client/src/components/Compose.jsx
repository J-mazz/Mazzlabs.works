import { useState } from 'react';
import { sendEmail } from '../utils/api';
import { X, Send } from 'lucide-react';
import './Compose.css';

export default function Compose({ user, onClose, onSent }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password required to send email');
      return;
    }

    setSending(true);

    try {
      await sendEmail({ to, subject, text: body, password });
      onSent();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send email');
      setSending(false);
    }
  };

  return (
    <div className="compose-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compose-header">
          <h2>New Message</h2>
          <button onClick={onClose} className="compose-close">
            <X size={20} />
          </button>
        </div>

        {error && <div className="compose-error">{error}</div>}

        <form onSubmit={handleSubmit} className="compose-form">
          <div className="compose-field">
            <label>From</label>
            <input type="text" value={user?.email || ''} disabled />
          </div>

          <div className="compose-field">
            <label>To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div className="compose-field">
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="compose-field">
            <label>Password (to send)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password"
              required
            />
          </div>

          <div className="compose-field">
            <label>Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              required
            />
          </div>

          <div className="compose-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-send" disabled={sending}>
              <Send size={18} />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
