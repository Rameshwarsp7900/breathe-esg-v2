import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(form.username, form.password); }
    catch (err) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380 }} className="fade-in">
        
        {/* Brand Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--indigo)',
              display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(95, 59, 246, 0.2)'
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>B</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Breathe ESG</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Emissions ingestion & analyst review platform</p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Sign in</h2>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Username</label>
                <input type="text" value={form.username} style={{ width: '100%' }}
                  onChange={e => setForm(p => ({...p, username: e.target.value}))} placeholder="Enter your username" required autoFocus/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Password</label>
                <input type="password" value={form.password} style={{ width: '100%' }}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="••••••••" required/>
              </div>
              
              {error && <div className="alert alert-error" style={{ fontSize: 12 }}>{error}</div>}
              
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }}/> : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
