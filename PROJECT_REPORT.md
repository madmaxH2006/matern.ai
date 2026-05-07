# Project Report: Aanya - Maternal Healthcare AI (INT428)

**Student Name:** [Your Name]  
**Roll Number:** [Your Roll Number]  
**Branch & Semester:** [Your Branch/Semester]  
**Project Title:** Aanya - Maternal Healthcare AI  
**Guide/Faculty Name:** [Faculty Name]

---

## Section A: Project Overview

**Q1. Type of Chatbot Developed**
- [x] Generative (LLM-based)
- [ ] Rule-based
- [ ] Retrieval-based
- [ ] Hybrid

*Note: The chatbot uses Google's Gemini 2.5 Flash model specifically tuned via system instructions to provide empathetic and evidence-based maternal health guidance.*

**Q2. Platform Used for Deployment**
- [x] Web Application
- [ ] Mobile Application
- [ ] Desktop Application
- [ ] Messaging Platform
- [ ] Cloud API only

**Q3. Deployment Link / Access Details**
- **Deployment URL:** [Provided in the App Preview]

---

## Section B: Model & API Details

**Q4. Type of API Used**
- [ ] OpenAI API
- [x] Google Gemini API
- [ ] Azure OpenAI API
- [ ] Custom REST API
- [ ] Local Model API

**Q5. Model Name Used**
- **Model Name:** gemini-2.5-flash

**Q6. Model Version**
- **Model Version / Release:** 2.5

---

## Section C: Context & Data Handling

**Q7. Contextual Memory Usage**
- [ ] No memory
- [x] Session-based memory
- [ ] Long-term memory (database/vector store)
- [ ] Hybrid memory approach

*Note: Past interactions (up to 10 messages) are maintained during the session to provide contextual awareness.*

**Q8. Flow of Data in the Chatbot**
1. **User Input:** User types a message in the React frontend.
2. **Backend Request:** The message is sent to the Express server (`/api/chat`).
3. **Prompt Construction:** The server combines the user's profile info (name, due date), chat history, and a specialized "system prompt" (empathy + safety guidelines).
4. **AI Generation:** The request is sent to the Gemini API.
5. **Structured Response:** The Gemini response is saved to the local session database.
6. **Data Extraction:** Simultaneously, the user's message is parsed by the AI to detect health metrics (weight, kicks, mood) which are automatically added to the dashoard logs.
7. **UI Update:** The React app receives the response and refreshes the health charts and chat window.

---

## Section D: Model Configuration & Behavior

**Q9. Model Parameters Used**
- **Temperature:** ~0.7 (Default)
- **Input Token Limit:** ~1M (Gemini 1.5 context window)
- **Output Token Limit:** Restricted via prompt logic to <180 words.

**Q10. Thinking Level & Role Assignment**
- **Thinking Level:** [x] Intermediate (context-aware reasoning)
- **Role Assigned to Model:** [x] Assistant (Maternal Health Companion)

---

## Section E: Technology Stack

**Q11. Technology Stack Used**
- **Frontend:** React 19, Tailwind CSS v4, Lucide Icons, Recharts (Charts), Motion (Animations), Sonner (Toasts).
- **Backend:** Node.js (Runtime), Express (Web Server), Tsx (TypeScript Execution), Dotenv.
- **AI SDK:** @google/genai.
- **Hosting:** Google Cloud Run (Containerized).

---

## Section F: Implementation Evidence

**Q12. API Call Snippet (From `src/server/index.ts`)**
```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: history.slice(-10).map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || "").trim() || "..." }],
  })),
  config: {
    systemInstruction: systemPrompt,
  },
});

replyContent = response.text || "";
```

---

## Q14. GitHub Repository Link
- **Repository URL:** [Your Repository Link]

---

**Declaration:** I confirm that the information provided above is accurate to the best of my knowledge.
**Date:** May 7, 2024
