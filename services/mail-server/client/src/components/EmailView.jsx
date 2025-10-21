import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmail, markAsRead, deleteEmail, flagEmail, unflagEmail } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Trash2, Star, StarOff } from 'lucide-react';
import './EmailView.css';

export default function EmailView({ onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmail();
  }, [id]);

  const loadEmail = async () => {
    setLoading(true);
    try {
      const data = await getEmail(id);
      setEmail(data);
      if (!data.is_read) {
        await markAsRead(id);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to load email:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this email?')) {
      try {
        await deleteEmail(id);
        navigate('/');
        onRefresh();
      } catch (err) {
        console.error('Failed to delete email:', err);
      }
    }
  };

  const handleFlag = async () => {
    try {
      if (email.is_flagged) {
        await unflagEmail(id);
        setEmail({ ...email, is_flagged: 0 });
      } else {
        await flagEmail(id);
        setEmail({ ...email, is_flagged: 1 });
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to flag email:', err);
    }
  };

  if (loading) {
    return <div className="email-view-loading">Loading...</div>;
  }

  if (!email) {
    return <div className="email-view-error">Email not found</div>;
  }

  return (
    <div className="email-view">
      <div className="email-view-toolbar">
        <button onClick={() => navigate('/')} className="toolbar-btn">
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="toolbar-actions">
          <button onClick={handleFlag} className="toolbar-btn">
            {email.is_flagged ? <StarOff size={18} /> : <Star size={18} />}
          </button>
          <button onClick={handleDelete} className="toolbar-btn danger">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="email-view-content">
        <div className="email-view-header">
          <h1 className="email-view-subject">{email.subject || '(No Subject)'}</h1>

          <div className="email-view-meta">
            <div className="email-view-from">
              <strong>From:</strong> {email.from_address}
            </div>
            <div className="email-view-to">
              <strong>To:</strong> {email.to_address}
            </div>
            {email.cc && (
              <div className="email-view-cc">
                <strong>CC:</strong> {email.cc}
              </div>
            )}
            <div className="email-view-date">
              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        <div className="email-view-body">
          {email.body_html ? (
            <iframe
              srcDoc={email.body_html}
              sandbox="allow-same-origin"
              className="email-html-frame"
              title="Email content"
            />
          ) : (
            <pre className="email-text-body">{email.body_text}</pre>
          )}
        </div>

        {email.attachments && JSON.parse(email.attachments).length > 0 && (
          <div className="email-attachments">
            <h3>Attachments</h3>
            {JSON.parse(email.attachments).map((att, idx) => (
              <div key={idx} className="attachment-item">
                {att.filename} ({formatBytes(att.size)})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
