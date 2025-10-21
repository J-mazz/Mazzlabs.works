import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (email, password) => {
  const response = await api.post('/auth/register', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const getMailboxes = async () => {
  const response = await api.get('/mailboxes');
  return response.data;
};

export const getEmails = async (mailbox = 'INBOX', limit = 50, offset = 0) => {
  const response = await api.get('/emails', {
    params: { mailbox, limit, offset }
  });
  return response.data;
};

export const getEmail = async (id) => {
  const response = await api.get(`/emails/${id}`);
  return response.data;
};

export const sendEmail = async (emailData) => {
  const response = await api.post('/emails/send', emailData);
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/emails/${id}/read`);
  return response.data;
};

export const markAsUnread = async (id) => {
  const response = await api.put(`/emails/${id}/unread`);
  return response.data;
};

export const flagEmail = async (id) => {
  const response = await api.put(`/emails/${id}/flag`);
  return response.data;
};

export const unflagEmail = async (id) => {
  const response = await api.put(`/emails/${id}/unflag`);
  return response.data;
};

export const moveEmail = async (id, mailbox) => {
  const response = await api.put(`/emails/${id}/move`, { mailbox });
  return response.data;
};

export const deleteEmail = async (id) => {
  const response = await api.delete(`/emails/${id}`);
  return response.data;
};

export const searchEmails = async (query, mailbox = null) => {
  const response = await api.get('/emails/search', {
    params: { q: query, mailbox }
  });
  return response.data;
};

export default api;
