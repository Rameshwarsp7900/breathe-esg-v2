import React, { useEffect, useState } from 'react';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const SRC = {sap_fuel:'SAP Fuel',utility_electricity:'Electricity',travel_flights:'Travel',travel_hotels:'Hotels',travel_ground:'Ground'};

export default function BatchHistory() {
  const { currentTenant } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true);
    tenantAPI.batches(currentTenant.slug)
      .then(r => setBatches(r.data.results || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentTenant]);

  const sc = s => ({success:'var(--green)',partial:'var(--amber)',failed:'var(--red)',processing:'var(--blue)'}[s]||'var(--text-muted)');

  return (
    <div className="fade-in" style={{ padding:'24px 28px' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:19, fontWeight:600, marginBottom:3 }}>Batch History</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>All ingestion jobs — SHA-256, processing log, coverage period</p>
      </div>
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" style={{width:28,height:28}}/></div>
      ) : batches.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>No batches yet.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {batches.map(b => (
            <div key={b.id} className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'13px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}
                   onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:sc(b.status), flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{SRC[b.source_type]||b.source_type_display}</span>
                    <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {b.source_filename || '—'}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {new Date(b.uploaded_at).toLocaleString()} · {b.uploaded_by_name || 'system'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontFamily:'var(--mono)' }}>
                      {b.success_rows} <span style={{color:'var(--text-dim)'}}>/</span> {b.total_rows}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-dim)' }}>rows</div>
                  </div>
                  {b.flagged_rows > 0 && <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--amber)' }}>{b.flagged_rows}</div>
                    <div style={{ fontSize:10, color:'var(--text-dim)' }}>flagged</div>
                  </div>}
                  {b.failed_rows > 0 && <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--red)' }}>{b.failed_rows}</div>
                    <div style={{ fontSize:10, color:'var(--text-dim)' }}>errors</div>
                  </div>}
                  <span style={{ fontSize:11, color:sc(b.status), fontWeight:500 }}>{b.status_display}</span>
                  <span style={{ color:'var(--text-dim)', fontSize:12 }}>{expanded===b.id?'▲':'▼'}</span>
                </div>
              </div>
              {expanded === b.id && (
                <div style={{ padding:'0 18px 16px', borderTop:'1px solid var(--border)' }}>
                  <div style={{ paddingTop:14, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10, marginBottom:12 }}>
                    {[
                      ['Batch ID', (b.id||'').slice(0,26)+'…'],
                      ['SHA-256', (b.source_checksum||'').slice(0,26)+'…' || '—'],
                      ['Processed', b.processed_at ? new Date(b.processed_at).toLocaleString() : '—'],
                      ['Coverage', b.period_start ? `${b.period_start} → ${b.period_end||'?'}` : '—'],
                      ['Ingestion params', JSON.stringify(b.ingestion_params||{})],
                    ].map(([l,v]) => (
                      <div key={l}>
                        <div style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', wordBreak:'break-all' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {b.notes && <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Notes: {b.notes}</p>}
                  {b.processing_log?.length > 0 && (
                    <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 12px' }}>
                      <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Processing log</div>
                      {b.processing_log.map((l, i) => (
                        <div key={i} style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', padding:'2px 0' }}>
                          <span style={{ color:'var(--text-dim)', marginRight:8 }}>[{String(i).padStart(2,'0')}]</span>{l}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
