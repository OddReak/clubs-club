import { useState, useEffect } from 'react';
import { CoverImage, getHiResCover } from '../../components/ui/index.jsx';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import ClubReviewPanel from './ClubReviewPanel.jsx';

export default function ClubReviewSheet({ contentRow, club, currentUser, onClose, showToast }) {
  const [closing, setClosing] = useState(false);
  const dismiss = () => { setClosing(true); setTimeout(onClose, 230); };

  useEffect(() => {
    const html = document.documentElement;
    const p1 = document.body.style.overflow, p2 = html.style.overflow;
    document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden'; html.style.overscrollBehavior = 'none';
    return () => { document.body.style.overflow = p1; document.body.style.overscrollBehavior = ''; html.style.overflow = p2; html.style.overscrollBehavior = ''; };
  }, []);

  const item = { id: contentRow.content_id, type: contentRow.type, title: contentRow.title, cover: contentRow.cover ?? '' };

  return (
    <>
      <div className="search-detail-backdrop" onClick={dismiss} />
      <div className={`search-detail-sheet${closing ? ' closing' : ''}`}>
        <div className="search-detail-scroll">
          <div className={`search-detail-hero${item.type === 'music' ? ' music' : ''}`}>
            {item.cover
              ? <img src={getHiResCover(item)} alt={item.title} loading="lazy" />
              : <div className="search-detail-hero-placeholder">{(CONTENT_ICONS[item.type] || CONTENT_ICONS.games)(64)}</div>
            }
            <div className="search-detail-hero-gradient" />
            <button className="search-detail-hero-close" onClick={dismiss}>✕</button>
          </div>
          <div className="search-detail-body">
            <ClubReviewPanel contentRow={contentRow} club={club} currentUser={currentUser} onClose={dismiss} showToast={showToast} />
          </div>
        </div>
      </div>
    </>
  );
}
