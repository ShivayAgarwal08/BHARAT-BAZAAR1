# RuralBazaar - Empowering Rural Artisans

RuralBazaar is a full-stack platform designed to help rural artisans list their products and reach a wider market with AI-powered insights.

## Project Structure

- `/backend`: FastAPI (Python) server
- `/frontend`: React (Vite) client

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite (Development) / PostgreSQL (Production)
- **Frontend**: React, Vite, Axios, Recharts
- **AI**: Google Gemini Pro (Text & Vision)

## Deployment

### 1. Database (Supabase)
1. Create a project on [Supabase](https://supabase.com/).
2. Go to **Project Settings** > **Database**.
3. Copy the **Connection String** (URI).
   - Ensure you use the "Transaction" mode (port 6543) if you're using pooling, or just the standard connection string.
   - Example: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-ID].supabase.co:5432/postgres`

### 2. Backend (Render)
1. Link your GitHub repo to [Render](https://render.com/).
2. Create a new **Web Service**.
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add **Environment Variables**:
   - `DATABASE_URL`: (Your Supabase connection string)
   - `GEMINI_API_KEY`: (Your Google Gemini key)
   - `JWT_SECRET`: (A random secret string)

### 3. Frontend (Vercel)
1. Link your GitHub repo to [Vercel](https://vercel.com/).
2. Create a new **Project**.
3. Add **Environment Variables**:
   - `VITE_API_URL`: (Your Render backend URL, e.g., `https://rural-bazaar.onrender.com`)

## Tech Stack
- **Frontend**: React (Vite) on Vercel
- **Backend**: FastAPI (Python) on Render
- **Database**: PostgreSQL on Supabase
- **AI**: Google Gemini Pro