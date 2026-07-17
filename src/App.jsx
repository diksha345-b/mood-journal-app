import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from "recharts";

const STORAGE_KEY = "mindsphere_mood_entries";

const EMOTIONS = {
  joyful: { color: "#C9A227", label: "Joyful" },
  calm: { color: "#4A6C6F", label: "Calm" },
  neutral: { color: "#8B8378", label: "Neutral" },
  sad: { color: "#5B6B8C", label: "Sad" },
  anxious: { color: "#C97B84", label: "Anxious" },
  angry: { color: "#A6432F", label: "Angry" },
  tired: { color: "#7C6A8E", label: "Tired" },
};

const QUICK_TIPS = [
  "Name the feeling before trying to fix it.",
  "A short check-in can be more helpful than a long one.",
  "Notice what changed in your energy today.",
];

const emotionKey = (raw) => {
  const k = (raw || "neutral").toLowerCase().trim();
  return EMOTIONS[k] ? k : "neutral";
};

function MoodSquiggle({ color, intensity = 3 }) {
  const amp = 3 + intensity * 2;
  const d = `M0,10 Q10,${10 - amp} 20,10 T40,10 T60,10 T80,10`;
  return (
    <svg width="80" height="20" viewBox="0 0 80 20" style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function analyzeMood(text) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("analysis failed");
  const parsed = await res.json();
  return {
    emotion: emotionKey(parsed.emotion),
    intensity: Math.min(5, Math.max(1, Number(parsed.intensity) || 3)),
    message: parsed.message || "Thank you for checking in with yourself today.",
  };
}

function getMoodInsight(entries) {
  if (!entries.length) {
    return {
      title: "Start your first check-in",
      text: "A few honest lines can help you notice patterns and feel more grounded.",
    };
  }

  const latest = entries[entries.length - 1];
  const latestMeta = EMOTIONS[latest.emotion];
  const averageIntensity = Math.round(
    (entries.reduce((sum, entry) => sum + entry.intensity, 0) / entries.length) * 10
  ) / 10;

  return {
    title: `${latestMeta.label} • latest reflection`,
    text: `You’ve logged ${entries.length} entries with an average intensity of ${averageIntensity}. Keep going — your timeline is already telling a story.`,
  };
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const submitEntry = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeMood(draft.trim());
      const entry = { id: `${Date.now()}`, ts: Date.now(), text: draft.trim(), ...analysis };
      const next = [...entries, entry];
      setEntries(next);
      saveEntries(next);
      setDraft("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError("Couldn't reach the AI just now — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = entries.map((e) => ({
    date: new Date(e.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    intensity: e.emotion === "sad" || e.emotion === "angry" || e.emotion === "anxious"
      ? -e.intensity
      : e.emotion === "tired"
      ? -1
      : e.intensity,
    color: EMOTIONS[e.emotion].color,
    label: EMOTIONS[e.emotion].label,
  }));

  const insight = getMoodInsight(entries);

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "linear-gradient(135deg, #fdf8f0 0%, #f4ece1 100%)",
        color: "#2B2620",
        minHeight: "100vh",
        padding: "32px 20px 48px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .mj-textarea:focus, .mj-btn:focus-visible { outline: 2px solid #4A6C6F; outline-offset: 2px; }
        .mj-btn { transition: transform .15s ease, background .15s ease, box-shadow .15s ease; }
        .mj-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(74, 108, 111, 0.16); }
        .mj-entry { animation: mjIn .35s ease both; }
        @keyframes mjIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .mj-entry { animation: none; } .mj-btn:hover { transform: none; } }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr",
            gap: 20,
            marginBottom: 24,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.8)",
              border: "1px solid #E9E2D6",
              borderRadius: 24,
              padding: "24px 24px 28px",
              boxShadow: "0 10px 30px rgba(43,38,32,0.05)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.16em", color: "#8B8378", textTransform: "uppercase" }}>
              MindSphere • Mood Journal
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 36, margin: "8px 0 10px", lineHeight: 1.12 }}>
              Make space for how you feel.
            </h1>
            <p style={{ color: "#6D655B", fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 540 }}>
              Write a few honest lines, let the AI reflect back your mood, and build a gentle record of how you’ve been carrying yourself.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {['Gentle reflection', 'Simple insights', 'Calm timeline'].map((item) => (
                <span key={item} style={{ background: "#F4EBDD", borderRadius: 999, padding: "7px 10px", fontSize: 12, color: "#5A534A", fontWeight: 600 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(145deg, #4A6C6F 0%, #335A5D 100%)",
              borderRadius: 24,
              padding: 22,
              color: "#fff",
              boxShadow: "0 14px 30px rgba(74, 108, 111, 0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.9 }}>
                Today’s reflection
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "8px 0 6px" }}>{insight.title}</h2>
              <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.95 }}>{insight.text}</p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, opacity: 0.9 }}>
              {entries.length > 0 ? `${entries.length} mood check-ins saved` : "Your first entry starts the story"}
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #E9E2D6", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(43,38,32,0.04)" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#5F5748", marginBottom: 8 }}>
              Write your check-in
            </label>
            <textarea
              className="mj-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Today felt..."
              rows={5}
              style={{
                width: "100%",
                border: "1px solid #EDE4D8",
                borderRadius: 12,
                resize: "vertical",
                fontFamily: "'Fraunces', serif",
                fontSize: 16,
                lineHeight: 1.5,
                color: "#2B2620",
                background: "#FCF9F4",
                padding: "12px 14px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#B5AC9C" }}>
                {draft.length} characters
              </span>
              <button
                className="mj-btn"
                onClick={submitEntry}
                disabled={loading || !draft.trim()}
                style={{
                  background: loading || !draft.trim() ? "#D9D2C4" : "#4A6C6F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading || !draft.trim() ? "default" : "pointer",
                }}
              >
                {loading ? "Reading..." : "Save entry"}
              </button>
            </div>
            {error && <div style={{ color: "#A6432F", fontSize: 13, marginTop: 10 }}>{error}</div>}
          </div>

          <div style={{ background: "#fff", border: "1px solid #E9E2D6", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(43,38,32,0.04)" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 10px" }}>Helpful prompts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUICK_TIPS.map((tip) => (
                <div key={tip} style={{ background: "#F8F2E8", borderRadius: 12, padding: "10px 12px", color: "#5D564E", fontSize: 14, lineHeight: 1.45 }}>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {entries.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>
              Mood trend
            </h2>
            <div style={{ background: "#fff", border: "1px solid #E9E2D6", borderRadius: 18, padding: "16px 8px 4px", boxShadow: "0 8px 24px rgba(43,38,32,0.04)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#F0EAE0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8B8378" }} axisLine={{ stroke: "#E9E2D6" }} tickLine={false} />
                  <YAxis hide domain={[-5, 5]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #E9E2D6", fontSize: 12, fontFamily: "'Inter', sans-serif" }}
                    formatter={(value, name, payload) => [payload.label, "mood"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="intensity"
                    stroke="#4A6C6F"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload, key } = props;
                      return <Dot key={key} cx={cx} cy={cy} r={4.5} fill={payload.color} stroke="#fff" strokeWidth={1.2} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <section>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>
            Recent entries
          </h2>
          {entries.length === 0 ? (
            <div style={{ color: "#7B7369", fontSize: 14, background: "#fff", border: "1px solid #E9E2D6", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(43,38,32,0.04)" }}>
              Nothing here yet. Your first entry will start the story.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...entries].reverse().map((e) => {
                const meta = EMOTIONS[e.emotion];
                return (
                  <div
                    key={e.id}
                    className="mj-entry"
                    style={{
                      background: "#fff",
                      border: "1px solid #E9E2D6",
                      borderLeft: `4px solid ${meta.color}`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      boxShadow: "0 8px 24px rgba(43,38,32,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8B8378" }}>
                            {new Date(e.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {meta.label}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.6 }}>{e.text}</p>
                        <p style={{ margin: 0, fontSize: 13.5, color: "#5F5748", fontStyle: "italic" }}>{e.message}</p>
                      </div>
                      <MoodSquiggle color={meta.color} intensity={e.intensity} />
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
