# 📚 StudyMind AI

AI-powered study assistant using **OpenRouter** (any LLM), a **RAG pipeline**, **MongoDB**, **Firebase Auth**, **React.js**, and **Node.js/Express**.

Upload a PDF or paste notes and StudyMind turns them into summaries, mind maps, flashcards, quizzes and a personal AI tutor that answers from *your* material.

---

## ✨ Features

| | |
|---|---|
| 📊 **Overview dashboard** | Study streak, 14-day activity heatmap, flashcard mastery ring, quiz average, recent notes & quizzes |
| 📄 **Upload** | Drag & drop PDF / TXT / Markdown (up to 15 MB) with upload progress, or paste text |
| ✨ **Study tools** (live-streamed Markdown) | Summary · Key concepts · Explain simply (ELI5) · Mind map · 5-day study plan · Memory hooks / mnemonics — with copy, download `.md`, read-aloud and regenerate |
| 💬 **Chat with your notes** | RAG-grounded answers, persistent chat history per note, AI-suggested starter questions, stop generation, copy & ask-again |
| 🃏 **Flashcards** | Choose count & difficulty, 3D flip cards, shuffle, "unlearned only" filter, progress tracking, keyboard shortcuts, **export to Anki** |
| ❓ **Quizzes** | Choose count & difficulty, timer, keyboard answering (1–4), instant explanations, full review screen, saved score history, confetti 🎉 |
| ⏱️ **Pomodoro focus timer** | 25/5 focus timer in the header with chime + desktop notification |
| ⌘ **Command palette** | `⌘K` / `Ctrl+K` to jump to any note, view or action |
| 🗂️ **Note library** | Search, inline rename, delete (cascades chats/cards/quizzes) |
| 🔐 **Sign in** | Google, or email + 6-digit one-time code (no password). Same email = same account |
| 🏠 **Landing page** | Editorial landing page with a live interactive demo, scroll animations and FAQ |
| 🌗 **Light / dark mode** | Follows your OS until you pick one; fully responsive down to phone size |

---

## Project Structure

```
StudyMind-AI/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── firebase.js           # Firebase Admin SDK
├── middleware/
│   └── auth.js               # Firebase ID-token verification
├── models/
│   ├── User.js               # + activity days (streaks)
│   ├── Note.js               # Chunked documents
│   ├── Session.js            # Chat history
│   ├── Flashcard.js
│   ├── QuizAttempt.js        # Quiz score history
│   └── OtpCode.js            # Hashed, expiring sign-in codes
├── routes/
│   ├── auth.js               # /api/auth
│   ├── otp.js                # /api/auth/otp — email one-time-code sign-in
│   ├── notes.js              # /api/notes — upload / index / rename / delete
│   ├── generate.js           # /api/generate — study modes, flashcards, MCQ
│   ├── chat.js               # /api/chat — RAG chat with session memory
│   └── stats.js              # /api/stats — dashboard stats
├── utils/
│   ├── llm.js                # OpenRouter client (text, stream, JSON)
│   ├── chunker.js            # Chunking + TF-IDF retrieval + spread sampling
│   ├── sse.js                # Server-Sent Events helpers (abort on disconnect)
│   ├── activity.js           # Study streak tracking
│   ├── mailer.js             # SMTP email (sign-in codes)
│   └── validate.js           # Input validation helpers
├── server.js
├── .env.example
└── frontend/                 # React 18 (Create React App)
    └── src/
        ├── App.jsx
        ├── firebase.js
        ├── context/          # Auth + Theme
        ├── pages/            # Landing (/), Login (/login), Dashboard (/app)
        ├── components/       # Sidebar, Overview, UploadZone, Generator, ChatPanel,
        │   │                 # Flashcards, MCQQuiz, FocusTimer, CommandPalette
        │   └── ui/           # Icon, Markdown, Confirm, Empty
        └── utils/            # api.js (Axios + SSE), helpers.js
```

---

## Setup

### 1. Firebase
1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable **Google** under Authentication → Sign-in method
3. Client config: **Project Settings → Your Apps → Web App**
4. Admin key: **Project Settings → Service Accounts → Generate new private key**

### 2. MongoDB Atlas
Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), add a database user and copy the connection string.

### 3. OpenRouter
1. Create a key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Set `OPENROUTER_API_KEY` in `.env`
3. Optionally pick any model from [openrouter.ai/models](https://openrouter.ai/models) via `OPENROUTER_MODEL` (default: `anthropic/claude-haiku-5.5`)

### 4. Email sign-in codes (optional in development)
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `.env` to email real codes
(e.g. Gmail with an [app password](https://myaccount.google.com/apppasswords): host `smtp.gmail.com`, port `465`).
Without SMTP, **development** mode prints each code to the server console instead; production returns 503.

### Backend (project root)

```bash
cp .env.example .env   # fill in all values
npm install
npm run dev            # http://localhost:5000  (check /health)
```

### Frontend

```bash
cd frontend
cp .env.example .env   # fill in REACT_APP_FIREBASE_* values
npm install
npm start              # http://localhost:3000
```

---

## API Reference

All `/api` routes except `/health` require `Authorization: Bearer <Firebase ID token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/otp/request` | Email a 6-digit sign-in code `{ email }` (public) |
| POST | `/api/auth/otp/verify` | Verify code → Firebase custom token `{ email, code }` (public) |
| POST | `/api/auth/sync` | Sync Firebase user to MongoDB |
| GET | `/api/auth/me` | Current user |
| GET | `/api/notes` | List notes (with word / chunk counts) |
| GET | `/api/notes/:id` | Get a note including raw text |
| POST | `/api/notes/upload` | Upload PDF/TXT/MD (multipart `file`, optional `title`) |
| POST | `/api/notes/text` | Index pasted text `{ title, text }` |
| PATCH | `/api/notes/:id` | Rename `{ title }` |
| DELETE | `/api/notes/:id` | Delete note + its chats, flashcards, quiz attempts |
| POST | `/api/generate/stream/:mode` | **SSE** — `summary`, `concepts`, `eli5`, `mindmap`, `studyplan`, `mnemonics` |
| POST | `/api/generate/summary` · `/concepts` | **SSE** — legacy aliases |
| POST | `/api/generate/flashcards` | Generate deck `{ noteId, count (3-30), difficulty }` |
| GET | `/api/generate/flashcards/:noteId` | Saved deck (empty list if none) |
| PATCH | `/api/generate/flashcards/:noteId/learned` | `{ cardIndex, learned }` |
| POST | `/api/generate/mcq` | Generate quiz `{ noteId, count (3-20), difficulty }` |
| POST | `/api/generate/mcq/attempt` | Save a quiz score |
| GET | `/api/generate/mcq/attempts/:noteId` | Quiz history for a note |
| POST | `/api/chat/session` | Create chat session |
| GET | `/api/chat/sessions/:noteId` | List sessions for a note |
| POST | `/api/chat/message` | **SSE** — send message, stream reply |
| POST | `/api/chat/suggest` | AI-suggested starter questions |
| GET | `/api/chat/history/:sessionId` | Session messages |
| DELETE | `/api/chat/session/:sessionId` | Delete session |
| GET | `/api/stats` | Dashboard stats (streak, mastery, quiz avg, activity) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios, react-markdown + GFM |
| Auth | Firebase Authentication (Google OAuth) |
| Backend | Node.js 18+, Express |
| AI | OpenRouter (OpenAI-compatible API — any model) |
| RAG | Chunking with sentence-aware boundaries + TF-IDF retrieval |
| Streaming | Server-Sent Events (SSE) with client-disconnect abort |
| Database | MongoDB Atlas + Mongoose |
| File parsing | pdf-parse, multer |
| Security | Helmet, express-rate-limit, Firebase Admin token verification |
