import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const SCOPE_COLORS = { scope_1: '#fb923c', scope_2: '#60a5fa', scope_3: '#a78bfa' };
const SCOPE_LABELS = { scope_1: 'Scope 1 – Direct', scope_2: 'Scope 2 – Energy', scope_3: 'Scope 3 – Travel' };
const SOURCE_LABELS = {
  sap_fuel: 'SAP Fuel', utility_electricity: 'Electricity',
  travel_flights: 'Flights', travel_hotels: 'Hotels', travel_ground: 'Ground',
};
const FLAG_LABELS = {
  unit_mismatch: 'Unit Mismatch', missing_unit: 'Missing Unit',
  outlier_value: 'Outlier', unknown_plant: 'Unknown Plant',
  missing_period: 'Missing Period', negative_value: 'Negative Value',
  missing_distance: 'Missing Distance', manual_review: 'Manual Flag',
};

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div className="card" style={{ background: bg || 'var(--bg-card)', padding: '16px 18px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text)' }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} tCO₂e</div>
      ))}
    </div>
  );
};

export default function Dashboard({ setPage }) {
  const { currentTenant } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true); setErr('');
    tenantAPI.dashboard(currentTenant.slug)
      .then(r => setStats(r.data))
      .catch(() => setErr('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [currentTenant]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" style={{ width: 32, height: 32 }}/></div>;
  if (err) return <div style={{ padding: 40 }} className="alert alert-error">{err}</div>;
  if (!stats) return null;

  const scopeData = Object.entries(stats.scope_breakdown || {}).map(([k, v]) => ({
    name: SCOPE_LABELS[k] || k, value: v, color: SCOPE_COLORS[k] || '#6b7d72',
  }));
  const sourceData = Object.entries(stats.source_breakdown || {})
    .map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
  const flagData = Object.entries(stats.flag_breakdown || {})
    .map(([k, v]) => ({ name: FLAG_LABELS[k] || k, count: v }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend grouped by scope
  const months = [...new Set((stats.monthly_trend || []).map(r => r.month))].sort();
  const trendData = months.map(m => {
    const row = { month: m };
    (stats.monthly_trend || []).filter(r => r.month === m).forEach(r => {
      row[`scope${r.scope}`] = (row[`scope${r.scope}`] || 0) + r.co2e_t;
    });
    return row;
  });

  const reviewNeeded = (stats.pending_review || 0) + (stats.flagged || 0);

  return (
    <div className="fade-in" style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, marginBottom: 3 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{currentTenant?.name} · Emission overview and review status</p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total tCO₂e" value={(stats.total_co2e_t || 0).toFixed(1)} sub="All scopes" color="var(--green)"/>
        <StatCard label="Records" value={stats.total_records} sub="Normalised rows"/>
        <StatCard label="Pending Review" value={stats.pending_review} color="var(--text-muted)" bg="rgba(90,122,102,.06)"/>
        <StatCard label="Flagged" value={stats.flagged} color="var(--amber)" bg="var(--amber-dim)"/>
        <StatCard label="Approved" value={stats.approved} color="var(--green)" bg="var(--green-dim)"/>
        <StatCard label="Locked" value={stats.locked} color="var(--blue)" bg="var(--blue-dim)"/>
        <StatCard label="Rejected" value={stats.rejected} color="var(--red)" bg="var(--red-dim)"/>
      </div>

      {reviewNeeded > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠ {reviewNeeded} record{reviewNeeded !== 1 ? 's' : ''} need review before audit lock</span>
          <button className="btn btn-flag btn-sm" onClick={() => setPage('review')}>Go to Review →</button>
        </div>
      )}

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Scope donut */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Scope Breakdown (tCO₂e)</div>
          {scopeData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={scopeData} cx={55} cy={55} innerRadius={36} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {scopeData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {scopeData.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.name.split(' – ')[0]}</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 500 }}>{d.value.toFixed(1)}t</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No data yet</div>}
        </div>

        {/* Source bar */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>By Source (tCO₂e)</div>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: 4, right: 16 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={68}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="value" fill="var(--green)" radius={[0, 4, 4, 0]} maxBarSize={16}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No data yet</div>}
        </div>

        {/* Flag breakdown */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Active Flags</div>
          {flagData.length > 0 ? (
            <div>
              {flagData.slice(0, 6).map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.name}</span>
                  <span className="badge badge-flagged" style={{ fontSize: 10 }}>{d.count}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No flags 🎉</div>}
        </div>
      </div>

      {/* Monthly trend */}
      {trendData.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Monthly Trend – Approved + Locked (tCO₂e)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }}/>
              <Line type="monotone" dataKey="scope1" name="Scope 1" stroke="var(--scope1)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="scope2" name="Scope 2" stroke="var(--scope2)" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="scope3" name="Scope 3" stroke="var(--scope3)" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent batches */}
      <div className="card">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Recent Ingestion Batches</div>
        {stats.recent_batches?.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Source</th><th>Status</th><th>Records</th><th>Flagged</th><th>Errors</th><th>Uploaded</th></tr></thead>
              <tbody>
                {stats.recent_batches.map(b => (
                  <tr key={b.id}>
                    <td><span className="tag">{b.source_type_display}</span></td>
                    <td><span className={`badge badge-${b.status === 'success' ? 'success' : b.status === 'failed' ? 'failed' : b.status === 'partial' ? 'partial' : 'processing'}`}>{b.status_display}</span></td>
                    <td className="mono">{b.success_rows} / {b.total_rows}</td>
                    <td className="mono" style={{ color: b.flagged_rows > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>{b.flagged_rows}</td>
                    <td className="mono" style={{ color: b.failed_rows > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{b.failed_rows}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(b.uploaded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-dim)' }}>
            No batches yet.&nbsp;<button className="btn btn-ghost btn-xs" onClick={() => setPage('ingest')}>Upload your first file →</button>
          </div>
        )}
      </div>
    </div>
  );
}
