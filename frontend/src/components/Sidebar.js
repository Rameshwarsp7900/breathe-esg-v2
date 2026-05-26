import React from 'react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { key: 'dashboard', label: 'Dashboard',     icon: '◈' },
  { key: 'review',    label: 'Review Queue',   icon: '⊞' },
  { key: 'ingest',    label: 'Ingest Data',    icon: '↑' },
  { key: 'batches',   label: 'Batch History',  icon: '≡' },
  { key: 'factors',   label: 'Emission Factors', icon: '⚗' },
];

export default function Sidebar({ page, setPage }) {
  const { user, currentTenant, tenants, setCurrentTenant, logout } = useAuth();
  const membership = tenants.find(t => t.slug === currentTenant?.slug);

  return (
    <nav style={{
      width: 224, flexShrink: 0, background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#22c55e"/>
            <path d="M7 14c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="2.5" fill="#000"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Breathe ESG</span>
        </div>

        {currentTenant && (
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>Client</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--text)' }}>{currentTenant.name}</div>
            <span className={`badge badge-${membership?.role === 'admin' ? 'approved' : membership?.role === 'analyst' ? 'flagged' : 'pending'}`}
                  style={{ fontSize: 10 }}>{membership?.role || 'viewer'}</span>
          </div>
        )}
        {tenants.length > 1 && (
          <select value={currentTenant?.slug || ''} onChange={e => setCurrentTenant(tenants.find(t => t.slug === e.target.value))}
            style={{ width: '100%', marginTop: 8, fontSize: 12, padding: '5px 8px' }}>
            {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = page === item.key;
          return (
            <button key={item.key} onClick={() => setPage(item.key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 'var(--r)', border: 'none',
              background: active ? 'var(--green-dim)' : 'transparent',
              color: active ? 'var(--green)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
              transition: 'all .12s', textAlign: 'left', marginBottom: 2,
              fontFamily: 'var(--font)',
            }}>
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: active ? 1 : .7 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* User footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 1 }}>
          {user?.first_name || user?.last_name
            ? `${user.first_name} ${user.last_name}`.trim()
            : user?.username}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{user?.username}</div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
