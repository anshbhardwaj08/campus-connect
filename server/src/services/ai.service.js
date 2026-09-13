const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Suggests a fair market price for a listing based on title, category and condition.
 * Returns a number (in INR) or null if the AI call fails.
 */
const suggestPrice = async (title, category, condition) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a pricing assistant for a college student marketplace in India. ' +
            'Reply with ONLY a number in INR representing a fair resale price, no text.',
        },
        {
          role: 'user',
          content: `Title: ${title}\nCategory: ${category}\nCondition: ${condition}`,
        },
      ],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const price = parseFloat(text?.replace(/[^0-9.]/g, ''));
    return Number.isFinite(price) ? price : null;
  } catch (error) {
    console.error('AI suggestPrice failed:', error.message);
    return null;
  }
};

/**
 * Returns a 0-100 scam likelihood score using AI analysis of the listing content.
 */
const getScamScore = async (title, description, price) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You assess scam risk for college marketplace listings. ' +
            'Reply with ONLY an integer 0-100 (100 = highly likely a scam), no text.',
        },
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description}\nPrice: ${price}`,
        },
      ],
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const score = parseInt(text?.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(score) ? Math.min(Math.max(score, 0), 100) : 0;
  } catch (error) {
    console.error('AI getScamScore failed:', error.message);
    return 0;
  }
};

module.exports = { suggestPrice, getScamScore };
