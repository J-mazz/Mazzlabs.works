import { Mail, Inbox, Send, FileText, Trash, AlertCircle, LogOut, Edit, Settings as SettingsIcon } from 'lucide-react';
import './Sidebar.css';

const iconMap = {
  'INBOX': Inbox,
  'Sent': Send,
  'Drafts': FileText,
  'Trash': Trash,
  'Spam': AlertCircle
};

export default function Sidebar({ user, mailboxes, currentMailbox, onMailboxChange, onCompose, onSettings, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Mail size={32} />
        <h2>MazzLabs Mail</h2>
      </div>

      {user && (
        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-email">{user.email}</div>
            <div className="user-storage">
              {formatBytes(user.storageUsed)} / {formatBytes(user.storageQuota)}
            </div>
          </div>
        </div>
      )}

      <button className="compose-button" onClick={onCompose}>
        <Edit size={18} />
        Compose
      </button>

      <div className="mailboxes">
        {mailboxes.map((mailbox) => {
          const Icon = iconMap[mailbox.name] || Inbox;
          return (
            <button
              key={mailbox.name}
              className={`mailbox-item ${currentMailbox === mailbox.name ? 'active' : ''}`}
              onClick={() => onMailboxChange(mailbox.name)}
            >
              <Icon size={18} />
              <span className="mailbox-name">{mailbox.name}</span>
              {mailbox.unread > 0 && (
                <span className="mailbox-badge">{mailbox.unread}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sidebar-actions">
        <button className="settings-button" onClick={onSettings}>
          <SettingsIcon size={18} />
          Settings
        </button>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
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
