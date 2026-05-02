# 🧠 Cortex

Cortex is a premium, high-fidelity AI Study OS designed for elite learners. It synthesizes deep research, distraction-free focus, and automated retrieval practice into a single, unified intelligence repository.

🔗 **GitHub Repository:** [https://github.com/hepsi33/Cortex.git](https://github.com/hepsi33/Cortex.git)

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)

---

## ⚡ Key Intelligence Engines

### 🧘 Neural Focus Mode
- **Precision Timers** — Set sessions up to 4 hours with automated break scheduling.
- **Smart Formatting** — Dynamic time display (e.g., `2h 30m`) for long-form study sessions.
- **Neural Reset Overlay** — Automated, distraction-free break reminders with visual "Neural Reset" states.
- **Recovery Logic** — High-opacity overlays ensure full focus recovery during mandatory breaks.

### 📚 RAG Knowledge Repositories
- **Multi-Format Ingestion** — PDF, DOCX, PPTX, and high-fidelity text extraction.
- **Firecrawl Integration** — Professional-grade web-to-markdown conversion that bypasses bot detection.
- **YouTube Intelligence** — Automated transcript extraction with deep metadata reasoning fallbacks for videos without captions.
- **Strict Isolation** — Multi-workspace architecture ensures knowledge boundaries are never crossed.

### 🎯 Neural Practice Engine
- **Automated Quiz Generation** — AI-forged trials tailored to your specific repository content.
- **Neural Correction** — Real-time feedback with color-coded "Mastered" (Green) and "Failed" (Red) metrics.
- **Integrated Reasoning** — AI explanations are embedded directly inside the correct choice for instant concept reinforcement.
- **Memory Forging** — Automated flashcard batches with spaced-repetition logic.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Database** | PostgreSQL (Neon) + Drizzle ORM + pgvector |
| **Auth** | NextAuth.js v5 (Auth.js) |
| **Scraping** | Firecrawl (Advanced Markdown Ingestion) |
| **AI Processing** | Google Gemini (Embeddings + Reasoning + Vision) |
| **LLM Engine** | Groq (Llama 3.3 70B) & OpenRouter |
| **UI/UX** | Tailwind CSS 4, Framer Motion, Lucide Icons |

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/hepsi33/Cortex.git
cd Cortex
npm install
```

### 2. Configuration
Create a `.env` file in the root:
```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-secret"
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
FIRECRAWL_API_KEY="your-firecrawl-key"
OPENROUTER_API_KEY="your-openrouter-key"
```

### 3. Initialize
```bash
npm run db:push
npm run db:seed
npm run dev
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**hepsi33**
- GitHub: [@hepsi33](https://github.com/hepsi33)
