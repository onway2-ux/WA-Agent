const { OpenAI } = require('openai');

/**
 * Call DeepSeek AI via OpenAI SDK with custom baseURL
 * @param {string} userMessage 
 * @param {string} businessContext 
 * @returns {Promise<string>}
 */
async function askAI(userMessage, businessContext) {
  // INITIALIZE CLIENT
  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL,
  });

  // STEP 1 — Build system prompt
  const systemPrompt = "You are a helpful WhatsApp business assistant. Business Info: " + businessContext + " Keep responses short and WhatsApp-friendly. Do not use markdown formatting.";

  try {
    // STEP 2 — Make API call
    const response = await openai.chat.completions.create({
      model: "deepseek-r1-0528",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 500,
    });

    // STEP 3 — Log raw response BEFORE any parsing
    console.log("=== RAW AI RESPONSE START ===");
    console.log(JSON.stringify(response, null, 2));
    console.log("=== RAW AI RESPONSE END ===");

    // STEP 4 — Parse response with ALL possible formats
    let aiReply = null;

    if (response?.choices?.[0]?.message?.content) {
      aiReply = response.choices[0].message.content;
      console.log("Parsed via: choices[0].message.content");
    } 
    else if (response?.choices?.[0]?.text) {
      aiReply = response.choices[0].text;
      console.log("Parsed via: choices[0].text");
    } 
    else if (response?.content?.[0]?.text) {
      aiReply = response.content[0].text;
      console.log("Parsed via: content[0].text");
    } 
    else if (response?.message?.content) {
      aiReply = response.message.content;
      console.log("Parsed via: message.content");
    } 
    else if (response?.text) {
      aiReply = response.text;
      console.log("Parsed via: response.text");
    } 
    else if (typeof response === 'string') {
      aiReply = response;
      console.log("Parsed via: direct string");
    } 
    else {
      console.error("UNKNOWN FORMAT — could not parse response");
      console.error("Full response:", JSON.stringify(response));
      aiReply = null;
    }

    // STEP 5 — Return result
    if (!aiReply) {
      return "Sorry, I could not process your request right now.";
    }
    console.log("Final AI Reply:", aiReply);
    return aiReply;

  } catch (error) {
    // STEP 6 — Catch block must log full error details
    console.error("AI Error message:", error.message);
    console.error("AI Error status:", error?.status);
    console.error("AI Error response data:", JSON.stringify(error?.response?.data));
    console.error("AI Error stack:", error.stack);
    return "Sorry, I could not process your request right now.";
  }
}

module.exports = {
  askAI
};
