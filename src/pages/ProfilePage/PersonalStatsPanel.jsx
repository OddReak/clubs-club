import { memo } from 'react';
import { LIBRARY_CATS } from '../../constants/index.js';

const statColor = n => n >= 8 ? '#4caf50' : n >= 6 ? 'var(--accent)' : n >= 4 ? '#ff9800' : '#f44336';

const BAR_COLORS = ['var(--accent)','#7ec8e3','#c8a951','#e391b0','#88c88a','#e3a07e','#9b8ec8','#7ec8c8'];

const GenreStatsCard = memo(({ items, maxGenres = 8 }) => {
  const tally = {};
  items.forEach(item => {
    (item.genres || []).forEach(g => { if (g) tally[g] = (tally[g] || 0) + 1; });
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, maxGenres);
  if (!sorted.length) return null;
  const max = sorted[0][1];
  return (
    <div className="cc-card-inner" style={{ padding: '16px 18px' }}>
      <div className="cc-label" style={{ marginBottom: 14 }}>Genres</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {sorted.map(([genre, count], i) => (
          <div key={genre}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.63rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{genre}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>{count}</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: BAR_COLORS[i % BAR_COLORS.length], width: `${Math.round(count / max * 100)}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const PersonalStatsPanel = memo(({ items, contentType }) => {
  const typeItems = items.filter(i => i.type === contentType);
  const byStatus = {};
  typeItems.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });

  const getCount = (key) => {
    if (key === 'owned') {
      if (contentType === 'games') return (byStatus.owned || 0) + (byStatus.playing || 0) + (byStatus.completed || 0);
      if (contentType === 'books') return (byStatus.owned || 0) + (byStatus.reading || 0) + (byStatus.read || 0);
    }
    return byStatus[key] || 0;
  };

  const scored  = typeItems.filter(i => i.myReview?.score != null);
  const favs    = typeItems.filter(i => i.myReview?.isFavorite);
  const avg     = scored.length ? (scored.reduce((s, i) => s + i.myReview.score, 0) / scored.length).toFixed(1) : null;
  const dist    = Array.from({ length: 10 }, (_, i) => i + 1).map(n => ({
    n, count: scored.filter(i => Math.round(i.myReview.score) === n).length,
  }));
  const maxDist = Math.max(1, ...dist.map(d => d.count));
  const cats    = (LIBRARY_CATS[contentType] || []).filter(c => c.key !== 'all');

  const FINISHED = new Set(['completed','listened','watched','read']);
  const finishedItems = typeItems.filter(i => FINISHED.has(i.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      {/* Status distribution */}
      <div className="cc-card" style={{ padding: '18px 20px' }}>
        <div className="cc-label" style={{ marginBottom: 14 }}>Répartition</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cats.map(c => {
            const n = getCount(c.key);
            const pct = typeItems.length ? Math.round(n / typeItems.length * 100) : 0;
            return (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--text)' }}>{c.label}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>{n}</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{typeItems.length}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
          </div>
          {favs.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>⭐ {favs.length}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Coups de cœur</div>
            </div>
          )}
        </div>
      </div>

      {/* Score stats */}
      {scored.length > 0 && (
        <div className="cc-card" style={{ padding: '18px 20px' }}>
          <div className="cc-label" style={{ marginBottom: 14 }}>Notes</div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{avg}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Moyenne /10</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{scored.length}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Notés</div>
            </div>
            {(() => {
              const best = scored.reduce((a, b) => b.myReview.score > a.myReview.score ? b : a, scored[0]);
              return (
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '2rem', fontWeight: 800, color: '#4caf50', lineHeight: 1 }}>{best.myReview.score}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Meilleure note</div>
                </div>
              );
            })()}
          </div>
          {/* Distribution bar */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
            {dist.map(d => (
              <div key={d.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: `${Math.round((d.count / maxDist) * 44)}px`, minHeight: d.count > 0 ? 4 : 0, background: d.count > 0 ? statColor(d.n) : 'var(--border)', transition: 'height 0.4s ease' }} />
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: 'var(--muted)' }}>{d.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top rated */}
      {scored.length > 0 && (() => {
        const top = [...scored].sort((a, b) => b.myReview.score - a.myReview.score).slice(0, 5);
        return (
          <div className="cc-card" style={{ padding: '18px 20px' }}>
            <div className="cc-label" style={{ marginBottom: 14 }}>Top noté</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)', minWidth: 14 }}>{idx + 1}</div>
                  <div style={{ width: 32, height: item.type === 'music' ? 32 : 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--surface2)' }}>
                    <CoverImage item={item} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 800, color: statColor(item.myReview.score), flexShrink: 0 }}>{item.myReview.score}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Genre distribution */}
      {finishedItems.length > 0 && <GenreStatsCard items={finishedItems} />}
    </div>
  );
});

export default PersonalStatsPanel;
