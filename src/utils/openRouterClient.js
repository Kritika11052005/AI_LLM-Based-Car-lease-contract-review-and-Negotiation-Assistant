
/**
 * OpenRouter API Client (Placeholder)
 * 
 * This file is prepared for OpenRouter integration but is currently 
 * inactive in favor of local Ollama inference.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const analyzeWithOpenRouter = async (text) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API Key is missing.');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin, // Required by OpenRouter
        },
        body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI assistant that extracts key car lease details (APR, Monthly Payment, Term, etc.) from contract text and returns them as a JSON object.'
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
};
