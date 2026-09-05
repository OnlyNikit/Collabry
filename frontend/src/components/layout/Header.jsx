import { useState } from "react";

import {
  Menu,
  LogOut,
  User,
  Settings,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import "./header.css";

function Header({ onMenuClick }) {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const [
    isProfileOpen,
    setIsProfileOpen,
  ] = useState(false);

  /* ========================================
     USER DATA
  ======================================== */

  const userName =
    user?.name ||
    "User";

  const userEmail =
    user?.email ||
    "";

  const profilePicture =
    user?.profilePicture ||
    null;

  const avatarInitial =
    userName
      .charAt(0)
      .toUpperCase();

  /* ========================================
     PROFILE DROPDOWN
  ======================================== */

  function handleProfileClick() {
    setIsProfileOpen(
      (previous) => !previous
    );
  }

  /* ========================================
     GO TO SETTINGS
  ======================================== */

  function handleProfileSettings() {
    setIsProfileOpen(false);

    navigate("/settings");
  }

  /* ========================================
     LOGOUT
  ======================================== */

  async function handleLogout() {
    try {
      await logout();

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "LOGOUT FAILED:",
        error
      );

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }

    setIsProfileOpen(false);
  }

  return (
    <header className="clb-header">

      {/* ===============================
          SIDEBAR MENU
      =============================== */}

      <button
        type="button"
        className="clb-header__menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>


      {/* ===============================
          SEARCH
      =============================== */}

      <div className="clb-header__search">

        <span
          className="clb-header__search-icon"
          aria-hidden="true"
        >
          🔍
        </span>

        <input
          type="search"
          placeholder="Search emails, brands, collaborations…"
          aria-label="Search"
        />

      </div>


      {/* ===============================
          HEADER ACTIONS
      =============================== */}

      <div className="clb-header__actions">

        {/* NOTIFICATIONS */}

        <button
          type="button"
          className="clb-header__icon-btn"
          aria-label="Notifications"
          onClick={() =>
            navigate(
              "/notifications"
            )
          }
        >
          🔔

          <span className="clb-header__badge">
            3
          </span>

        </button>


        {/* ===============================
            PROFILE
        =============================== */}

        <div className="clb-header__profile">

          <button
            type="button"
            className="clb-header__user"
            onClick={handleProfileClick}
            aria-expanded={isProfileOpen}
            aria-label="Open profile menu"
          >

            {/* HEADER AVATAR */}

            <span className="clb-header__avatar">

              {profilePicture ? (

                <img
                  src={profilePicture}
                  alt={userName}
                />

              ) : (

                avatarInitial

              )}

            </span>


            {/* USER NAME */}

            <span className="clb-header__name">
              {userName}
            </span>

          </button>


          {/* ===============================
              PROFILE DROPDOWN
          =============================== */}

          {isProfileOpen && (

            <div className="clb-header__profile-menu">


              {/* USER INFO */}

              <div className="clb-header__profile-info">

                <span className="clb-header__profile-avatar">

                  {profilePicture ? (

                    <img
                      src={profilePicture}
                      alt={userName}
                    />

                  ) : (

                    <User size={18} />

                  )}

                </span>


                <div>

                  <strong>
                    {userName}
                  </strong>

                  <span>
                    {userEmail ||
                      "Account"}
                  </span>

                </div>

              </div>


              <div className="clb-header__profile-divider" />


              {/* PROFILE SETTINGS */}

              <button
                type="button"
                className="clb-header__menu-item"
                onClick={
                  handleProfileSettings
                }
              >

                <Settings size={17} />

                Profile & Settings

              </button>


              {/* LOGOUT */}

              <button
                type="button"
                className="clb-header__logout"
                onClick={handleLogout}
              >

                <LogOut size={17} />

                Logout

              </button>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}

export default Header;