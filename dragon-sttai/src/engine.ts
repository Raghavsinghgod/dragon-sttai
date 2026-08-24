let rec: MediaRecorder;
let chunks: Blob[] = [];

export async function record(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  rec = new MediaRecorder(stream);
  chunks = [];
  rec.ondataavailable = e => {
    chunks.push(e.data);
  };
  rec.start();
}

export function stop(): Promise<Blob> {
  return new Promise(res => {
    rec.onstop = () => {
      for (const t of rec.stream.getTracks()) t.stop();
      res(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
    rec.stop();
  });
}

function b64(blob: Blob): Promise<string> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
  });
}

export async function ask(key: string, parts: any[]): Promise<string> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key, {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no reply)";
}

export async function run(key: string): Promise<[string, string]> {
  const blob = await stop();
  const audio = await b64(blob);
  const text = await ask(key, [
    { inline_data: { mime_type: blob.type, data: audio } },
    { text: "transcribe this audio. reply with the transcript only." },
  ]);
  const reply = await ask(key, [{ text: "the user said this. respond briefly. " + text }]);
  return [text, reply];
}
