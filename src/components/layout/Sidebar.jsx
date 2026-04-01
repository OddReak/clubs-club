import React from 'react';
import { ClubTypeIcon, IconHome, IconNavSearch, IconHexagon, IconUserCircle, IconSettings, IconLogout } from '../icons/index.jsx';

const NAV_ITEMS = [
  { id:'home',    label:'Accueil',   Icon: IconHome       },
  { id:'search',  label:'Recherche', Icon: IconNavSearch  },
  { id:'clubs',   label:'Clubs',     Icon: IconHexagon    },
  { id:'profile', label:'Profil',    Icon: IconUserCircle },
];

export const Sidebar = ({ page, setPage, currentUser, onSettings, onLogout, clubs = [], onGoToClub }) => (
  <div className="sidebar">
    <div className="sidebar-logo">
      <div className="sidebar-logo-text">Clubs Club</div>
      <div className="sidebar-logo-sub">Suivi collaboratif</div>
    </div>

    <nav className="sidebar-nav">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setPage(id)} className={`sidebar-link ${page === id ? 'active' : ''}`}>
          <span className="sidebar-link-icon"><Icon size={18} /></span>
          {label}
        </button>
      ))}
    </nav>

    {clubs.length > 0 && (
      <div className="sidebar-clubs">
        <div className="sidebar-clubs-label">Mes clubs</div>
        {clubs.map(club => (
          <button key={club.id} className="sidebar-club-btn" onClick={() => onGoToClub(club)} title={club.name}>
            <span className="sidebar-club-icon"><ClubTypeIcon type={club.type} size={13} /></span>
            <span className="sidebar-club-name">{club.name}</span>
          </button>
        ))}
      </div>
    )}

    <div className="sidebar-bottom">
      <div style={{ padding:'8px 12px', marginBottom:8 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'0.78rem', fontWeight:700, color:'var(--text)' }}>{currentUser?.username}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.58rem', color:'var(--muted)', letterSpacing:'0.08em', marginTop:2 }}>Connecté•e</div>
      </div>
      <button className="sidebar-link" onClick={onSettings}>
        <span className="sidebar-link-icon"><IconSettings size={16} /></span> Réglages
      </button>
      <button className="sidebar-link" onClick={onLogout} style={{ color:'#e05555' }}>
        <span className="sidebar-link-icon"><IconLogout size={16} /></span> Déconnexion
      </button>
    </div>
  </div>
);

export const BottomNav = ({ page, setPage }) => (
  <div className="bottom-nav">
    <div className="bottom-nav-inner">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setPage(id)} className={`bottom-nav-btn ${page === id ? 'active' : ''}`}>
          <span className="bottom-nav-btn-icon"><Icon size={18} /></span>
          <span className="bottom-nav-btn-label">{label}</span>
        </button>
      ))}
    </div>
  </div>
);
