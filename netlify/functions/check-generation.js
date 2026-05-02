exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured on server." }),
    };
  }

  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing prediction id." }) };
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });

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
      body: JSON.stringify({
        status: prediction.status,
        audioUrl: prediction.output,
        error: prediction.error,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
