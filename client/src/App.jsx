import { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('headings');

  const parse = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      //const res = await axios.post('http://localhost:3001/api/parse', { url });
      const res = await axios.post('/api/parse', { url });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка парсинга');
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['headings', 'paragraphs', 'links', 'images', 'meta'];

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>🕷️ Web Parser</h1>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && parse()}
          style={{ flex: 1, padding: '10px 14px', fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button
          onClick={parse}
          disabled={loading}
          style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '⏳ Парсим...' : 'Парсить'}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: 'red' }}>❌ {error}</div>}

      {data && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 8px' }}>{data.title || '(без заголовка)'}</h2>
            <small style={{ color: '#666' }}>
              🔍 Метод: <b>{data.renderMethod}</b> | ⏱ {data.parsedAt}
            </small>
          </div>

          {/* Кнопка скачать JSON */}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'parsed.json';
              a.click();
            }}
            style={{ marginBottom: 16, padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}
          >
            ⬇️ Скачать JSON
          </button>

          {/* Табы */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#4f46e5' : '#e5e7eb',
                  color: activeTab === tab ? '#fff' : '#333'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Контент табов */}
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, maxHeight: 480, overflowY: 'auto' }}>
            {activeTab === 'headings' && data.headings.map((h, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <b style={{ color: '#4f46e5' }}>{h.tag.toUpperCase()}</b> {h.text}
              </div>
            ))}
            {activeTab === 'paragraphs' && data.paragraphs.map((p, i) => (
              <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.6 }}>{p}</p>
            ))}
            {activeTab === 'links' && data.links.map((l, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <a href={l.href} target="_blank" rel="noreferrer">{l.text || l.href}</a>
                <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{l.href}</span>
              </div>
            ))}
            {activeTab === 'images' && data.images.map((img, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <img src={img.src} alt={img.alt} style={{ maxWidth: 120, maxHeight: 80, marginRight: 8, verticalAlign: 'middle' }} />
                <span style={{ fontSize: 12, color: '#666' }}>{img.alt || img.src}</span>
              </div>
            ))}
            {activeTab === 'meta' && Object.entries(data.meta).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 4 }}>
                <b>{k}:</b> {v}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}