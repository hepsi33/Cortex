# Role-Based Dashboard

A premium, full-stack AI productivity workspace with secure authentication, role-based access control, AI-powered YouTube video analysis, RAG-based document chat with deep research, and a sleek dark theme UI.

🔗 **Live Demo:** [https://role-based-three.vercel.app](https://role-based-three.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)

---

## ✨ Features

### 🔐 Authentication & Authorization
- **Secure Login/Signup** — NextAuth.js v5 with credentials provider and bcrypt password hashing
- **Role-Based Access Control** — Admin and User roles with protected routes and middleware
- **User Approval System** — New users require admin approval before accessing the dashboard

### 🤖 AI-Powered YouTube Notes
- Paste any YouTube video URL and get AI-generated notes powered by **Gemini AI** via OpenRouter
- **Multi-strategy transcript fetching** — tries multiple methods to extract video transcripts:
  - `youtube-transcript` library
  - YouTube timedtext API (manual + auto-generated captions)
  - Invidious API (multiple instances)
  - `ytdl-core` caption tracks
  - Metadata fallback (when no transcript is available)
- **Structured output format:**
  - 🎬 **Video Summary** — concise overview of the video
  - 🔑 **Key Points** — all major points covered
  - 📝 **Detailed Notes** — in-depth, structured notes
  - 💡 **Important Facts** — stats, definitions, and takeaways
  - 🚀 **What to Learn Next** — suggested topics and resources
- **Markdown rendering** — notes are beautifully formatted with proper headings, lists, and styling

### 📄 RAG Knowledge Workspace
- **Multi-format document upload** — PDF, DOCX, PPTX, TXT, MD, CSV, and Images (JPG, PNG, WebP)
- **URL ingestion** — Paste a website URL to scrape and ingest its content via **Firecrawl**
- **Workspace system** — Organize documents into workspaces for project-based knowledge management
- **Per-document chat** — Each document gets its own chat interface
- **Vector search** — Embeddings generated via **Gemini** (`gemini-embedding-001`, 3072 dimensions) stored in PostgreSQL with `pgvector`
- **Document-first answers** — AI answers strictly from uploaded documents by default (no hallucination)
- **Deep Research mode** — Toggle "Search Web (Firecrawl)" to synthesize document context + live web results
- **AI answers** — Relevant chunks retrieved and answered by **Groq** (`llama-3.3-70b-versatile`) with citation support
- **Graceful image handling** — Images analyzed by Gemini Vision with automatic fallback + retry when rate-limited
- **Card grid layout** — Browse all documents, see indexing status, and click "View & Chat"

### 📊 Admin Dashboard
- View user statistics (approved, pending, rejected)
- Approve or reject user registrations
- Manage all users from a central panel

### 🎨 Premium UI
- Modern dark theme with glassmorphism design
- Gradient accents and smooth animations
- Fully responsive layout

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Next.js API Routes (App Router) |
| **Database** | PostgreSQL (Neon) with Drizzle ORM + pgvector |
| **Authentication** | NextAuth.js v5 (Auth.js) |
| **AI - Notes** | Google Gemini 2.0 Flash via OpenRouter |
| **AI - Embeddings** | Google Gemini (`gemini-embedding-001`, 3072d) |
| **AI - Chat LLM** | Groq (`llama-3.3-70b-versatile`) |
| **AI - Vision** | Google Gemini (image analysis with retry) |
| **Web Scraping** | Firecrawl (URL ingestion + deep research) |
| **Document Parsing** | pdf-parse, mammoth (DOCX), pptx (PPTX) |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account) with `pgvector` extension
- [OpenRouter API key](https://openrouter.ai) (for AI notes)
- [Gemini API key](https://aistudio.google.com) (for embeddings + image analysis)
- [Groq API key](https://console.groq.com) (for RAG chat)
- [Firecrawl API key](https://firecrawl.dev) (for URL ingestion + deep research)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hepsi33/Role-based-Dashboard.git
   cd Role-based-Dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   AUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   OPENROUTER_API_KEY="your-openrouter-api-key"
   GEMINI_API_KEY="your-gemini-api-key"
   GROQ_API_KEY="your-groq-api-key"
   FIRECRAWL_API_KEY="your-firecrawl-api-key"
   ```

4. **Push the database schema:**
   ```bash
   npm run db:push
   ```

5. **Enable pgvector extension:**
   ```bash
   npx tsx scripts/enable-vector.ts
   ```

6. **Seed the admin user:**
   ```bash
   npm run db:seed
   ```
   Default admin: `test@test.com` / `Test123@123`

7. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## 👤 User Flow

```
Sign Up → Pending Approval → Admin Approves/Rejects
                                    ↓
                        ✅ Approved → Dashboard + AI Notes + RAG Chat
                        ❌ Rejected → Access Denied Page
```

1. **Sign Up** → User creates an account (status: pending)
2. **Pending** → User sees a pending approval page
3. **Admin Approval** → Admin approves or rejects in the admin dashboard
4. **Access Granted** → Approved users can access the dashboard and AI features
5. **Access Denied** → Rejected users see the access denied page

---

## 💬 Chat Modes

The RAG chat has two modes controlled by a toggle in the chat interface:

| Mode | Toggle | Behavior |
|------|--------|----------|
| **Document-Only** (default) | ☐ Unchecked | Answers strictly from uploaded documents. Says "not available" if info isn't found. |
| **Deep Research** | ☑ Search Web | Synthesizes document context + live Firecrawl web results with source citations. |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── access-denied/        # Rejected users page
│   ├── admin/                # Admin dashboard (stats + user management)
│   ├── dashboard/
│   │   ├── ai-notes/         # AI Study Notes generator
│   │   ├── rag/              # RAG document grid
│   │   │   └── [documentId]/ # Per-document chat page
│   │   └── page.tsx          # Main dashboard
│   ├── get-started/          # Getting started / onboarding
│   ├── login/                # Login page
│   ├── signup/               # Sign up page
│   ├── pending/              # Pending approval page
│   └── api/
│       ├── auth/             # Auth endpoints (login, signup)
│       ├── admin/            # Admin API (stats, user management)
│       ├── ai/generate/      # AI notes generation endpoint
│       ├── chat/             # RAG chat API (document-first + deep research)
│       ├── documents/        # Document CRUD + retry API
│       ├── ingest/url/       # URL scraping & ingestion API
│       ├── upload/           # File upload & processing API
│       └── workspaces/       # Workspace CRUD API
├── components/
│   └── rag/                  # ChatInterface, DocumentManager, WorkspaceSelector
├── drizzle/                  # Database schema & seed scripts
└── lib/
    ├── auth.ts               # NextAuth configuration
    ├── db.ts                 # Database connection (Neon + Drizzle)
    ├── file-parsers.ts       # Multi-format file parsers (PDF, DOCX, PPTX, images)
    ├── firecrawl.ts          # Firecrawl wrapper (scrape, search, deep research)
    ├── processor.ts          # Document processing pipeline (parse → chunk → embed)
    └── utils.ts              # Shared utilities
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon recommended) |
| `AUTH_SECRET` | ✅ | NextAuth secret key for session encryption |
| `NEXTAUTH_URL` | ✅ | App URL (`http://localhost:3002` for dev, Vercel URL for prod) |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for AI YouTube notes |
| `GEMINI_API_KEY` | ✅ | Gemini API key for embeddings + image analysis |
| `GROQ_API_KEY` | ✅ | Groq API key for RAG chat LLM |
| `FIRECRAWL_API_KEY` | ✅ | Firecrawl API key for URL ingestion + deep research |

---

## 🧰 Utility Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Enable pgvector | `npx tsx scripts/enable-vector.ts` | Enables the `vector` extension in PostgreSQL |
| Verify DB connection | `npx tsx scripts/verify-db.ts` | Tests database connectivity |
| Check DNS | `npx tsx scripts/check-dns.ts` | Diagnoses DNS resolution issues |

---

## 📜 License

MIT
