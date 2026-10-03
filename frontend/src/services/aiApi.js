/* Delegated mailbox: acting-as owner ki id (EmailContext bhi yahi use karta hai) */
import { getActingOwnerId } from "../context/MailboxContext";

const API_URL = import.meta.env.VITE_API_URL;

/* =========================================================
   HEADERS

   FIX: pehle yahan "X-Acting-As" header nahi jaata tha.
   Isliye delegated inbox me AI request backend par aapki
   APNI mailbox me email dhoondti thi aur "Email not found"
   (404) aata tha. Ab EmailContext ki tarah ye header har
   AI request ke saath jaata hai.
========================================================= */

function buildHeaders({ json = false } = {}) {
  const headers = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  const actingOwnerId = getActingOwnerId();

  if (actingOwnerId) {
    headers["X-Acting-As"] = actingOwnerId;
  }

  return headers;
}

/* =========================================================
   DRAFT HELPER
========================================================= */

async function postForDraft(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(payload),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    /* JSON nahi tha */
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error?.message || "AI request failed",
    );
  }

  const draft = data?.data?.body;

  if (!draft) {
    throw new Error("AI returned an empty draft");
  }

  return draft;
}

/* =========================================================
   SUMMARY HELPER
========================================================= */

async function postForSummary(endpoint, emptyMessage) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders({ json: true }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    /* JSON nahi tha */
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error?.message || "AI summary request failed",
    );
  }

  const summary = data?.data?.summary;

  if (!summary) {
    throw new Error(emptyMessage);
  }

  return {
    summary,
    cached: Boolean(data?.cached),
    threadId: data?.data?.threadId || null,
  };
}

/* =========================================================
   AI COMPOSE
========================================================= */

/* Naya mail: user ki instruction + (optional) to aur subject */
export function generateComposeDraft({ to, subject, instruction, tone }) {
  return postForDraft("/api/emails/ai/compose", {
    to,
    subject,
    instruction,
    tone,
  });
}

/* =========================================================
   AI REPLY
========================================================= */

/*
  Reply:
  backend khud poora thread DB se laata hai,
  sirf emailId + optional instruction/tone chahiye.
*/
export function generateReplyDraft(emailId, { instruction, tone } = {}) {
  return postForDraft(`/api/emails/${encodeURIComponent(emailId)}/ai-reply`, {
    instruction,
    tone,
  });
}

/* =========================================================
   AI THREAD SUMMARY
========================================================= */

/*
  Selected email ke complete thread ka AI summary.

  Backend:
  - selected thread fetch karega
  - MongoDB cache check karega
  - cached summary fresh hai to wahi return karega
  - new message aaya hai to fresh AI summary generate karega
*/
export function generateThreadSummary(emailId) {
  if (!emailId) {
    return Promise.reject(new Error("Email ID is required"));
  }

  return postForSummary(
    `/api/emails/${encodeURIComponent(emailId)}/ai-summary`,
    "AI returned an empty thread summary",
  );
}

/* =========================================================
   AI SINGLE MESSAGE SUMMARY
========================================================= */

/*
  Thread ke sirf ek particular message ka summary.
  Backend sirf usi message ko AI ko bhejta hai.
*/
export function generateMessageSummary(messageId) {
  if (!messageId) {
    return Promise.reject(new Error("Message ID is required"));
  }

  return postForSummary(
    `/api/emails/${encodeURIComponent(messageId)}/ai-message-summary`,
    "AI returned an empty message summary",
  );
}