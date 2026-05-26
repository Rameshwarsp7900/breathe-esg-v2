import React, { useEffect, useState } from 'react';
import client from '../api';

export default function EmissionFactors() {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat]         = useState('');

  useEffect(() => {
    client.get('/emission-factors/').then(r => setFactors(r.data.results || r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cats = [...new Set(factors.map(f => f.category))].sort();
  const shown = cat ? factors.filter(f => f.category === cat) : factors;
  const CAT_COLORS = { fuel:'var(--scope1)', electricity:'var(--scope2)', flight:'var(--scope3)', hotel:'var(--scope3)', car:'var(--amber)' };

  return (
    <div className="fade-in" style={{ padding:'24px 28px' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:19, fontWeight:600, marginBottom:3 }}>Emission Factors</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>Versioned reference table used in ingestion calculations</p>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <select value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize:12, color:'var(--text-muted)', alignSelf:'center' }}>{shown.length} factors</span>
      </div>
      <div className="card" style={{ padding:0 }}>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" style={{width:24,height:24}}/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Substance</th><th>kg CO₂e</th><th>Per</th><th>Source</th><th>Effective</th></tr></thead>
              <tbody>
                {shown.map(f => (
                  <tr key={f.id}>
                    <td><span className="tag" style={{ color: CAT_COLORS[f.category]||'var(--text-muted)', borderColor:`${CAT_COLORS[f.category]}33`||'var(--border-light)' }}>{f.category}</span></td>
                    <td className="mono" style={{ fontSize:12 }}>{f.substance}</td>
                    <td className="mono" style={{ fontWeight:600, color:'var(--green)' }}>{f.kg_co2e}</td>
                    <td className="mono" style={{ color:'var(--text-muted)', fontSize:12 }}>{f.unit}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{f.source}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{f.effective_from}{f.effective_to ? ` → ${f.effective_to}` : ' (current)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
