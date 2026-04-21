# Bharat Bazaar — Empowering Rural Artisans 🪔

Bharat Bazaar is a full-stack platform that empowers rural artisans to list their handcrafted products and reach wider markets — powered by AI-driven product descriptions, voice-based listing creation, and market insights.

## Project Structure

```
BHARAT-BAZAAR/
├── backend/      # FastAPI (Python) server
└── frontend/     # React (Vite) client
```

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19, Vite, React Router, Recharts  |
| Backend    | FastAPI, SQLAlchemy, Pydantic           |
| Database   | SQLite (dev) / PostgreSQL (production)  |
| AI         | Google Gemini Pro (Text & Vision)       |
| Auth       | JWT + bcrypt                            |

## Features

- 🎙️ **Voice-based product listing** — artisans describe products in their language
- 🤖 **AI-powered descriptions** — Gemini generates SEO-ready product listings
- 🛒 **Manager Marketplace** — interns/managers discover and apply to help artisans
- 📊 **Impact Dashboard** — analytics and market insights
- 🔔 **Alerts System** — real-time notifications between artisans and interns

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in your values
copy .env.example .env
# → Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**  
API docs at: **http://localhost:8000/docs**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

## Environment Variables

### Backend (`backend/.env`)

| Variable        | Description                     | Default                        |
|-----------------|---------------------------------|--------------------------------|
| `DATABASE_URL`  | SQLAlchemy DB connection string | `sqlite:///./vocallocal.db`    |
| `GEMINI_API_KEY`| Google Gemini API key           | *(required for AI features)*   |
| `JWT_SECRET`    | Secret for signing JWT tokens   | *(set a strong random string)* |

> Get a free Gemini API key at https://aistudio.google.com/app/apikey

### Frontend (`frontend/.env`)

| Variable       | Description           | Default                   |
|----------------|-----------------------|---------------------------|
| `VITE_API_URL` | Backend API base URL  | `http://localhost:8000`   |

## Deployment

### 1. Database — [Supabase](https://supabase.com/)
1. Create a project → **Settings** → **Database** → copy the **Connection String**
2. Use the Transaction pooler (port 6543) for best performance

### 2. Backend — [Render](https://render.com/)
1. Connect your GitHub repo → New **Web Service**
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**: `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`

### 3. Frontend — [Vercel](https://vercel.com/)
1. Import GitHub repo → **Root Directory**: `frontend`
2. **Environment Variables**: `VITE_API_URL` = your Render backend URL

## Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.