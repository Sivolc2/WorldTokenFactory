/**
 * ChatPanel — assistant-ui powered chat interface for World Token Factory.
 * Provides a conversational interface to the risk assessment engine.
 */
import { useState, useCallback } from 'react';

// Type-safe wrapper that works with or without assistant-ui installed
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const API_BASE = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_URL || 'http://localhost:8000';

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to World Token Factory. Describe your business and I\'ll decompose it into risk factors. Try: "Gulf Coast oil pipeline operator" or "Arctic lemming farm"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || JSON.stringify(data),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (_err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Connection error. Make sure the backend is running at ${API_BASE}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  return (
    <div className="chat-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg, #0a0a0f)',
      color: 'var(--color-fg, #e0ffe0)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
        fontSize: '14px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--color-accent, #00ff88)',
      }}>
        Risk Assessment Chat
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: msg.role === 'user'
              ? 'rgba(0, 255, 136, 0.08)'
              : 'rgba(255, 255, 255, 0.04)',
            border: msg.role === 'user'
              ? '1px solid rgba(0, 255, 136, 0.2)'
              : '1px solid rgba(255, 255, 255, 0.06)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            fontSize: '14px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{
            padding: '10px 14px',
            color: 'var(--color-accent, #00ff88)',
            fontSize: '13px',
            opacity: 0.7,
          }}>
            Analysing...
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0, 255, 136, 0.15)',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Describe your business or ask about risks..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: '6px',
            color: 'var(--color-fg, #e0ffe0)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '10px 20px',
            background: 'var(--color-accent, #00ff88)',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
