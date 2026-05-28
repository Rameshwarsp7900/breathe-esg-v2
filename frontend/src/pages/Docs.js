import React, { useEffect, useState } from 'react';
import { tenantAPI } from '../api';

export default function Docs() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    tenantAPI.docs()
      .then(r => {
        setDocs(r.data);
        if (r.data.length > 0) {
          setActiveTab(r.data[0].key);
        }
      })
      .catch(() => setErr('Failed to load system documentation.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (err) {
    return <div style={{ padding: 40 }} className="alert alert-error">{err}</div>;
  }

  const activeDoc = docs.find(d => d.key === activeTab);

  // Filter docs if search is active
  const filteredContent = (content) => {
    if (!searchTerm) return content;
    const lines = content.split('\n');
    return lines
      .filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
      .join('\n');
  };

  return (
    <div className="fade-in" style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, marginBottom: 3 }}>Compliance & Calculations Documentation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}> authoritative references on Breathe ESG data structures, normalizations, and carbon audit rules</p>
        </div>
        <input
          type="text"
          placeholder="Search document content..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Navigation Tabs */}
        <div className="card card-sm" style={{ padding: 8 }}>
          <div style={{ padding: '8px 12px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)' }}>
            Knowledge Base
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {docs.map(doc => {
              const active = activeTab === doc.key;
              return (
                <button
                  key={doc.key}
                  onClick={() => { setActiveTab(doc.key); setSearchTerm(''); }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--r)',
                    border: 'none',
                    background: active ? 'var(--indigo-dim)' : 'transparent',
                    color: active ? 'var(--indigo)' : 'var(--text-muted)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {doc.title}
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontWeight: 400 }}>
                    {doc.filename}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="card" style={{ minHeight: 500 }}>
          {activeDoc ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 600 }}>{activeDoc.title}</h2>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>Source: {activeDoc.filename}</span>
                </div>
                <span className="badge badge-locked">Auditable Conv</span>
              </div>

              {searchTerm && (
                <div className="alert alert-info" style={{ marginBottom: 20, fontSize: 12 }}>
                  Showing search result lines matching: <strong>"{searchTerm}"</strong>. Clear search to view complete document.
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <pre
                  style={{
                    fontFamily: searchTerm ? 'var(--mono)' : 'var(--font)',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.6,
                  }}
                >
                  {searchTerm ? filteredContent(activeDoc.content) || "No matching lines found." : activeDoc.content}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '60px 0' }}>
              Select a compliance document from the tab menu to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
