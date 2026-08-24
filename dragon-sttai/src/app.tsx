import { useEffect, useState } from "react";
import { ask, record, run } from "./engine";
import { clear, get, set } from "./db";
import { btn, card, input, sheet } from "./ui";

type msg = { me: boolean; text: string };
type recItem = { text: string; at: number };

export function App() {
  const [view, setView] = useState<"chat" | "work">("chat");
  const [msgs, setMsgs] = useState<msg[]>(() => get("msgs") ?? []);
  const [recs, setRecs] = useState<recItem[]>(() => get("recs") ?? []);
  const [key, setKey] = useState(() => get("key") ?? "");
  const [name, setName] = useState(() => get("name") ?? "");
  const [draft, setDraft] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => set("msgs", msgs), [msgs]);
  useEffect(() => set("recs", recs), [recs]);
  useEffect(() => set("key", key), [key]);
  useEffect(() => set("name", name), [name]);

  async function talk() {
    if (busy) return;
    if (recording) {
      setRecording(false);
      setBusy(true);
      const [text, reply] = await run(key);
      setMsgs(m => [...m, { me: true, text }, { me: false, text: reply }]);
      setRecs(r => [{ text, at: Date.now() }, ...r]);
      setBusy(false);
    } else {
      await record();
      setRecording(true);
    }
  }

  async function send() {
    const t = draft.trim();
    if (!t || busy || !key) return;
    setDraft("");
    setMsgs(m => [...m, { me: true, text: t }]);
    setBusy(true);
    const reply = await ask(key, [{ text: t }]);
    setMsgs(m => [...m, { me: false, text: reply }]);
    setBusy(false);
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#000", color: "#fff", fontFamily: "monospace" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <b>dragon stt ai</b>
        <span style={{ color: "#666", fontSize: 12 }}>{name || "local only"}</span>
      </div>

      {view === "chat" ? (
        !key ? (
          <div style={{ padding: 16 }}>
            {card(
              <div>
                <p style={{ marginTop: 0 }}>paste a gemini api key to start</p>
                {input({ value: keyDraft, onChange: (e: any) => setKeyDraft(e.target.value), placeholder: "api key" })}
                <div style={{ marginTop: 8 }}>
                  {btn("save", () => setKey(keyDraft.trim()))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {msgs.length === 0 ? <p style={{ color: "#666" }}>hit talk, speak, hit again. or type below.</p> : null}
            {msgs.map((m, i) => (
              <div key={i} style={{ textAlign: m.me ? "right" : "left", margin: "8px 0" }}>
                <span style={{ background: m.me ? "#dc2626" : "#111", padding: "8px 12px", display: "inline-block", maxWidth: "85%", whiteSpace: "pre-wrap", textAlign: "left" }}>{m.text}</span>
              </div>
            ))}
            {busy ? <p style={{ color: "#dc2626" }}>thinking...</p> : null}
          </div>
        )
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {recs.length === 0 ? <p style={{ color: "#666" }}>no transcripts yet.</p> : null}
          {recs.map((r, i) => card(<div key={i}><p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.text}</p><p style={{ color: "#666", fontSize: 12, marginBottom: 0 }}>{new Date(r.at).toLocaleString()}</p></div>))}
        </div>
      )}

      {view === "chat" && key ? (
        <button
          onClick={talk}
          disabled={busy}
          style={{ margin: 16, padding: 16, background: recording ? "#dc2626" : "#000", color: "#fff", border: "2px solid #dc2626", fontSize: 15, cursor: "pointer", fontFamily: "monospace" }}
        >
          {busy ? "thinking..." : recording ? "stop" : "talk"}
        </button>
      ) : null}

      {view === "chat" && key ? (
        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
          {input({ value: draft, onChange: (e: any) => setDraft(e.target.value), placeholder: "type instead", onKeyDown: (e: any) => { if (e.key === "Enter") send() } })}
          {btn("send", send)}
        </div>
      ) : null}

      <div style={{ display: "flex", borderTop: "1px solid #222" }}>
        {btn("chat", () => setView("chat"), view === "chat")}
        {btn("work", () => setView("work"), view === "work")}
        {btn("you", () => setSheetOpen(true))}
      </div>

      {sheetOpen ? sheet(
        <div>
          <p style={{ marginTop: 0 }}>you</p>
          {input({ value: name, onChange: (e: any) => setName(e.target.value), placeholder: "name" })}
          <div style={{ height: 8 }} />
          {input({ value: key, onChange: (e: any) => setKey(e.target.value), placeholder: "gemini api key" })}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {btn("close", () => setSheetOpen(false))}
            {btn("wipe everything", () => { clear(); setMsgs([]); setRecs([]); setKey(""); setName(""); setSheetOpen(false); }, true)}
          </div>
        </div>,
        () => setSheetOpen(false)
      ) : null}
    </div>
  );
}
