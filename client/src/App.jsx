import { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('headings');
  const [tracking, setTracking] = useState('');
  const [trackingData, setTrackingData] = useState(null);

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

  const parseTracking = async () => {
    if (!tracking) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/parse-maersk', { url: tracking });
      setTrackingData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Ошибка трекинга');
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

      <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 24 }}>
        <h2>🚢 Maersk Tracking</h2>
        <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="https://www.maersk.com/tracking/MSKU7430014"
          value={tracking}
          onChange={e => setTracking(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && parseTracking()}
          style={{ flex: 1, padding: '10px 14px', fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button
          onClick={parseTracking}
          disabled={loading}
          style={{ padding: '10px 24px', fontSize: 16, borderRadius: 8, background: '#0073ab', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '⏳...' : 'Track'}
        </button>
      </div>

        {trackingData && (
          <div style={{ marginTop: 16 }}>
            {/* Маршрут */}
            <div style={{ background: '#f0f8ff', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>{trackingData.origin?.city}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{trackingData.origin?.country}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 24 }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>{trackingData.destination?.city}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{trackingData.destination?.country}</div>
              </div>
              <div style={{ marginLeft: 'auto', background: trackingData.containers?.[0]?.status === 'IN_PROGRESS' ? '#22c55e' : '#94a3b8', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 13 }}>
                {trackingData.containers?.[0]?.status}
              </div>
            </div>
                
            {/* Контейнер инфо */}
            {trackingData.containers?.map(container => (
              <div key={container.container_num}>
                <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 24 }}>
                  <div><span style={{ color: '#666', fontSize: 12 }}>Контейнер</span><div style={{ fontWeight: 'bold' }}>{container.container_num}</div></div>
                  <div><span style={{ color: '#666', fontSize: 12 }}>Размер</span><div style={{ fontWeight: 'bold' }}>{container.container_size}ft</div></div>
                  <div><span style={{ color: '#666', fontSize: 12 }}>Тип</span><div style={{ fontWeight: 'bold' }}>{container.container_type}</div></div>
                  <div><span style={{ color: '#666', fontSize: 12 }}>ETA</span><div style={{ fontWeight: 'bold' }}>{new Date(container.eta_final_delivery).toLocaleDateString('ru-RU')}</div></div>
                </div>
            
                {/* События по локациям */}
                {container.locations?.map((loc, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📍</span>
                      <span>{loc.city}, {loc.country}</span>
                      <span style={{ color: '#666', fontSize: 12, fontWeight: 'normal' }}>{loc.terminal}</span>
                    </div>
                    {loc.events?.map((event, j) => (
                      <div key={j} style={{ display: 'flex', gap: 12, padding: '6px 0 6px 24px', borderLeft: '2px solid #e5e7eb', marginLeft: 8 }}>
                        <div style={{ width: 160, color: '#666', fontSize: 13 }}>
                          {new Date(event.event_time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontWeight: 500 }}>{event.activity}</div>
                        {event.vessel_name && <div style={{ color: '#4f46e5', fontSize: 13 }}>🚢 {event.vessel_name} {event.voyage_num}</div>}
                        <div style={{ marginLeft: 'auto', fontSize: 12, color: event.event_time_type === 'ACTUAL' ? '#22c55e' : '#f59e0b' }}>
                          {event.event_time_type === 'ACTUAL' ? '✓ факт' : '⏳ план'}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
        
            {/* Скачать JSON */}
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(trackingData, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${trackingData.trackingNumber}.json`;
                a.click();
              }}
              style={{ marginTop: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}
            >
              ⬇️ Скачать JSON
            </button>
          </div>
        )}
      </div>

    </div>
  );
}