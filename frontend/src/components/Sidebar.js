import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { tenantAPI } from '../api';

const NAV = [
  { key: 'dashboard', label: 'Dashboard',        icon: '◈' },
  { key: 'review',    label: 'Review Queue',      icon: '⊞', badge: true },
  { key: 'ingest',    label: 'Ingest Data',       icon: '↑' },
  { key: 'batches',   label: 'Batch History',     icon: '≡' },
  { key: 'factors',   label: 'Emission Factors',  icon: '⚗' },
  { key: 'advanced',  label: 'Advanced Sandbox',  icon: '⚛' },
];

export default function Sidebar({ page, setPage }) {
  const { user, currentTenant, tenants, setCurrentTenant, logout } = useAuth();
  const membership = tenants.find(t => t.slug === currentTenant?.slug);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!currentTenant) return;
    tenantAPI.pendingCount(currentTenant.slug)
      .then(r => setPendingCount(r.data.count || 0))
      .catch(() => {});
  }, [currentTenant]);

  return (
    <nav
      aria-label="Main Navigation"
      style={{
        width: 240, flexShrink: 0, background: '#ffffff',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0, overflow: 'hidden',
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            aria-hidden="true"
            style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--indigo)',
              display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(95, 59, 246, 0.2)'
            }}
          >
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>B</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text)' }}>Breathe ESG</span>
        </div>

        {currentTenant && (
          <div style={{ 
            background: '#fafbfc', 
            borderRadius: 'var(--r-lg)', 
            border: '1px solid var(--border)', 
            padding: '10px 14px' 
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, fontWeight: 600 }}>Client Organization</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{currentTenant.name}</div>
            <span className={`badge badge-${membership?.role === 'admin' ? 'approved' : membership?.role === 'analyst' ? 'flagged' : 'pending'}`}
                  style={{ fontSize: 10 }}>{membership?.role || 'viewer'}</span>
          </div>
        )}
        
        {tenants.length > 1 && (
          <select 
            aria-label="Switch organization"
            value={currentTenant?.slug || ''} 
            onChange={e => setCurrentTenant(tenants.find(t => t.slug === e.target.value))}
            style={{ width: '100%', marginTop: 10, fontSize: 12, padding: '6px 10px', background: '#fafbfc', border: '1px solid var(--border-mid)' }}
          >
            {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Navigation Items */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(item => {
          const active = page === item.key;
          const handleFocus = e => {
            if (!active) {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text)';
            }
          };
          const handleBlur = e => {
            if (!active) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }
          };
          return (
            <button 
              key={item.key} 
              onClick={() => setPage(item.key)}
              aria-current={active ? 'page' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--r)', border: 'none',
                background: active ? 'var(--indigo-dim)' : 'transparent',
                color: active ? 'var(--indigo)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.12s ease', textAlign: 'left',
                fontFamily: 'var(--font)',
              }}
              onMouseEnter={handleFocus}
              onMouseLeave={handleBlur}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 16, width: 20, textAlign: 'center',
                  color: active ? 'var(--indigo)' : 'var(--text-dim)',
                  opacity: active ? 1 : 0.8
                }}
              >
                {item.icon}
              </span>
              {item.label}
              {item.badge && pendingCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--amber)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  minWidth: 18, textAlign: 'center',
                }}>{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#fafbfc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--indigo-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--indigo)', fontWeight: 600, fontSize: 13
          }}>
            {user?.username?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
              {user?.first_name || user?.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user?.username}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || user?.username}</div>
          </div>
        </div>
        
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--border-mid)' }} 
          onClick={logout}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
