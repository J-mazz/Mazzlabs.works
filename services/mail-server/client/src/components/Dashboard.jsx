import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getMailboxes, getCurrentUser } from '../utils/api';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import Compose from './Compose';
import Settings from './Settings';
import './Dashboard.css';

export default function Dashboard({ token, onLogout }) {
  const [mailboxes, setMailboxes] = useState([]);
  const [currentMailbox, setCurrentMailbox] = useState('INBOX');
  const [user, setUser] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const [userInfo, mailboxData] = await Promise.all([
        getCurrentUser(),
        getMailboxes()
      ]);
      setUser(userInfo);
      setMailboxes(mailboxData);
    } catch (err) {
      console.error('Failed to load data:', err);
      if (err.response?.status === 401) {
        onLogout();
      }
    }
  };

  const refreshMailboxes = () => {
    loadData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReply = (initialData) => {
    setComposeInitialData(initialData);
    setShowCompose(true);
  };

  const handleForward = (initialData) => {
    setComposeInitialData(initialData);
    setShowCompose(true);
  };

  const handleCloseCompose = () => {
    setShowCompose(false);
    setComposeInitialData(null);
  };

  return (
    <div className="dashboard">
      <Sidebar
        user={user}
        mailboxes={mailboxes}
        currentMailbox={currentMailbox}
        onMailboxChange={setCurrentMailbox}
        onCompose={() => setShowCompose(true)}
        onSettings={() => setShowSettings(true)}
        onLogout={onLogout}
      />

      <div className="dashboard-main">
        <Routes>
          <Route
            path="/"
            element={
              <EmailList
                mailbox={currentMailbox}
                refreshTrigger={refreshTrigger}
              />
            }
          />
          <Route
            path="/email/:id"
            element={
              <EmailView
                onRefresh={refreshMailboxes}
                onReply={handleReply}
                onForward={handleForward}
              />
            }
          />
        </Routes>
      </div>

      {showCompose && (
        <Compose
          user={user}
          initialData={composeInitialData}
          onClose={handleCloseCompose}
          onSent={() => {
            handleCloseCompose();
            refreshMailboxes();
          }}
        />
      )}

      {showSettings && (
        <Settings
          user={user}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
