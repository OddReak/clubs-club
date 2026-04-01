import { useState, useEffect } from 'react';
import { CoverImage, getHiResCover } from '../../components/ui/index.jsx';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import { PersonalReviewPanel } from './PersonalReviewPanel.jsx';

export default function PersonalReviewSheet({ item, currentUser, onClose, onStatusChange, onRemove, onSaveReview, showToast }) {
  const [closing, setClosing] = useState(false);
  const dismiss = () => { setClosing(true); setTimeout(onClose, 230); };

  useEffect(() => {
    const html = document.documentElement;
    const prevB = document.body.style.overflow;
    const prevH = html.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevB;
      document.body.style.overscrollBehavior = '';
      html.style.overflow = prevH;
      html.style.overscrollBehavior = '';
    };
  }, []);

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
            <PersonalReviewPanel
              item={item}
              currentUser={currentUser}
              onClose={dismiss}
              onStatusChange={onStatusChange}
              onRemove={onRemove}
              onSaveReview={onSaveReview}
            />
          </div>
        </div>
      </div>
    </>
  );
}
