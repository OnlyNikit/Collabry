import { useState } from "react";

import {
NavLink,
useLocation,
} from "react-router-dom";

import {
X,
PenSquare,
Inbox,
Mail,
Star,
Send,
FileText,
Trash2,
Home,
Tag,
Handshake,
Pin,
Bell,
Settings,
} from "lucide-react";

import Logo from "../common/Logo";
import ComposeModal from "../inbox/ComposeModal";

import "./sidebar.css";

/* =========================================================
SIDEBAR
========================================================= */

function Sidebar({
isOpen,
onClose,
}) {
const [
isComposeOpen,
setIsComposeOpen,
] = useState(false);

/* =======================================================
COMPOSE
======================================================= */

function openCompose() {
setIsComposeOpen(true);


onClose?.();


}

function closeCompose() {
setIsComposeOpen(false);
}

return (
<>
{/* ===================================================
OVERLAY
=================================================== */}


  {isOpen && (
    <div
      className="clb-sidebar-overlay"
      onClick={onClose}
    />
  )}

  {/* ===================================================
      SIDEBAR
  =================================================== */}

  <aside
    className={`clb-sidebar ${
      isOpen
        ? "clb-sidebar--open"
        : ""
    }`}
  >
    {/* =================================================
        TOP
    ================================================= */}

    <div className="clb-sidebar__top">
      <div className="clb-sidebar__brand">
        <Logo size={32} />
      </div>

      <button
        type="button"
        className="clb-sidebar__close"
        onClick={onClose}
        aria-label="Close menu"
      >
        <X size={22} />
      </button>
    </div>

    {/* =================================================
        COMPOSE
    ================================================= */}

    <div className="clb-sidebar__compose">
      <button
        type="button"
        className="clb-sidebar__compose-btn"
        onClick={openCompose}
      >
        <PenSquare size={18} />

        <span>
          Compose Email
        </span>
      </button>
    </div>

    {/* =================================================
        NAVIGATION
    ================================================= */}

    <nav className="clb-sidebar__nav">

      {/* ===============================================
          DASHBOARD
      =============================================== */}

      <NavItem
        to="/dashboard"
        label="Dashboard"
        icon={<Home size={18} />}
        onClick={onClose}
      />

      {/* ===============================================
          MAILBOX
      =============================================== */}

      <NavGroup
        label="Mailbox"
      >
        <NavItem
          to="/inbox"
          label="Inbox"
          icon={<Inbox size={17} />}
          nested
          onClick={onClose}
        />

        <NavItem
          to="/inbox?view=unread"
          label="Unread"
          icon={<Mail size={17} />}
          nested
          view="unread"
          onClick={onClose}
        />

        <NavItem
          to="/inbox?view=starred"
          label="Starred"
          icon={<Star size={17} />}
          nested
          view="starred"
          onClick={onClose}
        />

        <NavItem
          to="/inbox?view=sent"
          label="Sent"
          icon={<Send size={17} />}
          nested
          view="sent"
          onClick={onClose}
        />

        <NavItem
          to="/inbox?view=drafts"
          label="Drafts"
          icon={<FileText size={17} />}
          nested
          view="drafts"
          onClick={onClose}
        />

        <NavItem
          to="/inbox?view=trash"
          label="Trash"
          icon={<Trash2 size={17} />}
          nested
          view="trash"
          onClick={onClose}
        />
      </NavGroup>

      {/* ===============================================
          ALL LABELS ONLY
      =============================================== */}

      <NavItem
        to="/labels"
        label="All Labels"
        icon={<Tag size={18} />}
        onClick={onClose}
      />

      {/* ===============================================
          OTHER NAVIGATION
      =============================================== */}

      <NavItem
        to="/collaborations"
        label="Collaborations"
        icon={<Handshake size={18} />}
        onClick={onClose}
      />

      <NavItem
        to="/tracker"
        label="Tracker"
        icon={<Pin size={18} />}
        onClick={onClose}
      />

      <NavItem
        to="/notifications"
        label="Notifications"
        icon={<Bell size={18} />}
        onClick={onClose}
      />

      <NavItem
        to="/settings"
        label="Settings"
        icon={<Settings size={18} />}
        onClick={onClose}
      />

    </nav>
  </aside>

  {/* ===================================================
      COMPOSE MODAL
  =================================================== */}

  <ComposeModal
    isOpen={isComposeOpen}
    onClose={closeCompose}
  />
</>


);
}

/* =========================================================
NAV GROUP
========================================================= */

function NavGroup({
label,
children,
}) {
return ( <div
   className="clb-sidebar__group"
 > <span
     className="clb-sidebar__group-label"
   >
{label} </span>


  {children}
</div>


);
}

/* =========================================================
NAV ITEM
========================================================= */

function NavItem({
to,
label,
icon,
nested = false,
view,
onClick,
}) {
const location =
useLocation();

/* =======================================================
CURRENT INBOX VIEW
======================================================= */

const currentView =
new URLSearchParams(
location.search,
).get("view");

/* =======================================================
ACTIVE STATE
======================================================= */

let isCustomActive =
false;

/*
Query-based inbox routes.


Examples:
/inbox?view=starred
/inbox?view=unread


*/

if (view) {
isCustomActive =
location.pathname ===
"/inbox" &&
currentView === view;
}

/*
Normal inbox.


/inbox


*/

if (
to === "/inbox" &&
!view
) {
isCustomActive =
location.pathname ===
"/inbox" &&
!currentView;
}

return (
<NavLink
to={to}
onClick={onClick}
className={({
isActive,
}) => {
const active =
view ||
to === "/inbox"
? isCustomActive
: isActive;


    return (
      `clb-sidebar__item${
        nested
          ? " clb-sidebar__item--nested"
          : ""
      }${
        active
          ? " clb-sidebar__item--active"
          : ""
      }`
    );
  }}
>
  <span
    className="clb-sidebar__icon"
    aria-hidden="true"
  >
    {icon}
  </span>

  <span>
    {label}
  </span>
</NavLink>


);
}

export default Sidebar;
