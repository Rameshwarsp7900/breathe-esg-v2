import React, { useState, useEffect, useRef } from 'react';
import { tenantAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const SUGGESTIONS = [
  "What is our carbon footprint?",
  "Are there any pending review flags?",
  "Summarize Scope 3 emissions",
  "How are our plants doing?",
];

export default function ChatbotWidget() {
  const { currentTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I am your Breathe ESG Carbon Intelligence assistant. Ask me anything about your current emissions, audits, or SAP plant codes!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customKey, setCustomKey] = useState(localStorage.getItem('customMistralKey') || '');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const saveKey = () => {
    if (customKey.trim()) {
      localStorage.setItem('customMistralKey', customKey.trim());
    } else {
      localStorage.removeItem('customMistralKey');
    }
    setShowSettings(false);
  };

  const handleSend = async (text) => {
    const messageToSend = text || input;
    if (!messageToSend.trim() || !currentTenant) return;

    if (!text) setInput('');

    // Append user message
    const userMsg = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send message to proxy with previous history
      const response = await tenantAPI.chat(
        currentTenant.slug,
        messageToSend,
        messages,
        customKey.trim() || null
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }]);
    } catch (e) {
      console.error(e);
      const errMsg = e.response?.data?.error || "AI Assistant could not compile a response.";
      const detail = e.response?.data?.detail || "Make sure your Mistral API key is set up in your Settings.";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error:** ${errMsg}\n\n*Details: ${detail}*`
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--indigo)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 18px rgba(95, 59, 246, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          zIndex: 999,
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        💬
      </button>
    );
  }

  return (
    <div
      className="fade-in slide-up"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 360,
        height: 500,
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--indigo)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>Breathe ESG AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} className="pulse-glow" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Mistral Accountant</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              opacity: 0.8,
            }}
            title="API Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 16,
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Area */}
      {showSettings ? (
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Custom Mistral API Key
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              placeholder="Paste Mistral API Key..."
              value={customKey}
              onChange={e => setCustomKey(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={saveKey}>
              Save
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
            Overrides server key. Stored locally in your browser's localStorage.
          </div>
        </div>
      ) : null}

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          padding: 16,
          overflowY: 'auto',
          background: '#fafbfc',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          
          const renderMessageText = (content) => {
            if (isUser) return <div>{content}</div>;

            return content.split('\n').map((line, lineIdx) => {
              const parseInlineBold = (text) => {
                const parts = text.split(/(\*\*.*?\*\*)/g);
                return parts.map((part, partIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={partIdx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                });
              };

              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <li key={lineIdx} style={{ marginLeft: 14, marginBottom: 4 }}>
                    {parseInlineBold(line.substring(2))}
                  </li>
                );
              }
              if (line.startsWith('### ')) {
                return (
                  <div key={lineIdx} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 4, color: 'var(--indigo)' }}>
                    {parseInlineBold(line.substring(4))}
                  </div>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <div key={lineIdx} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4, color: 'var(--indigo)' }}>
                    {parseInlineBold(line.substring(3))}
                  </div>
                );
              }
              return (
                <div key={lineIdx} style={{ minHeight: line === '' ? 8 : 'auto', marginBottom: 2 }}>
                  {parseInlineBold(line)}
                </div>
              );
            });
          };

          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: isUser ? 'var(--indigo)' : '#ffffff',
                color: isUser ? '#ffffff' : 'var(--text)',
                padding: '10px 12px',
                borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: 12,
                boxShadow: isUser ? 'none' : 'var(--shadow)',
                border: isUser ? 'none' : '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {renderMessageText(m.content)}
            </div>
          );
        })}
        {loading && (
          <div
            style={{
              alignSelf: 'flex-start',
              background: '#ffffff',
              padding: '10px 14px',
              borderRadius: '12px 12px 12px 2px',
              fontSize: 11,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="spinner" style={{ width: 12, height: 12 }} />
            AI accounting expert is analyzing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div style={{ padding: '8px 12px', background: '#fafbfc', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6 }}>Suggested Prompts:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map(chip => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                style={{
                  fontSize: 10,
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--indigo)';
                  e.currentTarget.style.color = 'var(--indigo)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-mid)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        style={{
          padding: 10,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 6,
          background: '#ffffff',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a sustainability or data question..."
          disabled={loading}
          style={{ flex: 1, padding: '7px 11px', fontSize: 12, width: 'auto' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '6px 12px', borderRadius: 'var(--r)' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
