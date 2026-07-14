# Todo App
# ALERT MESSAGE 

{Due to supabase ban in india the link to website is not working, but u can still cole the repo and do workaround your own backend!!}

This is a monorepo for the fullstack to-do app.


- ✅ A **Next.js** frontend
- 🐍 A **FastAPI** backend
- 🧠 A Python-based screen time **tracker**
- 🌐 Realtime backend updates using **Supabase**

---

## 📁 Structure

todo/
├── frontend/ # Next.js frontend
├── backend/ # FastAPI backend
│ ├── api/ # REST API endpoints
│ └── tracker/ # App usage tracking logic

## 🚀 Setup

### Frontend
```bash
cd frontend
npm install
npm run dev



cd backend
# Set up virtualenv, install FastAPI, etc.



---

## 🔧 Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+
- Supabase account
- Git & GitHub
- (Optional) Vercel & Render accounts for deployment

---

## 🧱 Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Get your **Project URL**, **Anon Key**, and **Service Role Key**.

### ✅ Required Tables

#### 1. `tasks` Table

| Column     | Type      | Description                         |
|------------|-----------|-------------------------------------|
| id         | UUID      | Primary key (default uuid)          |
| user_id    | UUID      | Supabase Auth user ID (if used)     |
| title      | text      | Task title                          |
| is_active  | boolean   | Is screen tracking active           |
| status     | text      | "todo", "in-progress", "done", etc. |
| created_at | timestamp | Default `now()`                     |

#### 2. `screen_time` Table

| Column          | Type     | Description                                              |
|------------------|----------|----------------------------------------------------------|
| id               | UUID     | Primary key                                              |
| task_id          | UUID     | Foreign key to `tasks.id`                                |
| app_name         | text     | App name to track (e.g., "chrome", "code")               |
| duration_minutes | jsonb    | Array of: `{ "date": "...", "time": "...", "minutes": N }` |
| updated_at       | timestamp | Last updated timestamp                                  |

---

## ⚙️ Environment Variables

### 📁 `/frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key


```/backend/api/.env & /backend/tracker/.env

SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key



cd frontend
npm install
npm run dev




cd backend/api
pip install -r requirements.txt
uvicorn main:app --reload




