import {
  Routes,
  Route,
} from "react-router-dom";

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

// FIX: data providers ab yahan hain — sirf protected area ke
// liye — na ki App.jsx mein root pe. Isse ye providers TABHI
// mount honge jab user authenticated ho chuka hai (ProtectedRoute
// ke andar), aur inka initial-fetch effect turant successfully
// chalega. Landing/Login jaise public pages par ye ab mount hi
// nahi honge, isliye unauthenticated fetch attempt bhi nahi hoga.
import { TrackerProvider } from "../context/TrackerContext";
import { CollaborationProvider } from "../context/CollaborationsContext";
import { EmailsProvider } from "../context/EmailContext";
import { LabelsProvider } from "../context/LabelsContext";
import { EmailLabelsProvider } from "../context/EmailLabelsContext";

/* =====================================
   PROTECTED DATA PROVIDERS + LAYOUT

   FIX: is wrapper component ko protected route
   tree ke root pe use kiya gaya hai, taaki:

   1. Ye tabhi mount ho jab user authenticated ho
      (ProtectedRoute ke andar hai)
   2. Website load hote hi (ya seedha /labels pe
      land karne par bhi) emails/labels ka initial
      fetch turant chale — Inbox pe click karne ka
      wait na karna pade
   3. /inbox, /labels, /tracker jaise sibling routes
      ke beech navigate karne par ye providers
      remount NA hon (same parent Route element hai)
===================================== */

function ProtectedProviders() {
  return (
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
  );
}

function AppRoutes() {
  return (
    <Routes>

      {/* ================================
          PUBLIC ROUTES

          FIX: ab EmailsProvider/LabelsProvider
          in routes ke scope mein bilkul nahi hain,
          isliye Landing/Login par koi unauthenticated
          /api/emails ya /api/labels call nahi jaati.
      ================================= */}

      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />

      <Route path="/auth/success" element={<AuthSuccess />} />

      {/* ================================
          PROTECTED ROUTES
      ================================= */}

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