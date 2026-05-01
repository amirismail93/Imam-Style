exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured on server." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  const { voiceId, text, stability, similarity_boost, style } = body;

  if (!voiceId || !text) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing voiceId or text." }) };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarity_boost ?? 0.75,
            style: style ?? 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      let errMsg = `ElevenLabs error: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData?.detail?.message || errMsg;
      } catch (_) {}
      return { statusCode: response.status, body: JSON.stringify({ error: errMsg }) };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64Audio }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
