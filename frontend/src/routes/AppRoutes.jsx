import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import Landing from "../pages/Landing/Landing";
import Login from "../pages/Auth/Login";
import AuthSuccess from "../pages/Auth/AuthSuccess";
import Dashboard from "../pages/Dashboard/Dashboard";
import Inbox from "../pages/Inbox/Inbox";
import Tracker from "../pages/Tracker/Tracker";
import Labels from "../pages/Labels/Labels";
import AllLabels from "../pages/Labels/AllLabels";
import LabelDetail from "../components/labels/LabelDetails";
import Collaborations from "../pages/Collaborations/Collaborations";
import Notifications from "../pages/Notifications/Notifications";
import Settings from "../pages/Settings/Settings";

import DashboardLayout from "../layouts/DashboardLayout";
import SharedView from "../pages/SharedView";

/* =========================================================
   DATA PROVIDERS
   (ActingAsProvider hata diya: delegation ka state ab sirf
    MailboxProvider me hai, jo main.jsx me already mounted hai)
========================================================= */

import { TrackerProvider } from "../context/TrackerContext";

import { CollaborationProvider } from "../context/CollaborationsContext";

import { EmailsProvider } from "../context/EmailContext";

import { LabelsProvider } from "../context/LabelsContext";

import { EmailLabelsProvider } from "../context/EmailLabelsContext";

import { NotificationProvider } from "../context/NotificationContext";

/*
=========================================================
PROTECTED DATA PROVIDERS + LAYOUT

NotificationProvider
        ↓
LabelsProvider
        ↓
EmailLabelsProvider
        ↓
EmailsProvider
        ↓
CollaborationProvider
        ↓
TrackerProvider
        ↓
DashboardLayout
=========================================================
*/

function ProtectedProviders() {
  return (
    <NotificationProvider>
      <LabelsProvider>
        <EmailLabelsProvider>
          <EmailsProvider>
            <CollaborationProvider>
              <TrackerProvider>
                <DashboardLayout />
              </TrackerProvider>
            </CollaborationProvider>
          </EmailsProvider>
        </EmailLabelsProvider>
      </LabelsProvider>
    </NotificationProvider>
  );
}

/* =========================================================
   APP ROUTES
========================================================= */

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}

      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />

      <Route path="/auth/success" element={<AuthSuccess />} />

      <Route path="/shared/:token" element={<SharedView />} />

      {/* PROTECTED ROUTES */}

      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedProviders />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/inbox" element={<Inbox />} />

          <Route path="/tracker" element={<Tracker />} />

          <Route path="/labels" element={<AllLabels />} />

          <Route path="/labels/:labelId" element={<LabelDetail />} />

          <Route path="/collaborations" element={<Collaborations />} />

          <Route path="/notifications" element={<Notifications />} />

          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
