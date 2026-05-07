import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// --- AI Initialization ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("Google AI Studio API key missing");
}

const ai = new GoogleGenAI({
  apiKey: API_KEY,
});

const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-2.5-flash"
];

let lastRequestTime = 0;
const COOLDOWN_MS = 6000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Resilient Gemini request wrapper with retries and model fallbacks
 */
async function generateGeminiResponse(params: {
  contents: any[],
  systemInstruction?: string,
  timeoutMs?: number
}) {
  const { contents, systemInstruction, timeoutMs = 30000 } = params;
  
  // Cooldown check
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < COOLDOWN_MS) {
    const waitSeconds = Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000);
    throw new Error(`Please wait ${waitSeconds} seconds before sending another message.`);
  }
  
  lastRequestTime = now;
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    let attempts = 0;
    // 503/Timeout: max 1 retry (2 total attempts). 429: 0 retries.
    const maxAttempts = 2; 

    while (attempts < maxAttempts) {
      try {
        console.log(`AI Attempt: Model=${modelName}, Attempt=${attempts + 1}`);
        
        // Manual timeout race since SDK signal support varies
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              maxOutputTokens: 180,
              temperature: 0.7
            },
          }),
          timeoutPromise
        ]) as any;

        return response.text || "";
      } catch (error: any) {
        lastError = error;
        const msg = (error.message || "").toUpperCase();
        
        // 429 handling: No retries
        if (msg.includes("429") || msg.includes("QUOTA")) {
           console.warn(`Rate limit hit (429). Skipping retries.`);
           break; 
        }

        const isRetryable = msg.includes("503") || 
                           msg.includes("OVERLOADED") || 
                           msg.includes("UNAVAILABLE") || 
                           msg.includes("DEMAND") ||
                           msg.includes("TIMEOUT");
        
        if (isRetryable && attempts < maxAttempts - 1) {
          attempts++;
          const waitTime = 2000; // Fixed 2s wait for retry
          console.warn(`Gemini Busy (${msg}). Retrying in ${waitTime}ms...`);
          await sleep(waitTime);
          continue;
        }
        
        // If not a retryable error, or out of attempts for this model, move to next model
        console.warn(`Model ${modelName} failed sequence: ${msg}`);
        break; 
      }
    }
  }

  // Final Error Handling
  const finalMsg = (lastError?.message || "").toUpperCase();
  console.error("All Gemini attempts failed:", lastError?.message);
  
  let userErrorMessage = "AI service temporarily overloaded. Please try again in a moment.";
  
  if (finalMsg.includes("API KEY NOT VALID") || finalMsg.includes("KEY")) {
    userErrorMessage = "Invalid API key. Please check configuration.";
  } else if (finalMsg.includes("QUOTA") || finalMsg.includes("429")) {
    userErrorMessage = "Free-tier Gemini limit reached. Please wait 20 seconds.";
  } else if (finalMsg.includes("503") || finalMsg.includes("OVERLOADED") || finalMsg.includes("UNAVAILABLE")) {
    userErrorMessage = "Gemini servers are busy. Please try again shortly.";
  } else if (finalMsg.includes("TIMEOUT")) {
    userErrorMessage = "Response took too long. Please retry.";
  } else if (finalMsg.includes("NOT FOUND")) {
    userErrorMessage = "Model unavailable (404).";
  }

  throw new Error(userErrorMessage);
}

// --- In-Memory Database (Demo Mode) ---
const USER_ID = "demo-user";
const db = {
  profiles: [] as any[],
  logs: [] as any[],
  messages: [] as any[]
};

// --- API Routes ---
app.get('/api', (req, res) => {
  res.json({ status: 'ok', name: 'Aanya API (AI Powered)' });
});

app.get('/api/profile', async (req, res) => {
  let profile = db.profiles.find(p => p.user_id === USER_ID);
  if (!profile) {
    profile = {
      user_id: USER_ID,
      name: 'Future Mom',
      age: '',
      due_date: '',
      last_period_date: '',
      notes: '',
      created_at: new Date().toISOString()
    };
    db.profiles.push(profile);
  }
  res.json(profile);
});

app.put('/api/profile', async (req, res) => {
  const index = db.profiles.findIndex(p => p.user_id === USER_ID);
  if (index > -1) {
    db.profiles[index] = { ...db.profiles[index], ...req.body };
  }
  res.json({ success: true });
});

app.get('/api/logs', async (req, res) => {
  const { type } = req.query;
  let result = db.logs.filter(l => l.user_id === USER_ID);
  if (type) {
    result = result.filter(l => l.type === type);
  }
  res.json(result);
});

app.post('/api/logs', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const saved = [];
  
  for (const item of items) {
    const { type, data, note } = item;
    const newLog = {
      id: uuidv4(),
      user_id: USER_ID,
      type,
      data: data || {},
      note: note || "Logged",
      timestamp: new Date().toISOString()
    };
    db.logs.push(newLog);
    saved.push(newLog);
  }
  
  res.json(saved.length === 1 ? saved[0] : saved);
});

app.delete('/api/logs/:id', async (req, res) => {
  db.logs = db.logs.filter(l => !(l.id === req.params.id && l.user_id === USER_ID));
  res.json({ success: true });
});

app.get('/api/chat/history', async (req, res) => {
  const history = db.messages.filter(m => m.user_id === USER_ID);
  res.json(history);
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  // 1. Save user message
  const userMsg = {
    id: uuidv4(),
    user_id: USER_ID,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  db.messages.push(userMsg);

  const profile = db.profiles.find(p => p.user_id === USER_ID);
  const history = db.messages.filter(m => m.user_id === USER_ID);

  const systemPrompt = `You are Aanya, an empathetic maternal health AI. 
Acknowledge feelings first. Be concise.
SAFETY: For heavy bleeding, severe pain, decreased movement, or severe headaches, MUST tell user to contact OB-GYN immediately.
User: ${profile?.name || 'Mom'}. Due: ${profile?.due_date || 'Not set'}.`;

  let replyContent = "";
  try {
    // Limit history to last 3 messages to save quota and reduce token usage
    const chatHistory = history.slice(-3).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || "").trim() || "..." }],
    }));

    replyContent = await generateGeminiResponse({
      contents: chatHistory,
      systemInstruction: systemPrompt
    });
  } catch (gError: any) {
    return res.status(500).json({ error: gError.message });
  }

  // 2. Save assistant response
  const assistantMsg = {
    id: uuidv4(),
    user_id: USER_ID,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString()
  };
  db.messages.push(assistantMsg);

  // 3. Extraction logic (Temporarily disabled to save free-tier quota)
  /*
  try {
    const extractorPrompt = `As a medical data extractor, parse the following user message for health logs.
Return ONLY a valid JSON array of objects. 
Supported types: weight (kg), bp (systolic, diastolic), hr (bpm), kicks (count), mood (score 1-5, label), symptom (name).

Example: [{"type":"weight","data":{"kg":64}}]

User message: "${message}"`;

    const extractionText = await generateGeminiResponse({
      contents: [{ role: 'user', parts: [{ text: extractorPrompt }] }]
    });
    const match = extractionText.match(/\[.*\]/s);
    if (match) {
      const extracted = JSON.parse(match[0]);
      for (const item of extracted) {
        db.logs.push({
          id: uuidv4(),
          user_id: USER_ID,
          type: item.type,
          data: item.data,
          timestamp: new Date().toISOString(),
          note: `Auto-logged from chat`
        });
      }
    }
  } catch (e) {
    console.error("Extraction error", e);
  }
  */

  res.json({
    reply: replyContent,
    message: assistantMsg
  });
});

app.delete('/api/chat/history', async (req, res) => {
  db.messages = db.messages.filter(m => m.user_id !== USER_ID);
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

