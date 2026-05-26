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
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#22c55e"/>
              <path d="M7 14c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="14" cy="14" r="2.5" fill="#000"/>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Breathe ESG</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Emissions ingestion & analyst review platform</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Sign in</h2>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Username</label>
                <input type="text" value={form.username} style={{ width: '100%' }}
                  onChange={e => setForm(p => ({...p, username: e.target.value}))} placeholder="admin" required autoFocus/>
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
          <div style={{ marginTop: 18, padding: '10px 12px', background: 'var(--bg)',
                        border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', lineHeight: 1.7 }}>
              admin / admin123 — full access<br/>
              analyst / analyst123 — review & approve<br/>
              viewer / viewer123 — read only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
