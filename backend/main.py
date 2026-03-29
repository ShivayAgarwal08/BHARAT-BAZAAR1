"""
Bharat Bazaar - FastAPI Backend
Uses Groq API (LLaMA 3) to generate AI-powered product listings from voice text.
"""

import os
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# ─── Load environment variables ───────────────────────────────────────────────
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ─── FastAPI App Setup ─────────────────────────────────────────────────────────
app = FastAPI(title="Bharat Bazaar API", version="1.0.0")

# Allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database Setup (SQLite) ───────────────────────────────────────────────────
DATABASE_URL = "sqlite:///./products.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ProductModel(Base):
    """SQLAlchemy model for the products table."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(String(100), nullable=False)
    tags = Column(String(500), nullable=False)  # stored as comma-separated string
    created_at = Column(DateTime, default=datetime.utcnow)


# Create tables on startup
Base.metadata.create_all(bind=engine)

# ─── Pydantic Schemas ──────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    text: str  # raw voice transcript from user


class GenerateResponse(BaseModel):
    title: str
    description: str
    price: str
    tags: List[str]


class ProductCreate(BaseModel):
    title: str
    description: str
    price: str
    tags: List[str]


class ProductResponse(BaseModel):
    id: int
    title: str
    description: str
    price: str
    tags: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Helper: Groq AI Client ───────────────────────────────────────────────────
def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not set. Please add it to backend/.env"
        )
    return Groq(api_key=GROQ_API_KEY)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Backend running"}


@app.post("/generate", response_model=GenerateResponse)
def generate_listing(request: GenerateRequest):
    """
    Takes raw voice text (e.g. 'I make handmade clay pots price 200 rupees')
    and uses Groq LLaMA 3 to generate a structured product listing.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text input cannot be empty")

    client = get_groq_client()

    # Craft a clear prompt for LLaMA 3
    prompt = f"""You are a helpful assistant for rural artisans in India.
A seller described their product in natural language: "{request.text}"

Extract and return a structured product listing as a JSON object with exactly these fields:
- title: A short, catchy product title (max 10 words)
- description: A helpful product description (2-3 sentences)
- price: The price mentioned (e.g. "₹200") — if not mentioned, write "Price not specified"
- tags: A list of 3-5 relevant tags (e.g. ["handmade", "clay", "pottery"])

Return ONLY valid JSON. No explanation, no markdown, no extra text.

Example output:
{{"title": "Handmade Clay Pot", "description": "A beautiful handmade clay pot crafted by skilled artisans. Perfect for home decor or cooking.", "price": "₹200", "tags": ["handmade", "clay", "pottery", "home decor"]}}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",  # Groq's free LLaMA 3 8B model
            temperature=0.7,
            max_tokens=512,
        )
        raw_response = chat_completion.choices[0].message.content.strip()

        # Parse the JSON response
        data = json.loads(raw_response)

        return GenerateResponse(
            title=data.get("title", "Artisan Product"),
            description=data.get("description", "A unique handcrafted product."),
            price=data.get("price", "Price not specified"),
            tags=data.get("tags", []),
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned invalid JSON. Please try again."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")


@app.post("/products", response_model=ProductResponse)
def save_product(product: ProductCreate):
    """Save a product listing to the SQLite database."""
    db = SessionLocal()
    try:
        db_product = ProductModel(
            title=product.title,
            description=product.description,
            price=product.price,
            tags=",".join(product.tags),  # store as comma-separated string
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)

        return ProductResponse(
            id=db_product.id,
            title=db_product.title,
            description=db_product.description,
            price=db_product.price,
            tags=db_product.tags.split(",") if db_product.tags else [],
            created_at=db_product.created_at,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()


@app.get("/products", response_model=List[ProductResponse])
def get_products():
    """Return all saved products, newest first."""
    db = SessionLocal()
    try:
        products = db.query(ProductModel).order_by(ProductModel.created_at.desc()).all()
        return [
            ProductResponse(
                id=p.id,
                title=p.title,
                description=p.description,
                price=p.price,
                tags=p.tags.split(",") if p.tags else [],
                created_at=p.created_at,
            )
            for p in products
        ]
    finally:
        db.close()
