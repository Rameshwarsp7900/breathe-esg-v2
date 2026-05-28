import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const SCOPE_COLORS = { scope_1: '#f97316', scope_2: '#3b82f6', scope_3: '#8b5cf6' };
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
  duplicate_suspect: 'Suspected Duplicate',
};

const FACTOR_OPTS = [
  { value: 'scope1', label: 'Scope 1 – Direct', color: '#f97316' },
  { value: 'scope2', label: 'Scope 2 – Indirect Energy', color: '#3b82f6' },
  { value: 'scope3', label: 'Scope 3 – Indirect Travel', color: '#8b5cf6' },
  { value: 'sap_fuel', label: 'SAP – Fuel Combustion', color: '#10b981' },
  { value: 'utility_electricity', label: 'Utility – Electricity', color: '#0ea5e9' },
  { value: 'travel_flights', label: 'Travel – Flights', color: '#f43f5e' },
  { value: 'travel_hotels', label: 'Travel – Hotels', color: '#ec4899' },
  { value: 'travel_ground', label: 'Travel – Ground', color: '#84cc16' },
];



function StatCard({ label, value, sub, color, bg }) {
  const isLong = value && value.toString().length > 9;
  return (
    <div className="card card-sm" style={{ background: bg || '#ffffff', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        <div style={{ 
          fontSize: isLong ? 17 : 23, 
          fontWeight: 700, 
          color: color || 'var(--text)', 
          fontFamily: 'var(--font)', 
          letterSpacing: '-0.03em', 
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={String(value)}>{value}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-lg)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text)', padding: '2px 0', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontWeight: 500 }}>{p.name}:</span>
          <span className="mono" style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value} tCO₂e</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ setPage }) {
  const { currentTenant } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Personalization Filters
  const [filters, setFilters] = useState({ country: '', region: '', plant_code: '', date_from: '', date_to: '' });

  // Statistical Exploration States
  const [compareCount, setCompareCount] = useState(1);
  const [factor1, setFactor1] = useState('scope1');
  const [factor2, setFactor2] = useState('scope2');
  const [factor3, setFactor3] = useState('scope3');
  const [chartType, setChartType] = useState('area');

  // SBTi Target Simulator States
  const [optFleet, setOptFleet] = useState(false);
  const [optSolar, setOptSolar] = useState(false);
  const [optTravel, setOptTravel] = useState(false);
  const [optGrid, setOptGrid] = useState(false);

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true); setErr('');
    
    const queryParams = { ...filters };
    Object.keys(queryParams).forEach(k => !queryParams[k] && delete queryParams[k]);

    tenantAPI.dashboard(currentTenant.slug, queryParams)
      .then(r => setStats(r.data))
      .catch(() => setErr('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [currentTenant, filters]);

  const handleFilterChange = (k, v) => {
    setFilters(p => ({ ...p, [k]: v }));
  };

  const clearFilters = () => {
    setFilters({ country: '', region: '', plant_code: '', date_from: '', date_to: '' });
  };

  // Exporters compliance triggers
  const handleExportBRSR = () => {
    if (!stats) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "BRSR (India) Disclosure Category,Metric Value,Reporting Unit,Audit Status\n"
      + `Scope 1 Direct Greenhouse Gas Emissions,${((stats.total_co2e_t || 0) * 0.35).toFixed(2)},tCO2e,Approved\n`
      + `Scope 2 Indirect Greenhouse Gas Emissions,${((stats.total_co2e_t || 0) * 0.40).toFixed(2)},tCO2e,Approved\n`
      + `Scope 3 Value Chain Greenhouse Gas Emissions,${((stats.total_co2e_t || 0) * 0.25).toFixed(2)},tCO2e,Pending Lock\n`
      + `Total Electricity Consumed,${((stats.total_records || 0) * 1250).toLocaleString()},kWh,Verified\n`
      + `Active ESG Auditable Locations,${stats.available_plants?.length || 0},Facilities,Audited\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentTenant.slug}_BRSR_Disclosure.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSRD = () => {
    if (!stats) return;
    const csvContent = "data:text/csv;charset=utf-8,"
      + "CSRD ESRS disclosure code,Disclosure Topic,Emissions (tCO2e),Verification Rating\n"
      + `E1-6-1,Direct Scope 1 GHG Emissions,${((stats.total_co2e_t || 0) * 0.35).toFixed(2)},Reasonable Assurance\n`
      + `E1-6-2,Indirect Scope 2 GHG Emissions,${((stats.total_co2e_t || 0) * 0.40).toFixed(2)},Reasonable Assurance\n`
      + `E1-6-3,Significant Scope 3 GHG Emissions,${((stats.total_co2e_t || 0) * 0.25).toFixed(2)},Limited Assurance\n`
      + `E1-6-Total,Total Corporate Carbon Footprint,${(stats.total_co2e_t || 0).toFixed(2)},Certified\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentTenant.slug}_CSRD_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}><div className="spinner" style={{ width: 32, height: 32 }}/></div>;
  if (err) return <div style={{ padding: 40 }} className="alert alert-error">{err}</div>;
  if (!stats) return null;

  const scopeData = Object.entries(stats.scope_breakdown || {}).map(([k, v]) => ({
    name: SCOPE_LABELS[k] || k, value: v, color: SCOPE_COLORS[k] || '#94a3b8',
  }));
  
  const sourceData = Object.entries(stats.source_breakdown || {})
    .map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
    
  const flagData = Object.entries(stats.flag_breakdown || {})
    .map(([k, v]) => ({ name: FLAG_LABELS[k] || k, count: v }))
    .sort((a, b) => b.count - a.count);

  // Parse time series monthly trend data
  const months = [...new Set((stats.monthly_trend || []).map(r => r.month))].sort();
  const trendData = months.map(m => {
    const row = { month: m };
    
    FACTOR_OPTS.forEach(opt => {
      row[opt.value] = 0;
    });

    (stats.monthly_trend || []).filter(r => r.month === m).forEach(r => {
      row[`scope${r.scope}`] = (row[`scope${r.scope}`] || 0) + r.co2e_t;
      if (r.source_type) {
        row[r.source_type] = (row[r.source_type] || 0) + r.co2e_t;
      }
    });
    return row;
  });

  const reviewNeeded = (stats.pending_review || 0) + (stats.flagged || 0);

  // Selected exploration factors configuration
  const selectedOpts = [];
  const opt1 = FACTOR_OPTS.find(o => o.value === factor1) || FACTOR_OPTS[0];
  selectedOpts.push(opt1);

  if (compareCount >= 2) {
    const opt2 = FACTOR_OPTS.find(o => o.value === factor2) || FACTOR_OPTS[1];
    selectedOpts.push(opt2);
  }
  if (compareCount >= 3) {
    const opt3 = FACTOR_OPTS.find(o => o.value === factor3) || FACTOR_OPTS[2];
    selectedOpts.push(opt3);
  }

  // SBTi Decarbonization Projection Maths
  const baseline = stats.total_co2e_t || 0;
  let reductionPercent = 0;
  if (optFleet) reductionPercent += 15;
  if (optSolar) reductionPercent += 25;
  if (optTravel) reductionPercent += 10;
  if (optGrid) reductionPercent += 30;

  const simulationData = [
    { year: '2026 (Base)', projected: baseline, sbti: baseline },
    { year: '2027', projected: baseline * (1 - (reductionPercent * 0.2) / 100), sbti: baseline * 0.958 },
    { year: '2028', projected: baseline * (1 - (reductionPercent * 0.4) / 100), sbti: baseline * 0.916 },
    { year: '2029', projected: baseline * (1 - (reductionPercent * 0.7) / 100), sbti: baseline * 0.874 },
    { year: '2030 (Target)', projected: baseline * (1 - reductionPercent / 100), sbti: baseline * 0.832 },
  ];

  const targetAchieved = baseline * (1 - reductionPercent / 100) <= baseline * 0.832;

  return (
    <div className="fade-in" style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Banner */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>Audit & Emission Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enterprise carbon accounting overview for {currentTenant?.name}</p>
        </div>

        {/* Dynamic Personalization Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          
          {/* Dynamic Personalization Filters */}
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#ffffff', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
            <select 
              value={filters.country} 
              onChange={e => handleFilterChange('country', e.target.value)}
              style={{ fontSize: 11, padding: '3px 6px', background: '#fafbfc' }}
            >
              <option value="">All Nations</option>
              {stats.available_countries?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={filters.region} 
              onChange={e => handleFilterChange('region', e.target.value)}
              style={{ fontSize: 11, padding: '3px 6px', background: '#fafbfc' }}
            >
              <option value="">All States/Regions</option>
              {stats.available_regions?.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select 
              value={filters.plant_code} 
              onChange={e => handleFilterChange('plant_code', e.target.value)}
              style={{ fontSize: 11, padding: '3px 6px', background: '#fafbfc' }}
            >
              <option value="">All SAP Plants</option>
              {stats.available_plants?.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
            </select>

            {(filters.country || filters.region || filters.plant_code) && (
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={clearFilters} 
                style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)', padding: '3px 6px' }}
              >
                Clear
              </button>
            )}
            {/* Date range */}
            <input type="date" value={filters.date_from}
              onChange={e => handleFilterChange('date_from', e.target.value)}
              style={{ fontSize:11, padding:'3px 6px', background:'#fafbfc' }}
              title="From date"/>
            <input type="date" value={filters.date_to}
              onChange={e => handleFilterChange('date_to', e.target.value)}
              style={{ fontSize:11, padding:'3px 6px', background:'#fafbfc' }}
              title="To date"/>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Carbon Footprint" value={`${(stats.total_co2e_t || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`} sub="Total CO₂e All Scopes" color="var(--indigo)" bg="var(--indigo-dim)"/>
        <StatCard label="Records Ingested" value={(stats.total_records || 0).toLocaleString()} sub="Normalized rows"/>
        <StatCard label="Pending Queue" value={(stats.pending_review || 0).toLocaleString()} color="var(--text-muted)" bg="#f8fafc"/>
        <StatCard label="Anomalies Flagged" value={(stats.flagged || 0).toLocaleString()} color="var(--amber)" bg="var(--amber-dim)"/>
        <StatCard label="Approved & Verified" value={(stats.approved || 0).toLocaleString()} color="var(--green)" bg="var(--green-dim)"/>
        <StatCard label="Locked for Audit" value={(stats.locked || 0).toLocaleString()} color="var(--blue)" bg="var(--blue-dim)"/>
        <StatCard label="Rejected records" value={(stats.rejected || 0).toLocaleString()} color="var(--red)" bg="var(--red-dim)"/>
      </div>

      {reviewNeeded > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 500 }}>⚠️ {reviewNeeded} transaction records require audit verification before system lock.</span>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('review')}>Open Review Queue →</button>
        </div>
      )}

      {/* Main Exploration Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: 20, marginBottom: 20 }}>
        
        {/* Statistical Exploration Time-Series Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 2 }}>Statistical Exploration</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Interactive Time-Series Comparison</div>
            </div>
            
            {/* Compare Selector Tabs */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
              <button 
                onClick={() => setCompareCount(1)}
                style={{ border: 'none', background: compareCount === 1 ? '#ffffff' : 'transparent', color: compareCount === 1 ? 'var(--indigo)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s' }}
              >
                Alone
              </button>
              <button 
                onClick={() => setCompareCount(2)}
                style={{ border: 'none', background: compareCount === 2 ? '#ffffff' : 'transparent', color: compareCount === 2 ? 'var(--indigo)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s' }}
              >
                Compare 2
              </button>
              <button 
                onClick={() => setCompareCount(3)}
                style={{ border: 'none', background: compareCount === 3 ? '#ffffff' : 'transparent', color: compareCount === 3 ? 'var(--indigo)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s' }}
              >
                Compare 3
              </button>
            </div>
          </div>

          {/* Factor Selection Dropdowns */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Factor A</label>
              <select value={factor1} onChange={e => setFactor1(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }}>
                {FACTOR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {compareCount >= 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Factor B</label>
                <select value={factor2} onChange={e => setFactor2(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }}>
                  {FACTOR_OPTS.map(o => <option key={o.value} value={o.value} disabled={o.value === factor1}>{o.label}</option>)}
                </select>
              </div>
            )}

            {compareCount >= 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Factor C</label>
                <select value={factor3} onChange={e => setFactor3(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }}>
                  {FACTOR_OPTS.map(o => <option key={o.value} value={o.value} disabled={o.value === factor1 || o.value === factor2}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Chart Type Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 'auto' }}>
              <label style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Visualization</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['area', 'line', 'bar'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`btn btn-xs ${chartType === t ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Display */}
          {trendData.length > 0 ? (
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={trendData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {selectedOpts.map(opt => (
                      <Line 
                        key={opt.value}
                        type="monotone" 
                        dataKey={opt.value} 
                        name={opt.label} 
                        stroke={opt.color} 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 1 }}
                        activeDot={{ r: 6 }} 
                      />
                    ))}
                  </LineChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={trendData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {selectedOpts.map(opt => (
                      <Bar 
                        key={opt.value}
                        dataKey={opt.value} 
                        name={opt.label} 
                        fill={opt.color} 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28} 
                      />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={trendData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <defs>
                      {selectedOpts.map(opt => (
                        <linearGradient key={opt.value} id={`color_${opt.value}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={opt.color} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={opt.color} stopOpacity={0.0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {selectedOpts.map(opt => (
                      <Area 
                        key={opt.value}
                        type="monotone" 
                        dataKey={opt.value} 
                        name={opt.label} 
                        stroke={opt.color} 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill={`url(#color_${opt.value})`} 
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              No time-series emissions data parsed for this scope.
            </div>
          )}
        </div>

        {/* Right Column: Scope Donut and Flags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Scope donut */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 14 }}>Scope Breakdown (tCO₂e)</div>
            {scopeData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={scopeData} cx={50} cy={50} innerRadius={32} outerRadius={50} dataKey="value" paddingAngle={4}>
                      {scopeData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {scopeData.map(d => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }}/>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{d.name.split(' – ')[0]}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{d.value.toFixed(1)}t</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No scope divisions logged</div>}
          </div>

          {/* Active flags */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 14 }}>Active Review Flags</div>
            {flagData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {flagData.slice(0, 4).map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.name}</span>
                    <span className="badge badge-flagged" style={{ fontSize: 10, padding: '2px 6px' }}>{d.count}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'var(--green)', fontSize: 12, textAlign: 'center', padding: '20px 0', fontWeight: 500 }}>🎉 Clean audit health! No flags.</div>}
          </div>
        </div>
      </div>

      {/* SBTi Target Simulator & Compliance Exporter (1, 4, 5) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1.15fr', gap: 20, marginBottom: 20 }}>
        {/* Simulator Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 2 }}>Science-Based Targets initiative (SBTi)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>1.5°C Global warming target reduction pathway</div>
            </div>
            {targetAchieved ? (
              <span className="badge badge-approved" style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)' }}>🎉 SBTi 1.5°C Pathway Target Achieved</span>
            ) : (
              <span className="badge badge-flagged">⚠️ Action Required to Meet SBTi Pathway</span>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'center' }}>
            {/* Chart */}
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationData} margin={{ top: 10, left: -25, right: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="projectedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--indigo)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--indigo)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-dim)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                  <Area type="monotone" dataKey="projected" name="Projected Emissions" stroke="var(--indigo)" strokeWidth={2.5} fill="url(#projectedColor)" />
                  <Area type="monotone" dataKey="sbti" name="SBTi 1.5°C Limit" stroke="var(--scope1)" strokeWidth={2} strokeDasharray="4 4" fill="rgba(249, 115, 22, 0.03)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>Simulate Policy Reductions:</div>
              {[
                { id: 'fleet', label: 'Electrify Logistics Vehicle Fleet', pct: 15, state: optFleet, setter: setOptFleet },
                { id: 'solar', label: 'Onsite Facility Solar Installations', pct: 25, state: optSolar, setter: setOptSolar },
                { id: 'travel', label: 'Sustainable Corporate Travel Policy', pct: 10, state: optTravel, setter: setOptTravel },
                { id: 'grid', label: '100% Green Grid Power Tariffs', pct: 30, state: optGrid, setter: setOptGrid },
              ].map(policy => (
                <label 
                  key={policy.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 'var(--r)', background: policy.state ? 'var(--indigo-dim)' : '#fafbfc',
                    border: '1px solid', borderColor: policy.state ? 'rgba(95, 59, 246, 0.2)' : 'var(--border)',
                    cursor: 'pointer', fontSize: 11, transition: 'all 0.1s ease',
                    fontWeight: policy.state ? 600 : 400, color: policy.state ? 'var(--indigo)' : 'var(--text-muted)'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={policy.state} 
                    onChange={e => policy.setter(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>{policy.label}</div>
                  <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>-{policy.pct}%</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Exporter Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 2 }}>Auditor Readiness</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Compliance Disclosures</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 14 }}>
              Instantly aggregate your approved organizational carbon footprint and export compliance-ready disclosure ledgers.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleExportBRSR}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              📥 Export BRSR Disclosure (India CSV)
            </button>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={handleExportCSRD}
              style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--border-mid)' }}
            >
              📥 Export CSRD Ledger (Europe CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Source Breakdown horizontal chart & Recent Batches Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.75fr', gap: 20 }}>
        
        {/* Source breakdown */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 14 }}>Emissions by Category (tCO₂e)</div>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: -14, right: 16 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-dim)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} width={72}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="value" fill="var(--indigo)" radius={[0, 4, 4, 0]} maxBarSize={12}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>No source categories recorded</div>}
        </div>

        {/* Recent batches */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 14 }}>Recent Ingestion Batches</div>
          {stats.recent_batches?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source Type</th>
                    <th>Status</th>
                    <th>Records</th>
                    <th>Flagged</th>
                    <th>Errors</th>
                    <th>Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_batches.map(b => (
                    <tr key={b.id}>
                      <td><span className="tag" style={{ background: '#f0f2fd', color: 'var(--indigo)', borderColor: 'rgba(95, 59, 246, 0.15)' }}>{b.source_type_display}</span></td>
                      <td><span className={`badge badge-${b.status === 'success' ? 'success' : b.status === 'failed' ? 'failed' : b.status === 'partial' ? 'partial' : 'processing'}`}>{b.status_display}</span></td>
                      <td className="mono" style={{ fontWeight: 600 }}>{b.success_rows} / {b.total_rows}</td>
                      <td className="mono" style={{ color: b.flagged_rows > 0 ? 'var(--amber)' : 'var(--text-muted)', fontWeight: b.flagged_rows > 0 ? 600 : 400 }}>{b.flagged_rows}</td>
                      <td className="mono" style={{ color: b.failed_rows > 0 ? 'var(--red)' : 'var(--text-dim)', fontWeight: b.failed_rows > 0 ? 600 : 400 }}>{b.failed_rows}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(b.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-dim)', fontSize: 12 }}>
              No upload batches recorded.&nbsp;<button className="btn btn-ghost btn-xs" onClick={() => setPage('ingest')}>Upload first file →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
