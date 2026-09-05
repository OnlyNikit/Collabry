import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useAuth,
} from "../../context/AuthContext";

import "./setting.css";


const TABS = [
  {
    id: "profile",
    label: "Profile",
    icon: "👤",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "🔔",
  },
  {
    id: "security",
    label: "Security",
    icon: "🔒",
  },
];


function Settings() {
  const [activeTab, setActiveTab] =
    useState("profile");

  return (
    <div className="clb-settings">

      {/* ======================================================
          WELCOME
      ====================================================== */}

      <section className="clb-settings__welcome">
        <h1>Settings</h1>

        <p>
          Manage your account, preferences,
          and notifications.
        </p>
      </section>


      {/* ======================================================
          TABS
      ====================================================== */}

      <nav className="clb-settings__tabs">

        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`clb-settings__tab${
              activeTab === tab.id
                ? " clb-settings__tab--active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(tab.id)
            }
          >
            <span aria-hidden="true">
              {tab.icon}
            </span>

            <span>
              {tab.label}
            </span>
          </button>
        ))}

      </nav>


      {/* ======================================================
          TAB CONTENT
      ====================================================== */}

      {activeTab === "profile" && (
        <ProfileTab />
      )}

      {activeTab === "notifications" && (
        <NotificationsTab />
      )}

      {activeTab === "security" && (
        <SecurityTab />
      )}

    </div>
  );
}


/* =========================================================
   PROFILE TAB
========================================================= */

function ProfileTab() {

  const {
    user,
    updateUser,
  } = useAuth();


  const fileInputRef =
    useRef(null);


  /* ======================================================
     FORM STATE
  ====================================================== */

  const [formData, setFormData] =
    useState({
      name: "",
      username: "",
      phone: "",
      bio: "",
    });


  const [imagePreview, setImagePreview] =
    useState(null);


  const [selectedImage, setSelectedImage] =
    useState(null);


  const [saving, setSaving] =
    useState(false);


  const [message, setMessage] =
    useState("");


  const [error, setError] =
    useState("");


  /* ======================================================
     LOAD USER DATA
  ====================================================== */

  useEffect(() => {

    if (!user) {
      return;
    }


    setFormData({
      name:
        user.name || "",

      username:
        user.username || "",

      phone:
        user.phone || "",

      bio:
        user.bio || "",
    });


    setImagePreview(
      user.profilePicture || null
    );

  }, [user]);


  /* ======================================================
     INPUT CHANGE
  ====================================================== */

  function handleChange(event) {

    const {
      name,
      value,
    } = event.target;


    setFormData((previous) => ({
      ...previous,

      [name]: value,
    }));

  }


  /* ======================================================
     IMAGE SELECT
  ====================================================== */

  function handleImageChange(event) {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    /* -----------------------------------------------
       Validate image
    ------------------------------------------------ */

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Please select a valid image file."
      );

      return;
    }


    /* -----------------------------------------------
       Maximum size: 5MB
    ------------------------------------------------ */

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image size must be less than 5MB."
      );

      return;
    }


    setError("");

    setSelectedImage(file);


    /* -----------------------------------------------
       Create preview
    ------------------------------------------------ */

    const previewUrl =
      URL.createObjectURL(file);


    setImagePreview(
      previewUrl
    );

  }


  /* ======================================================
     UPLOAD BUTTON
  ====================================================== */

  function handleUploadClick() {

    fileInputRef.current?.click();

  }


  /* ======================================================
     REMOVE IMAGE
  ====================================================== */

  function handleRemoveImage() {

    setImagePreview(null);

    setSelectedImage(null);


    if (fileInputRef.current) {

      fileInputRef.current.value =
        "";

    }

  }


  /* ======================================================
     SAVE PROFILE
  ====================================================== */

  async function handleSave() {

    setSaving(true);

    setError("");

    setMessage("");


    try {

      /* -----------------------------------------------
         Save profile text data
      ------------------------------------------------ */

      await updateUser({
        name:
          formData.name,

        username:
          formData.username,

        phone:
          formData.phone,

        bio:
          formData.bio,
      });


      /* -----------------------------------------------
         IMAGE NOTE

         selectedImage is currently only a preview.

         Permanent upload needs:
         POST /api/auth/profile-picture
      ------------------------------------------------ */

      if (selectedImage) {

        console.log(
          "Selected image:",
          selectedImage
        );

      }


      setMessage(
        "Profile updated successfully."
      );


    } catch (err) {

      setError(
        err.message ||
        "Failed to update profile."
      );

    } finally {

      setSaving(false);

    }

  }


  /* ======================================================
     CANCEL
  ====================================================== */

  function handleCancel() {

    if (!user) {
      return;
    }


    setFormData({
      name:
        user.name || "",

      username:
        user.username || "",

      phone:
        user.phone || "",

      bio:
        user.bio || "",
    });


    setImagePreview(
      user.profilePicture || null
    );


    setSelectedImage(null);

    setMessage("");

    setError("");

  }


  /* ======================================================
     INITIAL
  ====================================================== */

  const initial = (
    user?.name?.charAt(0) ||
    "U"
  ).toUpperCase();


  return (
    <>

      {/* ==================================================
          PROFILE PHOTO
      ================================================== */}

      <section className="clb-settings__card">

        <h2>
          Profile Photo
        </h2>


        <div className="clb-settings__avatar-row">


          {/* --------------------------------------------
              AVATAR
          --------------------------------------------- */}

          <div className="clb-settings__avatar">

            {imagePreview ? (

              <img
                src={imagePreview}
                alt="Profile"
                className="clb-settings__avatar-image"
              />

            ) : (

              initial

            )}

          </div>


          {/* --------------------------------------------
              ACTIONS
          --------------------------------------------- */}

          <div className="clb-settings__avatar-actions">

            <button
              type="button"
              className="clb-btn clb-btn--primary"
              onClick={handleUploadClick}
            >
              Change Photo
            </button>


            <button
              type="button"
              className="clb-btn clb-btn--ghost"
              onClick={handleRemoveImage}
            >
              Remove
            </button>


            {/* Hidden file input */}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />

          </div>

        </div>


        <p className="clb-settings__card-desc">
          JPG, PNG or WEBP.
          Maximum file size 5MB.
        </p>

      </section>


      {/* ==================================================
          PERSONAL INFORMATION
      ================================================== */}

      <section className="clb-settings__card">

        <h2>
          Personal Information
        </h2>


        <div className="clb-settings__grid">


          {/* NAME */}

          <div className="clb-field">

            <label htmlFor="fullName">
              Full Name
            </label>

            <input
              id="fullName"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
            />

          </div>


          {/* USERNAME */}

          <div className="clb-field">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="username"
            />

          </div>


          {/* EMAIL */}

          <div className="clb-field">

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={user?.email || ""}
              readOnly
            />

          </div>


          {/* PHONE */}

          <div className="clb-field">

            <label htmlFor="phone">
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 00000 00000"
            />

          </div>


          {/* BIO */}

          <div className="clb-field clb-field--full">

            <label htmlFor="bio">
              Bio
            </label>

            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell brands a little about yourself..."
              maxLength={500}
            />

          </div>


        </div>

      </section>


      {/* ==================================================
          STATUS MESSAGE
      ================================================== */}

      {message && (

        <p className="clb-settings__success">
          {message}
        </p>

      )}


      {error && (

        <p className="clb-settings__error">
          {error}
        </p>

      )}


      {/* ==================================================
          ACTIONS
      ================================================== */}

      <div className="clb-settings__actions">

        <button
          type="button"
          className="clb-btn clb-btn--ghost"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>


        <button
          type="button"
          className="clb-btn clb-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>

      </div>

    </>
  );

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsTab() {

  const [prefs, setPrefs] =
    useState({
      newEmails: true,
      brandReplies: true,
      deadlineReminders: true,
      weeklyDigest: false,
      marketing: false,
    });


  function toggle(key) {

    setPrefs((previous) => ({
      ...previous,

      [key]:
        !previous[key],
    }));

  }


  return (
    <>

      <section className="clb-settings__card">

        <h2>
          Email Notifications
        </h2>


        <p className="clb-settings__card-desc">
          Choose what you want to be
          notified about via email.
        </p>


        <div className="clb-settings__toggle-list">

          <ToggleRow
            title="New Emails"
            desc="Get notified when a brand emails you"
            checked={prefs.newEmails}
            onChange={() =>
              toggle("newEmails")
            }
          />


          <ToggleRow
            title="Brand Replies"
            desc="Get notified when a brand replies"
            checked={prefs.brandReplies}
            onChange={() =>
              toggle("brandReplies")
            }
          />


          <ToggleRow
            title="Deadline Reminders"
            desc="Reminders for upcoming deadlines"
            checked={prefs.deadlineReminders}
            onChange={() =>
              toggle("deadlineReminders")
            }
          />


          <ToggleRow
            title="Weekly Digest"
            desc="Weekly summary of your activity"
            checked={prefs.weeklyDigest}
            onChange={() =>
              toggle("weeklyDigest")
            }
          />


          <ToggleRow
            title="Product Updates"
            desc="News about new Collabry features"
            checked={prefs.marketing}
            onChange={() =>
              toggle("marketing")
            }
          />

        </div>

      </section>


      <div className="clb-settings__actions">

        <button
          type="button"
          className="clb-btn clb-btn--primary"
        >
          Save Preferences
        </button>

      </div>

    </>
  );

}


/* =========================================================
   TOGGLE ROW
========================================================= */

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}) {

  return (
    <div className="clb-settings__toggle-row">

      <div className="clb-settings__toggle-text">

        <strong>
          {title}
        </strong>

        <span>
          {desc}
        </span>

      </div>


      <label className="clb-toggle">

        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
        />

        <span className="clb-toggle__track" />

      </label>

    </div>
  );

}


/* =========================================================
   SECURITY
========================================================= */

function SecurityTab() {

  const { user } =
    useAuth();


  return (
    <>

      <section className="clb-settings__card">

        <h2>
          Google Authentication
        </h2>

        <p className="clb-settings__card-desc">
          Your account is secured using
          Google Sign-In.
        </p>

      </section>


      <section className="clb-settings__card">

        <h2>
          Connected Account
        </h2>


        <div className="clb-settings__toggle-row">

          <div className="clb-settings__toggle-text">

            <strong>
              Gmail
            </strong>

            <span>
              {user?.email || "No email"}
              {" — Connected"}
            </span>

          </div>

        </div>

      </section>


      <section className="clb-settings__card clb-settings__card--danger">

        <h2>
          Danger Zone
        </h2>


        <div className="clb-settings__danger-row">

          <div className="clb-settings__toggle-text">

            <strong>
              Delete Account
            </strong>

            <span>
              Permanently delete your account
              and all data.
            </span>

          </div>


          <button
            type="button"
            className="clb-btn clb-btn--danger"
          >
            Delete Account
          </button>

        </div>

      </section>

    </>
  );

}


export default Settings;