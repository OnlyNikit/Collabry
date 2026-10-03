import { useActingAs } from "../../context/ActingAsContext";

/*
  DashboardLayout / MainLayout me sabse upar render karo:
  <ActingAsBanner />
*/
export default function ActingAsBanner() {
  const { actingAs, stopActingAs } = useActingAs();

  if (!actingAs) return null;

  return (
    <div
      className="clb-acting-banner"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 16px",
        background: "#fff7e0",
        borderBottom: "1px solid #f0d78c",
        color: "#5c4300",
        fontSize: 14,
      }}
    >
      <span>
        Viewing mailbox of{" "}
        <strong>{actingAs.name || actingAs.email || "owner"}</strong>
        {actingAs.name && actingAs.email ? ` (${actingAs.email})` : ""}
      </span>

      <button
        type="button"
        onClick={stopActingAs}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          border: "1px solid #c9a227",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Exit
      </button>
    </div>
  );
}