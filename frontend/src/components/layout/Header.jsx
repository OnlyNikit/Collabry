import { useEffect, useMemo, useRef, useState } from "react";

import { Menu, LogOut, Settings, Search, X, Mail } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useEmails } from "../../context/EmailContext";
import { useMailbox } from "../../context/MailboxContext";

import ProfileAccounts from "./ProfileAccounts";

import "./header.css";

function Header({ onMenuClick }) {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { emails, selectEmail } = useEmails();
  const { acting, clearActing } = useMailbox();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchRef = useRef(null);
  const profileRef = useRef(null);

  /* USER DATA */

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const profilePicture = user?.profilePicture || null;
  const avatarInitial = userName.charAt(0).toUpperCase();

  // When working in someone else's inbox, show that instead of own email
  const profileSubtitle = acting
    ? `Viewing ${acting.ownerName}'s inbox`
    : userEmail;

  /* NOTIFICATION DATA */

  const notificationCount = Number(unreadCount) || 0;
  const notificationBadge = notificationCount > 99 ? "99+" : notificationCount;

  /* SEARCH RESULTS */

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    if (!Array.isArray(emails)) {
      return [];
    }

    return emails
      .filter((email) => {
        const searchableText = [
          email?.subject,
          email?.sender,
          email?.senderEmail,
          email?.from,
          email?.snippet,
          email?.body,
          email?.to,
        ]
          .flat()
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 8);
  }, [emails, searchQuery]);

  /* CLOSE SEARCH / PROFILE MENU WHEN CLICKING OUTSIDE */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* ESCAPE KEY */

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsSearchFocused(false);
        setSearchQuery("");
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* SEARCH RESULT HELPERS */

  function getEmailId(email) {
    return email?.id || email?._id || email?.gmailMessageId || null;
  }

  function getSenderName(email) {
    return (
      email?.sender || email?.senderEmail || email?.from || "Unknown sender"
    );
  }

  function getSenderEmail(email) {
    if (email?.senderEmail) {
      return email.senderEmail;
    }

    if (typeof email?.from === "string") {
      return email.from;
    }

    return "";
  }

  /* SELECT SEARCH RESULT */

  async function handleSearchResultClick(email) {
    const emailId = getEmailId(email);

    if (!emailId) {
      return;
    }

    setIsSearchFocused(false);
    setSearchQuery("");

    try {
      await selectEmail(emailId);

      navigate("/inbox");
    } catch (error) {
      console.error("[HEADER SEARCH] Failed to open email:", error);

      navigate("/inbox");
    }
  }

  /* SEARCH SUBMIT */

  async function handleSearchSubmit(event) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    if (searchResults.length === 1) {
      await handleSearchResultClick(searchResults[0]);

      return;
    }

    setIsSearchFocused(true);
  }

  /* CLEAR SEARCH */

  function handleClearSearch() {
    setSearchQuery("");
    setIsSearchFocused(true);
    searchRef.current?.querySelector("input")?.focus();
  }

  /* PROFILE */

  function handleProfileClick() {
    setIsProfileOpen((previous) => !previous);
  }

  function handleProfileSettings() {
    setIsProfileOpen(false);
    navigate("/settings");
  }

  /* LOGOUT */

  async function handleLogout() {
    setIsProfileOpen(false);

    // Never start the next login inside someone else's mailbox
    clearActing();

    try {
      await logout();
    } catch (error) {
      console.error("[HEADER] Logout failed:", error);
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  }

  /* NOTIFICATIONS */

  function handleNotificationsClick() {
    navigate("/notifications");
  }

  return (
    <header className="clb-header">
      {/* MENU BUTTON */}

      <button
        type="button"
        className="clb-header__menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* SEARCH */}

      <div
        ref={searchRef}
        className="clb-header__search"
        style={{
          position: "relative",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            position: "relative",
            width: "100%",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              opacity: 0.6,
            }}
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search emails..."
            aria-label="Search emails"
            autoComplete="off"
            style={{
              width: "100%",
              paddingLeft: "42px",
              paddingRight: searchQuery ? "42px" : "14px",
            }}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              title="Clear search"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                padding: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={17} />
            </button>
          )}
        </form>

        {/* SEARCH DROPDOWN */}

        {isSearchFocused && searchQuery.trim() && (
          <div
            className="clb-header__search-results"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 1000,
              background: "white",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "12px",
              boxShadow: "0 12px 35px rgba(0, 0, 0, 0.14)",
              overflow: "hidden",
              minWidth: "320px",
            }}
          >
            {searchResults.length > 0 ? (
              <div
                style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                {searchResults.map((email) => {
                  const emailId = getEmailId(email);

                  const sender = getSenderName(email);

                  const senderEmail = getSenderEmail(email);

                  return (
                    <button
                      key={emailId}
                      type="button"
                      onClick={() => handleSearchResultClick(email)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "11px",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background =
                          "rgba(0, 0, 0, 0.04)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          minWidth: "34px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(59, 130, 246, 0.1)",
                        }}
                      >
                        <Mail size={17} />
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "14px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {email?.subject || "(No subject)"}
                          </strong>
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            marginTop: "3px",
                            opacity: 0.7,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sender}

                          {senderEmail && senderEmail !== sender && (
                            <>
                              {" • "}
                              {senderEmail}
                            </>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            marginTop: "4px",
                            opacity: 0.6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {email?.snippet || "Open this email"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "24px 18px",
                  textAlign: "center",
                }}
              >
                <Search
                  size={28}
                  style={{
                    opacity: 0.45,
                    marginBottom: "8px",
                  }}
                />

                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  No emails found
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    opacity: 0.65,
                  }}
                >
                  Try a different subject, sender, or keyword.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HEADER ACTIONS */}

      <div className="clb-header__actions">
        {/* NOTIFICATIONS */}

        <button
          type="button"
          className="clb-header__icon-btn"
          aria-label={
            notificationCount > 0
              ? `${notificationCount} unread notifications`
              : "Notifications"
          }
          onClick={handleNotificationsClick}
        >
          🔔
          {notificationCount > 0 && (
            <span className="clb-header__badge">{notificationBadge}</span>
          )}
        </button>

        {/* PROFILE */}

        <div className="clb-header__profile" ref={profileRef}>
          <button
            type="button"
            className="clb-header__profile-btn"
            onClick={handleProfileClick}
            aria-label="Open profile menu"
            aria-expanded={isProfileOpen}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={userName}
                className="clb-header__avatar"
              />
            ) : (
              <div className="clb-header__avatar clb-header__avatar--fallback">
                {avatarInitial}
              </div>
            )}

            <div className="clb-header__profile-info">
              <span className="clb-header__profile-name">{userName}</span>

              {profileSubtitle && (
                <span className="clb-header__profile-email">
                  {profileSubtitle}
                </span>
              )}
            </div>
          </button>

          {/* PROFILE DROPDOWN */}

          {isProfileOpen && (
            <div className="clb-header__profile-dropdown">
              <ProfileAccounts onDone={() => setIsProfileOpen(false)} />

              <button
                type="button"
                className="clb-header__dropdown-item"
                onClick={handleProfileSettings}
              >
                <Settings size={17} />

                <span>Settings</span>
              </button>

              <button
                type="button"
                className="clb-header__dropdown-item"
                onClick={handleLogout}
              >
                <LogOut size={17} />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;