import React, { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ReviewQueue from './pages/ReviewQueue';
import IngestData from './pages/IngestData';
import BatchHistory from './pages/BatchHistory';
import EmissionFactors from './pages/EmissionFactors';
import AdvancedTools from './pages/AdvancedTools';
import ChatbotWidget from './components/ChatbotWidget';

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                  justifyContent:'center', background:'var(--bg)' }}>
      <div className="spinner" style={{ width:36, height:36 }}/>
    </div>
  );

  if (!user) return <Login/>;

  const pages = {
    dashboard: <Dashboard setPage={setPage}/>,
    review:    <ReviewQueue/>,
    ingest:    <IngestData/>,
    batches:   <BatchHistory/>,
    factors:   <EmissionFactors/>,
    advanced:  <AdvancedTools/>,
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar page={page} setPage={setPage}/>
      <main style={{ flex:1, overflowY:'auto', minHeight:'100vh', background:'var(--bg)' }}>
        {pages[page] || pages.dashboard}
      </main>
      <ChatbotWidget/>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell/>
      </ToastProvider>
    </AuthProvider>
  );
}
