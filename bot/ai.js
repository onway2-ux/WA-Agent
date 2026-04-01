const { OpenAI } = require('openai');

/**
 * Call DeepSeek AI via OpenAI SDK with custom baseURL
 * @param {string} userMessage 
 * @param {object} context { businessInfo, services, aiPersonality }
 * @returns {Promise<string>}
 */
async function askAI(userMessage, context) {
  const { businessInfo, services, aiPersonality } = context;

  console.log("AI Request starting...");
  console.log("Calling AI with baseURL:", process.env.DEEPSEEK_BASE_URL);
  console.log("API Key exists:", !!process.env.DEEPSEEK_API_KEY);
  console.log("Using model: deepseek-r1-0528");

  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL,
  });

  const systemPrompt = `
    You are a helpful WhatsApp business assistant.
    Business context: ${businessInfo}
    Available services: ${JSON.stringify(services)}
    AI personality/tone: ${aiPersonality}
    
    Instructions:
    - Keep responses short, friendly, and WhatsApp-appropriate.
    - Do NOT use markdown formatting (like bold, italics, etc.) in replies.
    - If asked something outside business scope, politely redirect the user.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-r1-0528",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log("Raw API Response:", JSON.stringify(response));

    let aiReply = null;

    // Try standard OpenAI format 
    if (response?.choices?.[0]?.message?.content) { 
      aiReply = response.choices[0].message.content; 
    } 
    // Try direct content format 
    else if (response?.content?.[0]?.text) { 
      aiReply = response.content[0].text; 
    } 
    // Try direct text format 
    else if (response?.text) { 
      aiReply = response.text; 
    } 
    // Try message format 
    else if (response?.message?.content) { 
      aiReply = response.message.content; 
    } 
    else { 
      console.error("Unknown response format:", JSON.stringify(response));
      aiReply = null; 
    } 

    if (!aiReply) { 
      return "Sorry, I could not process your request."; 
    } 

    return aiReply.trim();
  } catch (error) {
    console.error("AI Error full details:", error);
    console.error("AI Error message:", error.message);
    console.error("AI Error status:", error.status);
    console.error("AI Error response:", error.response?.data);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

module.exports = {
  askAI
};
