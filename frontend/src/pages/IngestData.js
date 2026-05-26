import React, { useState, useRef } from 'react';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const SOURCES = [
  { key:'sap_fuel', label:'SAP Fuel', scope:'Scope 1', scopeCls:'badge-s1', icon:'⛽',
    desc:'MM60/MB51 flat file export (tab/semicolon delimited). Handles German headers (Werk/Menge/ME), European decimal notation (12.450,00), SAP period format (2024001), movement type filtering.',
    accepts:'.csv,.txt,.tsv',
    fields:[] },
  { key:'utility_electricity', label:'Utility Electricity', scope:'Scope 2', scopeCls:'badge-s2', icon:'⚡',
    desc:'Portal CSV export (Green Button / utility download). Multi-meter, multi-period. Billing cycles normalised to activity date. Renewable tariffs detected (market-based EF = 0).',
    accepts:'.csv',
    fields:[{ key:'country', label:'Grid Region (for EF)', type:'select', options:[
      {v:'DEFAULT',l:'International Avg (0.450)'},{v:'IN',l:'India (0.716)'},
      {v:'US',l:'United States (0.386)'},{v:'DE',l:'Germany (0.366)'},
      {v:'UK',l:'United Kingdom (0.193)'},{v:'SG',l:'Singapore (0.408)'},
      {v:'AU',l:'Australia (0.790)'},{v:'FR',l:'France (0.052)'},
      {v:'JP',l:'Japan (0.472)'},{v:'CN',l:'China (0.581)'},
    ]}] },
  { key:'travel_flights', label:'Corporate Travel', scope:'Scope 3', scopeCls:'badge-s3', icon:'✈',
    desc:'Concur / Navan CSV export. Auto-detects Air, Hotel, Car, Rail rows. Computes flight distances from IATA codes. Business class gets 2× EF multiplier (DEFRA). Hotel EF by destination country.',
    accepts:'.csv',
    fields:[] },
];

function DropZone({ accepts, onFile, file }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = f => { if (f) onFile(f); };
  return (
    <div onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{ border:`2px dashed ${drag ? 'var(--green)' : file ? 'rgba(34,197,94,.4)' : 'var(--border-light)'}`,
               borderRadius:'var(--r-lg)', padding:'28px 20px', textAlign:'center', cursor:'pointer',
               background: drag ? 'var(--green-dim)' : file ? 'rgba(34,197,94,.04)' : 'var(--bg-input)',
               transition:'all .15s' }}>
      <input ref={ref} type="file" accept={accepts} style={{ display:'none' }}
        onChange={e => handle(e.target.files[0])}/>
      {file ? (
        <>
          <div style={{ fontSize:22, marginBottom:8 }}>📄</div>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--green)' }}>{file.name}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
            {(file.size/1024).toFixed(1)} KB · Click to change
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize:28, marginBottom:8, color:'var(--text-dim)' }}>↑</div>
          <div style={{ fontSize:13, color:'var(--text-muted)' }}>
            Drop file or <span style={{ color:'var(--green)' }}>browse</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>{accepts}</div>
        </>
      )}
    </div>
  );
}

function UploadResult({ result }) {
  const b = result.batch;
  const errs = result.parse_errors || [];
  const ok = b.status === 'success';
  return (
    <div className="fade-in" style={{ marginTop:18 }}>
      <div className={`alert alert-${ok ? 'success' : b.status === 'partial' ? 'warn' : 'error'}`} style={{ marginBottom:errs.length > 0 ? 10 : 0 }}>
        <div style={{ fontWeight:600, marginBottom:4 }}>
          {ok ? '✓ Ingestion complete' : b.status === 'partial' ? '⚠ Partial success' : '✕ Ingestion failed'}
        </div>
        <div style={{ fontSize:12 }}>
          {b.success_rows} records created · {b.flagged_rows} flagged · {b.failed_rows} row errors
        </div>
        <div style={{ fontSize:11, fontFamily:'var(--mono)', marginTop:5, opacity:.7 }}>Batch: {b.id}</div>
      </div>
      {errs.length > 0 && (
        <details>
          <summary style={{ fontSize:12, color:'var(--amber)', cursor:'pointer', padding:'6px 0' }}>
            ⚠ {errs.length} row-level errors (expand)
          </summary>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r)',
                        padding:10, maxHeight:180, overflow:'auto', marginTop:4 }}>
            {errs.map((e, i) => (
              <div key={i} style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)',
                                    padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--amber)' }}>row {e.row}</span>: {e.error}
              </div>
            ))}
          </div>
        </details>
      )}
      {b.processing_log?.length > 0 && (
        <details style={{ marginTop:8 }}>
          <summary style={{ fontSize:12, color:'var(--text-muted)', cursor:'pointer', padding:'4px 0' }}>Processing log</summary>
          <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-dim)', paddingTop:6 }}>
            {b.processing_log.map((l, i) => <div key={i} style={{ padding:'2px 0' }}>{l}</div>)}
          </div>
        </details>
      )}
    </div>
  );
}

export default function IngestData() {
  const { currentTenant, tenants } = useAuth();
  const membership = tenants?.find(t => t.slug === currentTenant?.slug);
  const isViewer = membership?.role === 'viewer';
  const [src, setSrc]         = useState('sap_fuel');
  const [file, setFile]       = useState(null);
  const [extras, setExtras]   = useState({});
  const [notes, setNotes]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const source = SOURCES.find(s => s.key === src);

  const upload = async () => {
    if (!file || !currentTenant) return;
    setUploading(true); setResult(null); setError(''); setProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('notes', notes);
    Object.entries(extras).forEach(([k, v]) => fd.append(k, v));
    try {
      const r = await tenantAPI.ingest(currentTenant.slug, src, fd,
        e => setProgress(Math.round(e.loaded / e.total * 100)));
      setResult(r.data);
      setFile(null);
    } catch (err) {
      if (err.response?.status === 409) setError('Duplicate file — this exact file has already been ingested (SHA-256 match).');
      else setError(err.response?.data?.error || err.response?.data?.detail || 'Upload failed.');
    }
    setUploading(false);
  };

  return (
    <div className="fade-in" style={{ padding:'24px 28px', maxWidth:740 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:19, fontWeight:600, marginBottom:3 }}>Ingest Data</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>Upload emission source files for normalisation and analyst review</p>
      </div>

      {isViewer && (
        <div className="alert alert-warn" style={{ marginBottom:20 }}>
          You have viewer access. File uploads require analyst or admin role.
        </div>
      )}

      {/* Source picker */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:22 }}>
        {SOURCES.map(s => (
          <button key={s.key} onClick={() => { setSrc(s.key); setFile(null); setResult(null); setError(''); }}
            style={{ padding:'14px', borderRadius:'var(--r-lg)', textAlign:'left', cursor:'pointer',
                     border:`1px solid ${src === s.key ? 'var(--green)' : 'var(--border)'}`,
                     background: src === s.key ? 'var(--green-dim)' : 'var(--bg-card)',
                     transition:'all .14s', fontFamily:'var(--font)' }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:5 }}>{s.label}</div>
            <span className={`badge ${s.scopeCls}`}>{s.scope}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:18 }}>{source.icon}</span>
            <span style={{ fontWeight:600, fontSize:14 }}>{source.label}</span>
            <span className={`badge ${source.scopeCls}`}>{source.scope}</span>
          </div>
          <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.65 }}>{source.desc}</p>
        </div>

        <DropZone accepts={source.accepts} onFile={setFile} file={file}/>

        {source.fields.length > 0 && (
          <div style={{ marginTop:14, display:'flex', gap:12, flexWrap:'wrap' }}>
            {source.fields.map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select value={extras[f.key] || f.options[0].v}
                    onChange={e => setExtras(p => ({...p, [f.key]: e.target.value}))}>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={extras[f.key]||''} onChange={e => setExtras(p => ({...p, [f.key]: e.target.value}))}/>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:14 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Q1 2024 fuel data from Frankfurt plant"
            style={{ width:'100%' }}/>
        </div>

        {uploading && (
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>
              <span>Uploading & processing…</span><span>{progress}%</span>
            </div>
            <div style={{ height:3, background:'var(--border)', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'var(--green)', borderRadius:2, transition:'width .2s' }}/>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop:14, fontSize:12 }}>{error}</div>}

        <div style={{ marginTop:16 }}>
          <button className="btn btn-primary" onClick={upload} disabled={!file || uploading || isViewer}>
            {uploading ? <><span className="spinner" style={{width:14,height:14}}/> Processing…</> : '↑ Upload & ingest'}
          </button>
        </div>
      </div>

      {/* Sample data callout */}
      <div style={{ padding:'12px 16px', background:'var(--bg-card)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-lg)', fontSize:12 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:7, fontWeight:600 }}>
          Sample files (in repo: sample_data/)
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {[['sap_fuel_sample.csv','SAP Fuel','var(--scope1)'],
            ['utility_electricity_sample.csv','Electricity','var(--scope2)'],
            ['travel_concur_sample.csv','Travel','var(--scope3)']].map(([f,l,c]) => (
            <div key={f} style={{ display:'flex', justifyContent:'space-between' }}>
              <code style={{ fontFamily:'var(--mono)', color:c, fontSize:11 }}>{f}</code>
              <span style={{ color:'var(--text-dim)', fontSize:11 }}>{l} — includes edge cases</span>
            </div>
          ))}
        </div>
      </div>

      {result && <UploadResult result={result}/>}
    </div>
  );
}
