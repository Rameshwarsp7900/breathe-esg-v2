import React, { useEffect, useState, useCallback } from 'react';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const FLAG_LABELS = {
  unit_mismatch:'Unit Mismatch', missing_unit:'Missing Unit', outlier_value:'Outlier',
  unknown_plant:'Unknown Plant', missing_period:'Missing Period', negative_value:'Negative Value',
  missing_distance:'Missing Distance', manual_review:'Manual Flag', duplicate_suspect:'Duplicate?',
};
const STATUS_OPTS = [
  {v:'pending_review',l:'Pending Review'},{v:'flagged',l:'Flagged'},
  {v:'approved',l:'Approved'},{v:'locked',l:'Locked'},{v:'rejected',l:'Rejected'},
];
const SOURCE_OPTS = [
  {v:'sap_fuel',l:'SAP Fuel'},{v:'utility_electricity',l:'Electricity'},
  {v:'travel_flights',l:'Flights'},{v:'travel_hotels',l:'Hotels'},{v:'travel_ground',l:'Ground'},
];

function ScopeBadge({ scope }) {
  const cls = {'1':'badge-s1','2':'badge-s2','3':'badge-s3'}[scope]||'badge-pending';
  return <span className={`badge ${cls}`}>S{scope}</span>;
}
function StatusBadge({ status }) {
  const cfg = {
    pending_review:{cls:'badge-pending',l:'Pending'},flagged:{cls:'badge-flagged',l:'Flagged'},
    approved:{cls:'badge-approved',l:'Approved'},locked:{cls:'badge-locked',l:'Locked'},
    rejected:{cls:'badge-rejected',l:'Rejected'},
  };
  const c = cfg[status]||{cls:'badge-pending',l:status};
  return <span className={`badge ${c.cls}`}>{c.l}</span>;
}

function DetailPanel({ record: r, slug, onClose, onAction }) {
  const { toast } = useToast();
  const [flagForm, setFlagForm] = useState({ codes: [], notes: '' });
  const [rejectNotes, setRejectNotes] = useState('');
  const [acting, setActing] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editQty, setEditQty] = useState(r.raw_quantity ?? '');
  const [editUnit, setEditUnit] = useState(r.raw_unit ?? '');

  const act = async (action) => {
    setActing(action);
    try {
      if (action === 'approve')      await tenantAPI.approve(slug, r.id);
      else if (action === 'flag')    await tenantAPI.flag(slug, r.id, { codes: flagForm.codes, notes: flagForm.notes });
      else if (action === 'reject')  await tenantAPI.reject(slug, r.id, { notes: rejectNotes });
      else if (action === 'lock')    await tenantAPI.lock(slug, r.id);
      const labels = { approve:'Approved', flag:'Flagged', reject:'Rejected', lock:'Locked for audit' };
      toast(`${labels[action] || action} successfully`, action === 'reject' ? 'warn' : 'success');
      onAction();
    } catch (e) {
      toast(e.response?.data?.error || String(e), 'error');
    }
    setActing('');
  };

  const saveEdit = async () => {
    try {
      await tenantAPI.edit(slug, r.id, { raw_quantity: parseFloat(editQty), raw_unit: editUnit });
      toast('Record updated', 'success');
      setEditMode(false);
      onAction();
    } catch (e) {
      toast(e.response?.data?.error || 'Edit failed', 'error');
    }
  };

  const co2t = r.co2e_kg != null ? (r.co2e_kg / 1000).toFixed(4) : '—';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(4px)',
                  zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:16 }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ width:500, maxHeight:'calc(100vh - 32px)', overflow:'auto',
           background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)' }}>
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)',
                      display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <ScopeBadge scope={r.scope}/>
            <span style={{ fontSize:14, fontWeight:600 }}>{r.category}</span>
            <StatusBadge status={r.status}/>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)',
                  cursor:'pointer', fontSize:18, lineHeight:1, padding:'2px 4px' }}>✕</button>
        </div>

        <div style={{ padding:18 }}>
          {/* Flags */}
          {r.flag_codes?.length > 0 && (
            <div style={{ marginBottom:16, padding:'10px 12px', background:'var(--amber-dim)',
                          border:'1px solid rgba(245,158,11,.3)', borderRadius:'var(--r)' }}>
              <div style={{ fontSize:10, color:'var(--amber)', fontWeight:600, textTransform:'uppercase',
                            letterSpacing:'.07em', marginBottom:6 }}>Flags</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {r.flag_codes.map(f => (
                  <span key={f} className="tag" style={{ color:'var(--amber)', borderColor:'rgba(245,158,11,.3)' }}>
                    {FLAG_LABELS[f]||f}
                  </span>
                ))}
              </div>
              {r.flag_notes && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>{r.flag_notes}</p>}
            </div>
          )}

          {/* Key fields grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              ['Source type', (r.source_type||'').replace(/_/g,' ')],
              ['Period', r.activity_date || '—'],
              ['Location', r.location || '—'],
              ['Plant code', r.plant_code || '—'],
              ['Normalised', r.quantity_norm != null ? `${r.quantity_norm} ${r.normalized_unit}` : '—'],
              ['Conversion', r.conversion_applied || 'None'],
              ['EF source', r.emission_factor_source || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', wordBreak:'break-word' }}>{v}</div>
              </div>
            ))}
            {/* Editable raw quantity */}
            <div>
              <div style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Raw quantity</div>
              {editMode ? (
                <div style={{ display:'flex', gap:4 }}>
                  <input value={editQty} onChange={e => setEditQty(e.target.value)} style={{ width:80, fontSize:12, padding:'3px 6px' }}/>
                  <input value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ width:60, fontSize:12, padding:'3px 6px' }}/>
                </div>
              ) : (
                <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>
                  {r.raw_quantity != null ? `${r.raw_quantity} ${r.raw_unit}` : '—'}
                </div>
              )}
            </div>
          </div>

          {/* CO2e highlight */}
          <div style={{ padding:'12px 16px', background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)',
                        borderRadius:'var(--r)', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>CO₂e</span>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:18, fontWeight:600, color:'var(--green)', fontFamily:'var(--mono)' }}>
                {r.co2e_kg != null ? r.co2e_kg.toLocaleString(undefined,{maximumFractionDigits:2}) : '—'} kg
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{co2t} tCO₂e</div>
            </div>
          </div>

          {/* Raw snapshot */}
          <details style={{ marginBottom:14 }}>
            <summary style={{ fontSize:12, color:'var(--text-muted)', cursor:'pointer', padding:'4px 0', userSelect:'none' }}>
              Raw source data ▾
            </summary>
            <pre style={{ fontSize:10, color:'var(--text-dim)', background:'var(--bg)', padding:10,
                          borderRadius:'var(--r)', border:'1px solid var(--border)', overflow:'auto',
                          maxHeight:160, marginTop:6, fontFamily:'var(--mono)', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
              {JSON.stringify(r.raw_data_snapshot, null, 2)}
            </pre>
          </details>

          {/* Source-specific */}
          {r.source_specific && Object.keys(r.source_specific).length > 0 && (
            <details style={{ marginBottom:14 }}>
              <summary style={{ fontSize:12, color:'var(--text-muted)', cursor:'pointer', padding:'4px 0', userSelect:'none' }}>
                Source metadata ▾
              </summary>
              <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(r.source_specific).filter(([,v]) => v && v !== 'unknown' && v !== '').map(([k, v]) => (
                  <div key={k} style={{ fontSize:11 }}>
                    <span style={{ color:'var(--text-dim)' }}>{k}: </span>
                    <span className="mono" style={{ color:'var(--text-muted)' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Audit trail */}
          {r.edit_history?.length > 0 && (
            <details style={{ marginBottom:14 }}>
              <summary style={{ fontSize:12, color:'var(--text-muted)', cursor:'pointer', padding:'4px 0', userSelect:'none' }}>
                Audit trail ({r.edit_history.length}) ▾
              </summary>
              <div style={{ marginTop:6 }}>
                {r.edit_history.map((e, i) => (
                  <div key={i} style={{ fontSize:11, padding:'4px 0', borderBottom:'1px solid var(--border)',
                                        color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                    <span style={{ color:'var(--text-dim)' }}>{new Date(e.ts).toLocaleString()} </span>
                    {e.user} · {e.field}: <span style={{ color:'var(--red)' }}>{e.old}</span> →
                    <span style={{ color:'var(--green)' }}> {e.new}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Actions */}
          {!r.is_locked ? (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                <button className="btn btn-approve" onClick={() => act('approve')}
                  disabled={!!acting || r.status === 'approved'} style={{ flex:1 }}>
                  {acting==='approve' ? <span className="spinner" style={{width:13,height:13}}/> : '✓ Approve'}
                </button>
                {r.status === 'approved' && (
                  <button className="btn btn-lock" onClick={() => act('lock')} disabled={!!acting} style={{ flex:1 }}>
                    {acting==='lock' ? <span className="spinner" style={{width:13,height:13}}/> : '🔒 Lock for Audit'}
                  </button>
                )}
                <button className="btn btn-reject" onClick={() => act('reject')} disabled={!!acting} style={{ flex:1 }}>
                  {acting==='reject' ? <span className="spinner" style={{width:13,height:13}}/> : '✕ Reject'}
                </button>
                {!editMode ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)} title="Edit raw quantity/unit">✏ Edit</button>
                ) : (
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-approve btn-sm" onClick={saveEdit}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                )}
              </div>

              {/* Reject notes */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Rejection reason (optional)</label>
                <input value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
                  placeholder="Describe why this is rejected…" style={{ width:'100%', fontSize:12 }}/>
              </div>

              {/* Flag section */}
              <div style={{ background:'var(--bg)', borderRadius:'var(--r)', padding:12, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginBottom:8 }}>Flag for review</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                  {Object.entries(FLAG_LABELS).map(([k, l]) => (
                    <label key={k} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:12 }}>
                      <input type="checkbox"
                        checked={flagForm.codes.includes(k)}
                        onChange={e => setFlagForm(p => ({
                          ...p, codes: e.target.checked ? [...p.codes, k] : p.codes.filter(c => c !== k)
                        }))}
                      /> {l}
                    </label>
                  ))}
                </div>
                <textarea value={flagForm.notes} onChange={e => setFlagForm(p => ({...p, notes: e.target.value}))}
                  placeholder="Describe the issue for the next analyst…"
                  style={{ width:'100%', minHeight:56, resize:'vertical', fontSize:12, marginBottom:8 }}/>
                <button className="btn btn-flag btn-sm" onClick={() => act('flag')}
                  disabled={!!acting || flagForm.codes.length === 0}>
                  {acting==='flag' ? <span className="spinner" style={{width:12,height:12}}/> : 'Submit flag'}
                </button>
              </div>
            </div>
          ) : (
            <div className="alert alert-info" style={{ fontSize:12 }}>
              🔒 This record is locked for audit. Locked at {new Date(r.locked_at).toLocaleString()}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  const { currentTenant } = useAuth();
  const { toast } = useToast();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ status: 'pending_review', scope: '', source_type: '', search: '', batch: '', date_from: '', date_to: '' });
  const [page, setPage]         = useState(1);
  const [totalCount, setTotal]  = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail]     = useState(null);
  const [bulkLoading, setBulk]  = useState(false);
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const params = { ...filters, page };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const r = await tenantAPI.records(currentTenant.slug, params);
      setRecords(r.data.results || r.data);
      setTotal(r.data.count || (r.data.results || r.data).length);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [currentTenant, filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => { setFilters(p => ({...p, [k]: v})); setPage(1); setSelected(new Set()); };

  const handleBulkApprove = async () => {
    if (!selected.size) return;
    setBulk(true);
    try {
      const r = await tenantAPI.bulkApprove(currentTenant.slug, [...selected]);
      toast(`Approved ${r.data.approved} records`, 'success');
    } catch (e) { toast('Bulk approve failed', 'error'); }
    setSelected(new Set()); load();
    setBulk(false);
  };

  const handleBulkReject = async () => {
    if (!selected.size) return;
    setBulk(true);
    try {
      const r = await tenantAPI.bulkReject(currentTenant.slug, [...selected], '');
      toast(`Rejected ${r.data.rejected} records`, 'warn');
    } catch (e) { toast('Bulk reject failed', 'error'); }
    setSelected(new Set()); load();
    setBulk(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const r = await tenantAPI.exportCsv(currentTenant.slug, params);
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `emissions_${currentTenant.slug}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast('CSV exported', 'success');
    } catch (e) { toast('Export failed', 'error'); }
    setExporting(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="fade-in" style={{ padding:'24px 28px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:600, marginBottom:3 }}>Review Queue</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Review, flag, approve, and lock emission records for audit</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {selected.size > 0 && (
            <>
              <button className="btn btn-approve" onClick={handleBulkApprove} disabled={bulkLoading}>
                {bulkLoading ? <span className="spinner" style={{width:14,height:14}}/> : `✓ Approve ${selected.size}`}
              </button>
              <button className="btn btn-reject" onClick={handleBulkReject} disabled={bulkLoading}>
                {bulkLoading ? <span className="spinner" style={{width:14,height:14}}/> : `✕ Reject ${selected.size}`}
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <span className="spinner" style={{width:13,height:13}}/> : '↓ Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select value={filters.source_type} onChange={e => setFilter('source_type', e.target.value)}>
          <option value="">All sources</option>
          {SOURCE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select value={filters.scope} onChange={e => setFilter('scope', e.target.value)}>
          <option value="">All scopes</option>
          <option value="1">Scope 1</option>
          <option value="2">Scope 2</option>
          <option value="3">Scope 3</option>
        </select>
        <input placeholder="Search location, description…" value={filters.search}
          onChange={e => setFilter('search', e.target.value)} style={{ width:200 }}/>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <label style={{ fontSize:11, color:'var(--text-muted)' }}>From</label>
        <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} style={{ width:140 }}/>
        <label style={{ fontSize:11, color:'var(--text-muted)' }}>To</label>
        <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} style={{ width:140 }}/>
        {(filters.date_from || filters.date_to) && (
          <button className="btn btn-ghost btn-xs" onClick={() => { setFilter('date_from',''); setFilter('date_to',''); }}>Clear dates</button>
        )}
        <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>
          {totalCount} record{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
            <div className="spinner" style={{ width:28, height:28 }}/>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>No records match these filters</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width:36 }}>
                    <input type="checkbox"
                      checked={selected.size === records.length && records.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(records.map(r => r.id)) : new Set())}/>
                  </th>
                  <th>Scope</th><th>Category</th><th>Location</th>
                  <th>Period</th><th>CO₂e (kg)</th><th>Status</th><th>Flags</th><th></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => setDetail(r)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(r.id) : s.delete(r.id);
                          setSelected(s);
                        }}/>
                    </td>
                    <td><ScopeBadge scope={r.scope}/></td>
                    <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.category}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{r.location || '—'}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12, fontFamily:'var(--mono)' }}>{r.activity_date || '—'}</td>
                    <td style={{ fontFamily:'var(--mono)', fontWeight:500 }}>
                      {r.co2e_kg != null ? r.co2e_kg.toLocaleString(undefined,{maximumFractionDigits:2}) : <span style={{color:'var(--text-dim)'}}>—</span>}
                    </td>
                    <td><StatusBadge status={r.status}/></td>
                    <td>
                      {r.flag_codes?.length > 0 && (
                        <span style={{ fontSize:11, color:'var(--amber)' }}>⚠ {r.flag_codes.length}</span>
                      )}
                      {r.is_locked && <span style={{ fontSize:11, color:'var(--blue)', marginLeft:4 }}>🔒</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()} style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                      {r.status !== 'approved' && r.status !== 'locked' && r.status !== 'rejected' && (
                        <button className="btn btn-approve btn-xs" onClick={async () => {
                          try {
                            await tenantAPI.approve(currentTenant.slug, r.id);
                            toast('Approved', 'success');
                            load();
                          } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
                        }}>Approve</button>
                      )}
                      <button className="btn btn-ghost btn-xs" onClick={() => setDetail(r)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8,
                        padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`btn btn-xs ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPage(p)}>{p}</button>
              );
            })}
            {totalPages > 7 && <span style={{ color:'var(--text-dim)', fontSize:12 }}>… {totalPages}</span>}
            <button className="btn btn-ghost btn-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {detail && (
        <DetailPanel record={detail} slug={currentTenant.slug}
          onClose={() => setDetail(null)}
          onAction={() => { setDetail(null); load(); }}/>
      )}
    </div>
  );
}
