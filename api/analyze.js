// Vercel serverless function: POST /api/analyze  { text: string }
// Keeps the OpenAI key on the server — never expose it in frontend code.

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing OPENAI_API_KEY" });
    return;
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
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

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      res.status(502).json({ error: "OpenAI request failed", detail: errBody });
      return;
    }

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    res.status(200).json({
      emotion: parsed.emotion || "neutral",
      intensity: parsed.intensity || 3,
      message: parsed.message || "Thank you for checking in with yourself today.",
    });
  } catch (err) {
    res.status(500).json({ error: "Analysis failed", detail: String(err) });
  }
}
