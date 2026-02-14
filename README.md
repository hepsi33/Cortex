# Role-Based Dashboard

A premium, full-stack dashboard application with secure authentication, role-based access control, AI-powered YouTube video analysis, and a sleek dark theme UI.

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
| **Database** | PostgreSQL (Neon) with Drizzle ORM |
| **Authentication** | NextAuth.js v5 (Auth.js) |
| **AI** | Google Gemini 2.0 Flash via OpenRouter |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- [OpenRouter API key](https://openrouter.ai) (for AI features)

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
   ```

4. **Push the database schema:**
   ```bash
   npm run db:push
   ```

5. **Seed the admin user:**
   ```bash
   npm run db:seed
   ```
   Default admin: `test@test.com` / `Test123@123`

6. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 User Flow

```
Sign Up → Pending Approval → Admin Approves/Rejects
                                    ↓
                        ✅ Approved → Dashboard + AI Notes
                        ❌ Rejected → Access Denied Page
```

1. **Sign Up** → User creates an account (status: pending)
2. **Pending** → User sees a pending approval page
3. **Admin Approval** → Admin approves or rejects in the admin dashboard
4. **Access Granted** → Approved users can access the dashboard and AI features
5. **Access Denied** → Rejected users see the access denied page

---

## 📁 Project Structure

```
src/
├── app/
│   ├── access-denied/      # Rejected users page
│   ├── admin/              # Admin dashboard (stats + user management)
│   ├── dashboard/
│   │   ├── ai-notes/       # AI Study Notes generator
│   │   └── page.tsx        # Main dashboard
│   ├── get-started/        # Getting started / onboarding
│   ├── login/              # Login page
│   ├── signup/             # Sign up page
│   ├── pending/            # Pending approval page
│   └── api/
│       ├── auth/           # Auth endpoints (login, signup)
│       ├── admin/          # Admin API (stats, user management)
│       └── ai/generate/    # AI notes generation endpoint
├── components/             # Reusable UI components (buttons, cards, inputs)
├── drizzle/                # Database schema & seed scripts
└── lib/                    # Utilities (auth config, db, OpenRouter client)
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth secret key |
| `NEXTAUTH_URL` | ✅ | App URL (`http://localhost:3000` for dev) |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for AI features |
| `GEMINI_API_KEY` | ⬜ | Optional fallback for AI features |

---

## 📜 License

MIT
