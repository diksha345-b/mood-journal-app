// Vercel serverless function: POST /api/analyze  { text: string }
// Keeps the API key on the server — never expose it in frontend code.

function getFallbackAnalysis(text) {
  const normalized = (text || "").toLowerCase();
  let emotion = "neutral";
  let intensity = 3;

  if (/(sad|down|upset|hurt|lonely|cry|empty|depressed)/.test(normalized)) {
    emotion = "sad";
    intensity = 4;
  } else if (/(anxious|worried|nervous|stress|panic|afraid)/.test(normalized)) {
    emotion = "anxious";
    intensity = 4;
  } else if (/(angry|annoyed|frustrated|mad|rage)/.test(normalized)) {
    emotion = "angry";
    intensity = 4;
  } else if (/(tired|exhausted|drained|sleepy|burnt out)/.test(normalized)) {
    emotion = "tired";
    intensity = 3;
  } else if (/(happy|joy|excited|glad|love|hopeful|great)/.test(normalized)) {
    emotion = "joyful";
    intensity = 3;
  } else if (/(calm|peaceful|steady|relieved|okay|fine)/.test(normalized)) {
    emotion = "calm";
    intensity = 2;
  }

  if (/!/.test(text || "")) intensity = Math.min(5, intensity + 1);
  if ((text || "").trim().split(/\s+/).length > 12) intensity = Math.min(5, intensity + 1);

  return {
    emotion,
    intensity,
    message: "Thank you for checking in with yourself today.",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing 'text' in request body" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const fallback = getFallbackAnalysis(text);
    res.status(200).json(fallback);
    return;
  }

  try {
    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mood-journal-app-sxaq.vercel.app",
        "X-Title": "Mood Journal",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an emotion-detection engine for a student mood journal. " +
              "Given a journal entry, respond with ONLY raw JSON in this exact shape: " +
              '{"emotion":"joyful|calm|neutral|sad|anxious|angry|tired","intensity":1-5,' +
              '"message":"one short warm second-person motivational sentence, under 22 words, never clinical or preachy"}',
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!openrouterRes.ok) {
      const errBody = await openrouterRes.text();
      const fallback = getFallbackAnalysis(text);
      res.status(200).json(fallback);
      return;
    }

    const data = await openrouterRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    res.status(200).json({
      emotion: parsed.emotion || "neutral",
      intensity: parsed.intensity || 3,
      message: parsed.message || "Thank you for checking in with yourself today.",
    });
  } catch (err) {
    const fallback = getFallbackAnalysis(text);
    res.status(200).json(fallback);
  }
}
