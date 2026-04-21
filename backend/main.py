from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
import models

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload dirs
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="RuralBazaar API",
    description="Empowering rural artisans through AI-powered product listing and market insights",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routers.auth_router import router as auth_router
from routers.product_router import router as product_router
from routers.ai_router import router as ai_router
from routers.manager_router import router as manager_router
from routers.image_router import router as image_router
from routers.impact_router import router as impact_router

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(ai_router)
app.include_router(manager_router)
app.include_router(image_router)
app.include_router(impact_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "RuralBazaar API", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "message": "Welcome to RuralBazaar API",
        "docs": "/docs",
        "version": "1.0.0"
    }
