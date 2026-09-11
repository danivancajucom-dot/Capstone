import React from 'react';
import './LoginNav.css';
import logo from '../../assets/logo.png';

export default function LoginNav({
  activePage,
  onChangePage,
  onSignIn,
  onLogout,
  onAboutClick,
  onSupportClick,
  onContactClick,
}) {
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
          <p className="brand-name">SpaceS CICT</p>
        </div>
      </div>
      
      <div className="nav-right">
        {activePage === 'login' ? (
          <>
            <button type="button" className="nav-link" onClick={onAboutClick}>
              About
            </button>
            <button type="button" className="nav-link" onClick={onSupportClick}>
              Support
            </button>
            <button type="button" className="nav-link" onClick={onContactClick}>
              Contact
            </button>
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