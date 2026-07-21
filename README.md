# 📚 StudyMind AI 

AI-powered study assistant using **Gemini API**, **RAG pipeline**, **MongoDB**, **Firebase Auth**, **React.js**, and **Node.js/Express**.

---

## Project Structure

```
studymind/
├── config/                   # MongoDB & Firebase configuration
│   ├── db.js                 # MongoDB connection
│   └── firebase.js           # Firebase Admin SDK
├── middleware/
│   └── auth.js               # Firebase JWT verification
├── models/
│   ├── User.js
│   ├── Note.js               # Chunked documents
│   ├── Session.js            # Chat history
│   └── Flashcard.js
├── routes/
│   ├── auth.js               # POST /api/auth/sync
│   ├── notes.js              # Upload / index notes
│   ├── generate.js           # Summary / concepts / flashcards / MCQ
│   └── chat.js               # RAG chat with session memory
├── utils/
│   ├── chunker.js            # Text chunking + RAG retrieval
│   └── gemini.js             # Gemini API wrapper (text, stream, JSON)
├── server.js                 # Backend server entry point
├── .env.example
├── package.json
│
└── frontend/                 # React.js frontend
    ├── public/index.html
    ├── src/
    │   ├── firebase.js       # Firebase client init
    │   ├── App.jsx           # Routes + auth guard
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   └── Dashboard.jsx
    │   ├── components/
    │   │   ├── UploadZone.jsx
    │   │   ├── Generator.jsx  # SSE streaming generate
    │   │   ├── ChatPanel.jsx  # RAG chat
    │   │   ├── Flashcards.jsx
    │   │   └── MCQQuiz.jsx
    │   └── utils/
    │       └── api.js         # Axios + SSE stream helper
    ├── .env.example
    └── package.json
```

---

## Setup

### 1. Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Google Authentication** under Authentication > Sign-in method
4. Get client config from **Project Settings > Your Apps > Web App**
5. Get Admin SDK key from **Project Settings > Service Accounts > Generate new private key**

### 2. MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and copy the connection string

### 3. Gemini API
1. Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Backend (project root)

```bash
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev        # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Fill in REACT_APP_FIREBASE_* values
npm install
npm start          # starts on http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sync` | Sync Firebase user to MongoDB |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/notes/upload` | Upload PDF/TXT/MD file |
| POST | `/api/notes/text` | Index pasted text |
| GET | `/api/notes` | List user's notes |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/generate/summary` | **SSE** — stream summary |
| POST | `/api/generate/concepts` | **SSE** — stream concepts |
| POST | `/api/generate/flashcards` | Generate flashcard deck |
| POST | `/api/generate/mcq` | Generate MCQ quiz |
| GET | `/api/generate/flashcards/:noteId` | Fetch saved flashcards |
| PATCH | `/api/generate/flashcards/:noteId/learned` | Toggle card learned |
| POST | `/api/chat/session` | Create a new chat session |
| POST | `/api/chat/message` | **SSE** — send message, stream reply |
| GET | `/api/chat/history/:sessionId` | Get chat history |
| DELETE | `/api/chat/session/:sessionId` | Delete session |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18, React Router v6, Axios |
| Auth | Firebase Authentication (Google OAuth) |
| Backend | Node.js, Express.js |
| AI | Google Gemini 1.5 Flash API |
| RAG | Custom keyword-based chunk retrieval |
| Streaming | Server-Sent Events (SSE) |
| Database | MongoDB Atlas + Mongoose |
| File parsing | pdf-parse, multer |
| Security | Helmet, express-rate-limit, Firebase Admin JWT |
| Deployment | Vercel (frontend) + Render (backend) |
