// Bark chants English/romanized text far better than Arabic script.
// Map known Adhan phrases to their transliterations so Bark can actually sing them.
const PHRASE_MAP = {
  "ٱللَّٰهُ أَكْبَرُ": "Allahu Akbar",
  "اللَّٰهُ أَكْبَرُ": "Allahu Akbar",
  "الله أكبر": "Allahu Akbar",
  "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ": "Ash-hadu an laa ilaaha ill-Allah",
  "أشهد أن لا إله إلا الله": "Ash-hadu an laa ilaaha ill-Allah",
  "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ": "Ash-hadu anna Muhammadan rasulullah",
  "أشهد أن محمدا رسول الله": "Ash-hadu anna Muhammadan rasulullah",
  "حَيَّ عَلَى ٱلصَّلَاةِ": "Hayya alas-salaah",
  "حي على الصلاة": "Hayya alas-salaah",
  "حَيَّ عَلَى ٱلْفَلَاحِ": "Hayya alal-falaah",
  "حي على الفلاح": "Hayya alal-falaah",
  "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ": "Laa ilaaha ill-Allah",
  "لا إله إلا الله": "Laa ilaaha ill-Allah",
};

function resolveText(raw) {
  const trimmed = raw.trim();
  if (PHRASE_MAP[trimmed]) return PHRASE_MAP[trimmed];
  // If it looks like Arabic script, warn but pass through — user may have typed transliteration already
  return trimmed;
}

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

  // Accept either `text` (Arabic, auto-mapped) or `roman` (user-supplied transliteration)
  const { text, roman, voicePreset, maqamStyle } = body;
  const raw = roman || text;

  if (!raw) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing text." }) };
  }

  const chantText = roman ? roman.trim() : resolveText(raw);

  const styleHints = {
    hijaz: "slowly, powerfully, with majestic Islamic adhan melody",
    bayati: "warmly, smoothly, with flowing soulful Islamic recitation melody",
    saba: "with deep emotion, longing, spiritual Islamic chanting melody",
    rast: "clearly, balanced, with grounded measured Islamic recitation melody",
  };

  const hint = styleHints[maqamStyle] || styleHints.hijaz;
  // Bark responds best to a clean musical prompt — no brackets, just natural description
  const formattedText = `♪ ${chantText} ♪ [singing ${hint}] ♪ ${chantText} ♪`;

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
            text_temp: 0.6,
            waveform_temp: 0.8,
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
