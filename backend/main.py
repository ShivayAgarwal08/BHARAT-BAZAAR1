from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
import models
from admin_bootstrap import bootstrap_initial_admin

# Create tables
Base.metadata.create_all(bind=engine)
bootstrap_initial_admin()

# Create upload dirs
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="Bharat Bazaar API",
    description="Empowering rural artisans through AI-powered product listing and market insights",
    version="1.0.0",
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
from routers.assisted_registration_router import router as assisted_registration_router
from routers.admin_router import router as admin_router
from routers.growth_router import router as growth_router

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(ai_router)
app.include_router(manager_router)
app.include_router(image_router)
app.include_router(impact_router)
app.include_router(assisted_registration_router)
app.include_router(admin_router)
app.include_router(growth_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Bharat Bazaar API", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "message": "Welcome to Bharat Bazaar API",
        "docs": "/docs",
        "version": "1.0.0"
    }

