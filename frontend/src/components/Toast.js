import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const COLORS = {
    success: { bg: '#ecfdf5', border: 'rgba(16,185,129,.25)', color: '#047857', icon: '✓' },
    error:   { bg: '#fef2f2', border: 'rgba(239,68,68,.25)',  color: '#b91c1c', icon: '✕' },
    warn:    { bg: '#fffbeb', border: 'rgba(245,158,11,.25)', color: '#b45309', icon: '⚠' },
    info:    { bg: '#f0f9ff', border: 'rgba(14,165,233,.25)', color: '#0369a1', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999,
        pointerEvents: 'none', alignItems: 'center',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} className="fade-in" style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center',
              gap: 8, pointerEvents: 'all', cursor: 'pointer', whiteSpace: 'nowrap',
              maxWidth: 420,
            }} onClick={() => removeToast(t.id)}>
              <span style={{ fontWeight: 700 }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
