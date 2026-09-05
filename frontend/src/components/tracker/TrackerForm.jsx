import { useEffect, useState } from "react";
import "./TrackerForm.css";

const STATUS_OPTIONS = [
  { value: "new_inquiry", label: "New Inquiry" },
  { value: "interested", label: "Interested" },
  { value: "negotiation", label: "Negotiation" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "deal_confirmed", label: "Deal Confirmed" },
  {
    value: "content_in_progress",
    label: "Content In Progress",
  },
  {
    value: "content_submitted",
    label: "Content Submitted",
  },
  {
    value: "revision_required",
    label: "Revision Required",
  },
  {
    value: "awaiting_approval",
    label: "Awaiting Approval",
  },
  {
    value:"follow_up_due",
    label:"Follow-up Due",
  },
  {
    value: "campaign_live",
    label: "Campaign Live",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "declined",
    label: "Declined",
  },
  
];

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "not_discussed",
    label: "Not Discussed",
  },
  {
    value: "negotiating",
    label: "Negotiating",
  },
  {
    value: "pending",
    label: "Payment Pending",
  },
  {
    value: "partially_paid",
    label: "Partially Paid",
  },
  {
    value: "paid",
    label: "Paid",
  },
];

function TrackerForm({
  isOpen,
  onClose,
  onSave,
  initialValues = {},
  isEditMode = false,
}) {
  const [brandName, setBrandName] = useState("");

  const [contactName, setContactName] = useState("");

  const [email, setEmail] = useState("");

  const [collaborationTitle, setCollaborationTitle] = useState("");

  const [status, setStatus] = useState("new_inquiry");

  const [priority, setPriority] = useState("medium");

  const [followUpDate, setFollowUpDate] = useState("");

  const [deadline, setDeadline] = useState("");

  const [proposedAmount, setProposedAmount] = useState("");

  const [currency, setCurrency] = useState("INR");

  const [paymentStatus, setPaymentStatus] = useState("not_discussed");

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setBrandName(initialValues.brandName || "");

    setContactName(initialValues.contactName || "");

    setEmail(initialValues.email || "");

    setCollaborationTitle(initialValues.collaborationTitle || "");

    setStatus(initialValues.status || "new_inquiry");

    setPriority(initialValues.priority || "medium");

    setFollowUpDate(
      initialValues.followUpDate
        ? initialValues.followUpDate.toString().slice(0, 10)
        : "",
    );

    setDeadline(
      initialValues.deadline
        ? initialValues.deadline.toString().slice(0, 10)
        : "",
    );

    setProposedAmount(initialValues.proposedAmount ?? "");

    setCurrency(initialValues.currency || "INR");

    setPaymentStatus(initialValues.paymentStatus || "not_discussed");

    setNotes(initialValues.notes || "");
  }, [isOpen, initialValues]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trackerData = {
      brandName: brandName.trim(),

      contactName: contactName.trim(),

      email: email.trim(),

      collaborationTitle: collaborationTitle.trim(),

      status,

      priority,

      followUpDate: followUpDate || null,

      deadline: deadline || null,

      proposedAmount: proposedAmount !== "" ? Number(proposedAmount) : null,

      currency,

      paymentStatus,

      notes: notes.trim(),

      label: initialValues.label || "",

      threadId: initialValues.threadId || null,
    };

    onSave(trackerData);

    // Parent component will close the form
  }

  const formTitle = isEditMode
    ? "Edit Tracker"
    : initialValues.threadId
      ? "Add Email to Tracker"
      : "Create Tracker";

  const submitButtonText = isEditMode
    ? "Save Changes"
    : initialValues.threadId
      ? "Add to Tracker"
      : "Create Tracker";

  return (
    <div className="clb-tracker-form-backdrop" onClick={onClose}>
      <div
        className="clb-tracker-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="
            clb-tracker-form-modal__header
          "
        >
          <h2>{formTitle}</h2>

          <button
            type="button"
            className="
              clb-tracker-form-modal__close
            "
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <form className="clb-tracker-form" onSubmit={handleSubmit}>
          <label>
            Brand / Company Name
            <input
              type="text"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="e.g. Nike"
              required
            />
          </label>

          <label>
            Contact Person
            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Contact name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contact@brand.com"
            />
          </label>

          <label>
            Collaboration Title
            <input
              type="text"
              value={collaborationTitle}
              onChange={(event) => setCollaborationTitle(event.target.value)}
              placeholder="e.g. Summer Campaign"
              required
            />
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Next Follow-up
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
            />
          </label>

          <label>
            Campaign Deadline
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>

          <label>
            Proposed Amount
            <input
              type="number"
              min="0"
              value={proposedAmount}
              onChange={(event) => setProposedAmount(event.target.value)}
              placeholder="e.g. 25000"
            />
          </label>

          <label>
            Currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="INR">INR (₹)</option>

              <option value="USD">USD ($)</option>

              <option value="EUR">EUR (€)</option>
            </select>
          </label>

          <label>
            Payment Status
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Notes
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="
                Add important details about
                this collaboration...
              "
            />
          </label>

          <div
            className="
              clb-tracker-form__actions
            "
          >
            <button
              type="button"
              className="
                clb-btn clb-btn--ghost
              "
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="
                clb-btn clb-btn--primary
              "
            >
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TrackerForm;
