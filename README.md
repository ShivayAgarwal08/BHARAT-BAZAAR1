# 🪔 Bharat Bazaar — AI-Powered Platform for Rural Artisans

A full-stack MVP web app that allows rural artisans to **speak** their product descriptions and instantly get AI-generated product listings using **Groq LLaMA 3**.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite (via SQLAlchemy) |
| AI | Groq API — LLaMA 3 8B (free tier) |
| Voice | Browser `webkitSpeechRecognition` |

---

## 📁 Project Structure

```
BHARAT-BAZAAR/
├── backend/
│   ├── main.py          # FastAPI app (4 endpoints)
│   ├── requirements.txt
│   ├── .env             # GROQ_API_KEY goes here
│   └── products.db      # SQLite DB (auto-created)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx   # Root layout + navbar
    │   ├── page.tsx     # Home page (voice → generate)
    │   └── products/
    │       └── page.tsx # Products listing page
    ├── components/
    │   ├── VoiceRecorder.tsx
    │   ├── ProductCard.tsx
    │   └── ProductList.tsx
    └── ...
```

---

## ⚙️ Setup & Run

### 1. Get Your Groq API Key (Free)
1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up and create an API key
3. Copy it

### 2. Start the Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Add your Groq API key
# Edit backend/.env and replace: your_groq_api_key_here

# Start FastAPI server
uvicorn main:app --reload
```

Backend runs at: http://127.0.0.1:8000

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## 🌐 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/` | Health check |
| `POST` | `/generate` | Generate listing from voice text |
| `POST` | `/products` | Save a product |
| `GET` | `/products` | Get all saved products |

---

## 🎯 How It Works

1. **Speak** → Click mic button, describe product in natural language
2. **Review** → See transcript, edit if needed
3. **Generate** → Groq LLaMA 3 creates structured listing
4. **Save** → Product stored in SQLite
5. **Browse** → View all saved products on `/products`
