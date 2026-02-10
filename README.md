# Role-Based Dashboard

A premium dashboard application with secure authentication, role-based access control, and a modern dark theme UI.

🔗 **Live Demo:** [https://role-based-three.vercel.app](https://role-based-three.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## Features

- 🔐 **Secure Authentication** - NextAuth.js with credentials provider and bcrypt password hashing
- 👥 **Role-Based Access Control** - Admin and User roles with protected routes
- ✅ **User Approval System** - New users require admin approval before accessing the dashboard
- 🎨 **Dark Theme UI** - Modern glassmorphism design with gradient accents
- 🤖 **AI Study Notes** - Generate comprehensive study guides from YouTube videos using Gemini AI
- 📊 **Admin Dashboard** - View user stats (approved, pending, rejected) and manage approvals
- ⚡ **Fast & Modern** - Built with Next.js 16 and Turbopack

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: NextAuth.js v5
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hepsi33/Role-based-Dashboard.git
cd Role-based-Dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and auth secret:
```env
DATABASE_URL="your-postgresql-connection-string"
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Push the database schema:
```bash
npm run db:push
```

5. Seed the admin user:
```bash
npm run db:seed
```
Default admin: `test@test.com` / `Test123@123`

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flow

1. **Sign Up** → User creates account (status: pending)
2. **Pending** → User sees pending approval page
3. **Admin Approval** → Admin approves/rejects in dashboard
4. **Access Granted** → Approved users access dashboard
5. **Access Denied** → Rejected users see access denied page

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin dashboard with stats
│   ├── dashboard/      # User dashboard
│   ├── login/          # Login page
│   ├── signup/         # Sign up page
│   ├── pending/        # Pending approval page
│   ├── access-denied/  # Rejected users page
│   └── api/            # API routes
├── components/         # Reusable UI components
├── drizzle/            # Database schema & migrations
└── lib/                # Utilities (auth, db)
```

## Environment Variables (Vercel)

For deployment, set these in Vercel:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret key |
| `NEXTAUTH_URL` | Your Vercel deployment URL |
| `OPENROUTER_API_KEY` | Key for AI Study Notes feature |
| `GEMINI_API_KEY` | (Optional) Fallback for AI features |

## License

MIT
