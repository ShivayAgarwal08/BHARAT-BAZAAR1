from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "artisan"
    language: str = "en"
    location: str = ""
    phone_number: str = ""
    bio: str = ""
    services: str = ""
    pricing: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    language: str
    location: str
    phone_number: str
    bio: str
    services: str
    pricing: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# Product
class ProductCreate(BaseModel):
    raw_description: str
    quantity: int = 1
    language: str = "en"
    ai_data: Optional[Dict[str, Any]] = None

class ProductOut(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    raw_description: str
    price: float
    min_price: float
    max_price: float
    profit_margin: float
    tags: str
    category: str
    material: str
    quantity: int
    image_url: str
    video_url: str
    language: str
    created_at: datetime
    class Config:
        from_attributes = True


# AI
class AIAnalyzeRequest(BaseModel):
    description: str
    language: str = "en"
    quantity: int = 1

class AIAnalyzeResponse(BaseModel):
    product_name: str
    category: str
    material: str
    quantity: int
    min_price: float
    max_price: float
    suggested_price: float
    profit_margin: float
    greeting: str
    title: str
    description: str
    tags: List[str]
    language: str

class MarketEstimationRequest(BaseModel):
    product_name: str
    category: str
    material: str

class MarketEstimationResponse(BaseModel):
    min_price: float
    max_price: float
    suggested_price: float
    profit_margin: float
    demand: str


# Manager
class ManagerRequestCreate(BaseModel):
    product_id: int
    description: str = ""

class ManagerRequestOut(BaseModel):
    id: int
    artisan_id: int
    product_id: int
    description: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class InternApplicationCreate(BaseModel):
    request_id: int
    cover_note: str = ""
    college: str = ""
    skills: str = ""

class InternApplicationOut(BaseModel):
    id: int
    intern_id: int
    request_id: int
    cover_note: str
    college: str
    skills: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# Impact
class ImpactStats(BaseModel):
    total_artisans: int
    total_products: int
    total_interns: int
    total_manager_requests: int
    revenue_generated: float
    jobs_created: int

# Hiring Flow
class InternHireCreate(BaseModel):
    intern_id: int
    product_id: Optional[int] = None
    message: str = ""

class InternHireOut(BaseModel):
    id: int
    artisan_id: int
    intern_id: int
    product_id: Optional[int]
    message: str
    status: str
    created_at: datetime
    artisan: UserOut
    intern: UserOut
    class Config:
        from_attributes = True

class HireStatusUpdate(BaseModel):
    status: str # accepted | rejected

# Alerts
class InternAlertCreate(BaseModel):
    artisan_id: int
    product_id: Optional[int] = None
    message: str

class InternAlertOut(BaseModel):
    id: int
    intern_id: int
    artisan_id: int
    product_id: Optional[int]
    message: str
    created_at: datetime
    intern: UserOut
    artisan: UserOut
    class Config:
        from_attributes = True
