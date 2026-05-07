# Aanya — Maternal Healthcare AI

A warm, empathetic AI chatbot and health dashboard for expectant mothers.

## Features
- **Empathetic Chatbot**: Powered by Google Gemini 1.5 Flash, providing support and guidance.
- **Health Dashboard**: Track pregnancy progress, baby kicks, weight, blood pressure, heart rate, mood, and symptoms.
- **Smart Data Extraction**: Aanya automatically logs health data from your chat conversations.
- **Personalized Insights**: Pregnancy week and trimester tracking based on your due date or LMP.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui, Recharts.
- **Backend**: Express.js (Node.js) with Vite integration.
- **AI**: Google Gemini API (1.5 Flash).
- **Database**: In-memory storage for demo purposes (no external database required).

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
API_KEY="your_api_key_here"
```

### 2. Installation
```bash
npm install
# or
yarn install
```

### 3. Development
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## Disclaimer
Aanya is an AI assistant and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
