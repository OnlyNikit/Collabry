import { useState } from "react";
import { Download } from "lucide-react";

import { useInstallPrompt } from "../../hooks/useInstallPrompt";

import "./InstallButton.css";

/**
 * Install / Download app button.
 *
 * - Browser install offer kare (Chrome, Edge, Android) -> asli install prompt
 * - Offer na mile (iPhone, Firefox, dev server)       -> click pe manual steps
 * - App install ho chuka ho                           -> button dikhta hi nahi
 */
function InstallButton({
  className = "",
  children = "Download app",
  onInstalled,
}) {
  const { canInstall, showManualHint, isIos, install } = useInstallPrompt();

  const [isHintOpen, setIsHintOpen] = useState(false);

  if (!canInstall && !showManualHint) {
    return null;
  }

  async function handleClick() {
    if (canInstall) {
      const outcome = await install();

      if (outcome === "accepted") {
        onInstalled?.();
      }

      return;
    }

    setIsHintOpen((open) => !open);
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        <span className="clb-install__icon" aria-hidden="true">
          <Download size={18} />
        </span>

        <span>{children}</span>
      </button>

      {isHintOpen && (
        <p className="clb-install__hint" role="status">
          {isIos ? (
            <>
              iPhone par: <b>Share</b> dabao, phir <b>Add to Home Screen</b>.
            </>
          ) : (
            <>
              Chrome ya Edge me address bar ke install icon par click karo, ya
              menu (⋮) me <b>Install Collabry</b> chuno.
            </>
          )}
        </p>
      )}
    </>
  );
}

export default InstallButton;
