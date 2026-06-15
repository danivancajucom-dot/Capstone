import React from 'react';
import './LoginNav.css';
import logo from '../../assets/logo.png';

export default function LoginNav({ activePage, onChangePage, onSignIn, onLogout }) {
  const handleSignInClick = () => {
    if (activePage === 'login') {
      onSignIn && onSignIn();
    } else {
      onChangePage && onChangePage('login');
    }
  };

  return (
    <nav className="site-nav">
      <div className="brand-block">
        <img
          src={logo}
          alt="Spaces CICT Logo"
          className="brand-logo"
        />

        <div>
          <p className="brand-name">Spaces CICT</p>
        </div>
      </div>
      
      <div className="nav-right">
        {activePage === 'login' ? (
          <>
            <button type="button" className="nav-link">About</button>
            <button type="button" className="nav-link">Support</button>
            <button type="button" className="nav-link">Contact</button>
            <button 
              type="button" 
              className="nav-signin-text"
              onClick={handleSignInClick}
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            <button type="button" className="nav-icon-btn" aria-label="Notifications">
              <i className="fa-solid fa-bell"></i>
            </button>
            <button type="button" className="nav-icon-btn" aria-label="Log out" onClick={onLogout}>
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
