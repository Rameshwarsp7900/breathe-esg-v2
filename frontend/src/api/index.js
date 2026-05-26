import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Attach stored token to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }
  return config;
});

// Only redirect on 401 if we actually had a token (i.e. session expired)
// Never redirect on the /auth/me/ probe that runs on page load
client.interceptors.response.use(
  r => r,
  err => {
    const isAuthMe = err.config?.url?.includes('/auth/me/');
    const hadToken = !!localStorage.getItem('authToken');
    if (err.response?.status === 401 && hadToken && !isAuthMe) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:  (u, p) => client.post('/auth/login/', { username: u, password: p }),
  logout: ()     => client.post('/auth/logout/'),
  me:     ()     => client.get('/auth/me/'),
};

export const tenantAPI = {
  dashboard:   slug          => client.get(`/tenants/${slug}/dashboard/`),
  records:     (slug, p)     => client.get(`/tenants/${slug}/records/`, { params: p }),
  record:      (slug, id)    => client.get(`/tenants/${slug}/records/${id}/`),
  approve:     (slug, id)    => client.post(`/tenants/${slug}/records/${id}/approve/`),
  flag:        (slug, id, d) => client.post(`/tenants/${slug}/records/${id}/flag/`, d),
  reject:      (slug, id, d) => client.post(`/tenants/${slug}/records/${id}/reject/`, d),
  lock:        (slug, id)    => client.post(`/tenants/${slug}/records/${id}/lock/`),
  bulkApprove: (slug, ids)   => client.post(`/tenants/${slug}/records/bulk_approve/`, { ids }),
  batches:     slug          => client.get(`/tenants/${slug}/batches/`),
  ingest:      (slug, type, fd, onProgress) =>
    client.post(`/tenants/${slug}/ingest/${type}/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
};

export default client;
