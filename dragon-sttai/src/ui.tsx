import type { ReactNode } from "react";

export function btn(label: string, onClick: () => void, hot = false) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "13px 0",
        background: hot ? "#dc2626" : "#000",
        color: "#fff",
        border: "1px solid #222",
        fontSize: 13,
        fontFamily: "monospace",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function card(children: ReactNode) {
  return <div style={{ border: "1px solid #222", padding: 12, margin: "8px 0" }}>{children}</div>;
}

export function input(props: any) {
  return (
    <input
      {...props}
      style={{ background: "#000", color: "#fff", border: "1px solid #333", padding: 10, width: "100%", fontFamily: "monospace", outline: "none", ...props.style }}
    />
  );
}

export function sheet(children: ReactNode, onClose: () => void) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", background: "#000", borderTop: "2px solid #dc2626", padding: 16 }}
      >
        {children}
      </div>
    </div>
  );
}
