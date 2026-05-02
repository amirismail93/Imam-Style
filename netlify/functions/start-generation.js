exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.REPLICATE_API_KEY;
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

  const { text, voicePreset, maqamStyle } = body;

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing text." }) };
  }

  const styleHints = {
    hijaz: "[slow, powerful, commanding, majestic Islamic adhan chanting, maqam hijaz]",
    bayati: "[warm, smooth, flowing, soulful Islamic recitation, maqam bayati]",
    saba: "[deeply moving, sorrowful, spiritual, yearning Islamic chanting, maqam saba]",
    rast: "[balanced, clear, grounded, measured Islamic recitation, maqam rast]",
  };

  const hint = styleHints[maqamStyle] || styleHints.hijaz;
  const formattedText = `♪ ${hint} ${text} ♪`;

  try {
    const response = await fetch(
      "https://api.replicate.com/v1/models/suno-ai/bark/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text_prompt: formattedText,
            history_prompt: voicePreset || "v2/en_speaker_6",
            text_temp: 0.7,
            waveform_temp: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      let errMsg = `Replicate error: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData?.detail || errMsg;
      } catch (_) {}
      return { statusCode: response.status, body: JSON.stringify({ error: errMsg }) };
    }

    const prediction = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: prediction.id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
