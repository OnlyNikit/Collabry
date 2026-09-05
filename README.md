# Collabry

**Collabry** is a creator-focused email and collaboration management platform.

Creators can manage brand emails, organize conversations with custom labels, track collaborations, receive notifications, and handle communication from one workspace.

---

# Tech Stack

## Frontend

* React.js
* Vite
* React Router
* Axios
* CSS / Tailwind CSS (optional)

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose

## External APIs

* Google OAuth
* Gmail API
* Google Drive API

---

# Project Structure

```text
collabry/
│
├── public/
│   └── favicon.svg
│
├── src/
│   │
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── routes/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── data/
│   ├── utils/
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── .env
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

# FRONTEND – `src/`

## `src/main.jsx`

### Purpose

Application ka entry point.

### Is file mein kya hoga?

* React application render hoga.
* `App.jsx` import hoga.
* Browser Router later yahan ya `App.jsx` mein wrap kiya ja sakta hai.
* Global CSS import hogi.

```text
main.jsx
    ↓
App.jsx
    ↓
Routes
    ↓
Pages
    ↓
Components
```

---

# `src/App.jsx`

### Purpose

Main application component.

### Is file mein kya hoga?

* Application routes render hongi.
* Context providers wrap kiye ja sakte hain.
* Global application structure handle hoga.

Example responsibility:

```text
App
│
├── Auth Provider
├── Notification Provider
│
└── App Routes
```

---

# `src/index.css`

### Purpose

Global styling.

### Is file mein kya hoga?

* CSS reset
* Global fonts
* Body styling
* CSS variables
* Common styles

Example:

```text
body
root
button
input
scrollbar
global colors
```

**Page-specific CSS yahan unnecessarily mat bharna.**

---

# `src/assets/`

Static frontend assets.

```text
assets/
├── images/
├── icons/
└── fonts/
```

## `images/`

Website images.

Example:

```text
images/
├── logo.png
├── login-illustration.png
└── empty-inbox.png
```

## `icons/`

Custom SVG icons.

Example:

```text
icons/
├── gmail.svg
├── collaboration.svg
└── notification.svg
```

## `fonts/`

Agar local custom fonts use karte ho.

---

# `src/components/`

Reusable UI components.

**Rule:** Components ko page logic se unnecessarily mix mat karo.

---

## `components/common/`

Generic reusable components.

```text
common/
├── Button.jsx
├── Input.jsx
├── Modal.jsx
├── Loader.jsx
├── Avatar.jsx
└── EmptyState.jsx
```

### `Button.jsx`

Reusable button.

Use cases:

```text
Login
Send Email
Create Label
Save Changes
```

### `Input.jsx`

Reusable input field.

Use cases:

```text
Email
Password
Search
Label Name
```

### `Modal.jsx`

Popup/modal component.

Use cases:

```text
Create Label
Delete Confirmation
New Collaboration
```

### `Loader.jsx`

Loading state.

Use cases:

```text
Fetching emails...
Loading dashboard...
Connecting Gmail...
```

### `Avatar.jsx`

User profile image component.

### `EmptyState.jsx`

Jab koi data available na ho.

Example:

```text
No emails found
No collaborations yet
No notifications
```

---

# `components/layout/`

Application layout components.

```text
layout/
├── Navbar.jsx
├── Sidebar.jsx
├── Header.jsx
└── MobileSidebar.jsx
```

### `Navbar.jsx`

Landing page navigation.

Example:

```text
Logo
Features
How it Works
Login Button
```

### `Sidebar.jsx`

Dashboard ke left side ka navigation.

Example:

```text
Dashboard
Inbox
Labels
Collaborations
Notifications
Settings
```

### `Header.jsx`

Dashboard ka top section.

Example:

```text
Search
Notifications
User Profile
```

### `MobileSidebar.jsx`

Mobile devices ke liye responsive sidebar.

---

# `components/inbox/`

Email-related UI components.

```text
inbox/
├── EmailList.jsx
├── EmailItem.jsx
├── EmailViewer.jsx
├── ComposeEmail.jsx
├── ReplyBox.jsx
└── AttachmentPreview.jsx
```

### `EmailList.jsx`

Emails ki complete list display karega.

Example:

```text
Sender
Subject
Preview
Date
Unread Status
```

### `EmailItem.jsx`

Single email row/card.

Example:

```text
Brand Name
Subject
Message Preview
Time
Label
```

### `EmailViewer.jsx`

Selected email ka full content.

Features:

```text
Sender Information
Subject
Message Content
Attachments
Labels
Reply Button
```

### `ComposeEmail.jsx`

New email compose karne ke liye.

Fields:

```text
To
Subject
Message
Attachments
Send Button
```

### `ReplyBox.jsx`

Existing email ka reply.

### `AttachmentPreview.jsx`

Files preview.

Example:

```text
PDF
Image
Google Drive File
Document
```

---

# `components/labels/`

Email labels ke components.

```text
labels/
├── LabelList.jsx
├── LabelItem.jsx
└── CreateLabel.jsx
```

### `LabelList.jsx`

Sidebar ya page mein saare labels.

Example:

```text
Brand Deals
Paid Collaborations
Pending Reply
Important
```

### `LabelItem.jsx`

Single label component.

### `CreateLabel.jsx`

New custom label create karne ka form/modal.

---

# `components/collaborations/`

Brand collaboration management components.

```text
collaborations/
├── CollaborationCard.jsx
├── CollaborationList.jsx
└── CollaborationForm.jsx
```

### `CollaborationCard.jsx`

Single collaboration ka summary.

Example:

```text
Brand Name
Campaign
Status
Deadline
Payment
```

### `CollaborationList.jsx`

Saari collaborations display karega.

### `CollaborationForm.jsx`

New collaboration create/edit.

Fields:

```text
Brand Name
Campaign Name
Status
Deadline
Budget
Notes
```

---

# `components/notifications/`

```text
notifications/
└── NotificationItem.jsx
```

### `NotificationItem.jsx`

Single notification.

Example:

```text
New reply from Nike
New collaboration request
Payment deadline approaching
```

---

# `src/pages/`

Application ke main pages.

```text
pages/
├── Landing/
├── Auth/
├── Dashboard/
├── Inbox/
├── Labels/
├── Collaborations/
├── Notifications/
└── Settings/
```

---

## `pages/Landing/Landing.jsx`

### Purpose

Public homepage.

Sections:

```text
Navbar
Hero
Features
How It Works
Benefits
Call To Action
Footer
```

---

## `pages/Auth/Login.jsx`

### Purpose

User login page.

Initially:

```text
Continue with Google
```

Later:

```text
Google OAuth authentication
```

---

## `pages/Auth/Onboarding.jsx`

### Purpose

New user setup.

Possible information:

```text
Creator Name
Profile Image
Creator Category
Main Email
Preferences
```

---

## `pages/Dashboard/Dashboard.jsx`

### Purpose

User ka overview.

Show:

```text
Unread Emails
Pending Replies
Active Collaborations
Recent Notifications
Upcoming Deadlines
```

---

## `pages/Inbox/Inbox.jsx`

### Purpose

Complete email workspace.

Layout:

```text
Sidebar
   +
Email List
   +
Email Viewer
```

---

## `pages/Labels/Labels.jsx`

### Purpose

Labels manage karne ka page.

Features:

```text
View Labels
Create Label
Edit Label
Delete Label
```

---

## `pages/Collaborations/Collaborations.jsx`

### Purpose

Creator ke brand collaborations manage karna.

Features:

```text
All Collaborations
Active
Completed
Pending
```

---

## `pages/Notifications/Notifications.jsx`

### Purpose

All notifications.

Features:

```text
New Email Replies
Important Updates
Collaboration Updates
```

---

## `pages/Settings/Settings.jsx`

### Purpose

User settings.

Sections:

```text
Profile
Google Account
Notifications
Connected Accounts
Preferences
```

---

# `src/layouts/`

Page layouts.

```text
layouts/
├── MainLayout.jsx
├── DashboardLayout.jsx
└── AuthLayout.jsx
```

---

## `MainLayout.jsx`

Landing/public pages ke liye.

Structure:

```text
Navbar
Page Content
Footer
```

---

## `DashboardLayout.jsx`

Logged-in user pages ke liye.

Structure:

```text
Sidebar
Header
Main Content
```

Used in:

```text
Dashboard
Inbox
Labels
Collaborations
Notifications
Settings
```

---

## `AuthLayout.jsx`

Login aur onboarding pages.

---

# `src/routes/`

Application routing.

```text
routes/
├── AppRoutes.jsx
└── ProtectedRoute.jsx
```

---

## `AppRoutes.jsx`

Saari routes define hongi.

Example:

```text
/                 → Landing
/login            → Login
/dashboard        → Dashboard
/inbox            → Inbox
/labels           → Labels
/collaborations   → Collaborations
/notifications    → Notifications
/settings         → Settings
```

---

## `ProtectedRoute.jsx`

Unauthorized users ko protected pages access karne se rokega.

Example:

```text
User logged in?
       │
   Yes │ No
       │
Dashboard → Login
```

---

# `src/context/`

Global state management.

```text
context/
├── AuthContext.jsx
├── EmailContext.jsx
└── NotificationContext.jsx
```

### `AuthContext.jsx`

User authentication data.

Example:

```text
user
isAuthenticated
login()
logout()
```

### `EmailContext.jsx`

Global email state.

Example:

```text
emails
selectedEmail
loading
fetchEmails()
```

### `NotificationContext.jsx`

Notification state.

Example:

```text
notifications
unreadCount
markAsRead()
```

> शुरुआत में Context API enough hai. Redux abhi add karna unnecessary complexity hogi.

---

# `src/hooks/`

Custom React hooks.

```text
hooks/
├── useAuth.js
├── useEmails.js
└── useNotifications.js
```

### `useAuth.js`

Auth context use karna easy banayega.

### `useEmails.js`

Email-related reusable logic.

### `useNotifications.js`

Notifications ka reusable logic.

---

# `src/services/`

Backend API calls.

```text
services/
├── api.js
├── authService.js
├── emailService.js
├── labelService.js
└── collaborationService.js
```

---

## `api.js`

Axios configuration.

Example responsibility:

```text
Base URL
Authorization token
Request interceptors
Response interceptors
```

---

## `authService.js`

Authentication API calls.

Functions:

```text
login()
logout()
getCurrentUser()
```

---

## `emailService.js`

Email API calls.

Functions:

```text
getEmails()
getEmailById()
sendEmail()
replyToEmail()
```

---

## `labelService.js`

Label API calls.

Functions:

```text
getLabels()
createLabel()
updateLabel()
deleteLabel()
```

---

## `collaborationService.js`

Collaboration API calls.

Functions:

```text
getCollaborations()
createCollaboration()
updateCollaboration()
deleteCollaboration()
```

---

# `src/data/`

Temporary mock data.

```text
data/
├── mockEmails.js
├── mockLabels.js
└── mockCollaborations.js
```

### Purpose

Backend banne se pehle UI develop karna.

Example:

```text
React UI
   ↓
Mock Data
   ↓
UI Complete
   ↓
Replace Mock Data
   ↓
Real API
```

---

# `src/utils/`

Helper functions.

```text
utils/
├── constants.js
├── helpers.js
└── formatDate.js
```

---

## `constants.js`

Application constants.

Example:

```text
API URLs
COLLABORATION STATUS
LABEL TYPES
```

---

## `helpers.js`

Reusable helper functions.

Example:

```text
truncateText()
getInitials()
formatFileSize()
```

---

## `formatDate.js`

Date formatting.

Example:

```text
27 Aug 2026
2 hours ago
Yesterday
```

---

# BACKEND – `server/`

Backend abhi baad mein implement kar sakte ho.

```text
server/
├── config/
├── controllers/
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
└── server.js
```

---

# `server/server.js`

### Purpose

Express application ka entry point.

Responsibilities:

```text
Create Express App
Connect Middleware
Register Routes
Connect Database
Start Server
```

Flow:

```text
server.js
    ↓
Middleware
    ↓
Routes
    ↓
Controllers
    ↓
Services / Models
    ↓
MongoDB / Gmail API
```

---

# `server/config/`

Configuration files.

```text
config/
├── db.js
└── google.js
```

---

## `db.js`

MongoDB connection.

Responsibilities:

```text
Read MongoDB URI
Connect MongoDB
Handle Connection Errors
```

---

## `google.js`

Google API configuration.

Responsibilities:

```text
Google OAuth Client
Gmail API Client
Google Drive API Client
```

---

# `server/controllers/`

Request handling logic.

```text
controllers/
├── authController.js
├── emailController.js
├── labelController.js
├── collaborationController.js
├── notificationController.js
└── uploadController.js
```

---

## `authController.js`

Authentication logic.

Functions:

```text
googleLogin()
googleCallback()
logout()
getCurrentUser()
```

---

## `emailController.js`

Email requests.

Functions:

```text
getEmails()
getEmail()
sendEmail()
replyEmail()
```

---

## `labelController.js`

Label management.

Functions:

```text
getLabels()
createLabel()
updateLabel()
deleteLabel()
assignLabel()
```

---

## `collaborationController.js`

Brand collaboration management.

Functions:

```text
getCollaborations()
createCollaboration()
updateCollaboration()
deleteCollaboration()
```

---

## `notificationController.js`

Notifications handle karega.

---

## `uploadController.js`

Files upload handle karega.

---

# `server/models/`

MongoDB schemas.

```text
models/
├── User.js
├── Label.js
├── Collaboration.js
└── Notification.js
```

---

## `User.js`

User information.

Possible fields:

```text
name
email
profilePicture
googleId
refreshToken
createdAt
```

> Google tokens ko plain text mein casually store mat karna. Production mein encryption/security strategy zaroor chahiye.

---

## `Label.js`

Custom labels.

Possible fields:

```text
userId
name
color
gmailLabelId
```

---

## `Collaboration.js`

Brand collaboration information.

Possible fields:

```text
userId
brandName
campaignName
status
deadline
budget
notes
```

---

## `Notification.js`

App notifications.

Possible fields:

```text
userId
type
message
isRead
createdAt
```

---

# `server/routes/`

API endpoints.

```text
routes/
├── authRoutes.js
├── emailRoutes.js
├── labelRoutes.js
├── collaborationRoutes.js
├── notificationRoutes.js
└── uploadRoutes.js
```

Example:

```text
GET    /api/emails
GET    /api/emails/:id
POST   /api/emails/send
POST   /api/emails/:id/reply
```

---

# `server/middleware/`

Express middleware.

```text
middleware/
├── authMiddleware.js
├── errorMiddleware.js
└── uploadMiddleware.js
```

---

## `authMiddleware.js`

Protected API requests verify karega.

Example:

```text
Request
   ↓
Check Authentication
   ↓
Valid?
 ┌───┴───┐
Yes      No
 ↓        ↓
API    Error
```

---

## `errorMiddleware.js`

Central error handling.

---

## `uploadMiddleware.js`

File upload handling.

Example:

```text
PDF
Image
Document
```

---

# `server/services/`

External API business logic.

```text
services/
├── gmailService.js
├── googleDriveService.js
└── notificationService.js
```

---

## `gmailService.js`

Gmail API se communication.

Functions:

```text
fetchEmails()
getEmail()
sendEmail()
replyEmail()
getAttachments()
```

---

## `googleDriveService.js`

Google Drive integration.

Functions:

```text
uploadFile()
getFileLink()
```

---

## `notificationService.js`

Notification creation and management.

---

# `server/utils/`

Backend helper functions.

```text
utils/
├── generateToken.js
├── apiError.js
└── asyncHandler.js
```

---

# ENVIRONMENT VARIABLES

## Root `.env`

Frontend Vite variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Collabry
```

**Important:** Vite mein frontend variables `VITE_` se start hote hain.

---

## `server/.env`

Backend secrets:

```env
PORT=5000

MONGODB_URI=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

JWT_SECRET=
CLIENT_URL=http://localhost:5173
```

**Kabhi bhi `.env` GitHub par push mat karna.**

---

# `.gitignore`

Recommended:

```gitignore
# Dependencies
node_modules/

# Environment files
.env
.env.local
.env.*

!.env.example

# Build files
dist/
.next/

# Logs
*.log

# OS files
.DS_Store
```

---

# DEVELOPMENT ORDER

Sab files ek saath bana dena productive nahi hoga. Bahut saari empty files unnecessary ho jayengi.

## Phase 1 — Frontend Setup

```text
1. Clean default Vite files
2. Setup folder structure
3. Install React Router
4. Create routes
5. Create layouts
```

---

## Phase 2 — Landing Page

```text
Navbar
Hero Section
Features
How It Works
Footer
```

---

## Phase 3 — Authentication UI

```text
Login Page
Google Login Button
Onboarding UI
```

---

## Phase 4 — Dashboard UI

```text
Sidebar
Header
Dashboard
Mock Data
```

---

## Phase 5 — Inbox UI

```text
Email List
Email Viewer
Reply Box
Compose Email
Labels
```

---

## Phase 6 — Backend

```text
Express Setup
MongoDB Connection
Models
Routes
Controllers
```

---

## Phase 7 — Google Integration

```text
Google OAuth
Token Handling
Gmail API
Email Fetching
Email Sending
Replies
```

---

# IMPORTANT ARCHITECTURE DECISION

Gmail ka har email permanently MongoDB mein copy karna default approach nahi hona chahiye.

Recommended approach:

```text
Gmail
  ↓
Gmail API
  ↓
Express Backend
  ↓
React Frontend
```

MongoDB mainly use hoga:

```text
Users
Custom Labels
Email-to-Label Mapping
Collaborations
Notifications
Preferences
```

---

# CURRENT FIRST TASK

Abhi sabse pehle:

```text
src/
├── components/
├── pages/
├── layouts/
├── routes/
├── data/
├── services/
└── utils/
```

Create karo.

Uske baad **React Router setup → Landing Page → Login Page → Dashboard Layout** ke order mein build karna better rahega.
