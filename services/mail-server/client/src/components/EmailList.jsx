import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmails } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen } from 'lucide-react';
import './EmailList.css';

export default function EmailList({ mailbox, refreshTrigger }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmails();
  }, [mailbox, refreshTrigger]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await getEmails(mailbox);
      setEmails(data);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="email-list-loading">Loading...</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="email-list-empty">
        <Mail size={48} />
        <p>No emails in {mailbox}</p>
      </div>
    );
  }

  return (
    <div className="email-list">
      <div className="email-list-header">
        <h2>{mailbox}</h2>
        <span className="email-count">{emails.length} emails</span>
      </div>

      <div className="email-list-items">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`email-item ${!email.is_read ? 'unread' : ''}`}
            onClick={() => navigate(`/email/${email.id}`)}
          >
            <div className="email-item-icon">
              {email.is_read ? <MailOpen size={18} /> : <Mail size={18} />}
            </div>

            <div className="email-item-content">
              <div className="email-item-header">
                <span className="email-from">{email.from_address}</span>
                <span className="email-date">
                  {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                </span>
              </div>
              <div className="email-subject">{email.subject || '(No Subject)'}</div>
              <div className="email-preview">
                {email.body_text?.substring(0, 100) || ''}
              </div>
            </div>

            {email.is_flagged && <div className="email-flag">⭐</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
