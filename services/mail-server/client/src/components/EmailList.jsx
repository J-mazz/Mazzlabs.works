import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmails, searchEmails } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, Search, X } from 'lucide-react';
import './EmailList.css';

export default function EmailList({ mailbox, refreshTrigger }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmails();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadEmails();
    }, 30000);

    return () => clearInterval(intervalId);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEmails();
      setIsSearching(false);
      return;
    }

    setLoading(true);
    setIsSearching(true);
    try {
      const data = await searchEmails(searchQuery, mailbox);
      setEmails(data);
    } catch (err) {
      console.error('Failed to search emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    loadEmails();
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
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
        <div className="email-list-title">
          <h2>{isSearching ? `Search in ${mailbox}` : mailbox}</h2>
          <span className="email-count">{emails.length} emails</span>
        </div>
        <div className="email-search-bar">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="search-input"
          />
          {isSearching ? (
            <button onClick={handleClearSearch} className="search-btn clear">
              <X size={18} />
            </button>
          ) : (
            <button onClick={handleSearch} className="search-btn">
              <Search size={18} />
            </button>
          )}
        </div>
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
