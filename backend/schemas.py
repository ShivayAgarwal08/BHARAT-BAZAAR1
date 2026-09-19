import re

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any, Literal
from pydantic import Field
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    role: Literal["artisan", "intern"] = "artisan"
    language: str = "en"
    location: str = ""
    phone_number: str = ""
    bio: str = ""
    services: str = ""
    pricing: str = ""

class UserLogin(BaseModel):
    email: str
    password: str = Field(min_length=1)

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

class PublicUserOut(BaseModel):
    id: int
    name: str
    role: str
    language: str
    location: str
    bio: str
    services: str
    pricing: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class AdminSummaryOut(BaseModel):
    total_artisans: int
    total_interns: int
    pending_assisted_registrations: int
    total_products: int
    open_manager_requests: int


class AdminArtisanOut(BaseModel):
    id: int
    name: str
    email: str
    role: Literal["artisan"]
    created_at: datetime
    product_count: int


class AdminInternOut(BaseModel):
    id: int
    name: str
    email: str
    role: Literal["intern"]
    created_at: datetime
    application_count: int


class AssistedRegistrationRequestCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=8, max_length=20)
    preferred_language: str = Field(min_length=1, max_length=50)
    preferred_callback_time: str = Field(min_length=1, max_length=100)

    @field_validator("full_name", "preferred_language", "preferred_callback_time")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"\+?[0-9][0-9\s-]{6,18}[0-9]", value):
            raise ValueError("Enter a valid phone number")
        if not 8 <= len(re.sub(r"\D", "", value)) <= 15:
            raise ValueError("Enter a valid phone number")
        return value


class AssistedRegistrationRequestUpdate(BaseModel):
    status: Optional[Literal["pending", "contacted", "completed", "cancelled"]] = None
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value is not None else value


class AssistedRegistrationRequestOut(BaseModel):
    id: int
    full_name: str
    phone_number: str
    preferred_language: str
    preferred_callback_time: str
    status: Literal["pending", "contacted", "completed", "cancelled"]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssistedRegistrationRequestCreated(BaseModel):
    id: int
    status: Literal["pending", "contacted", "completed", "cancelled"]
    created_at: datetime


class AdminCreateAssistedArtisan(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=8, max_length=20)
    location: str = Field(default="", max_length=200)
    language: str = Field(min_length=1, max_length=50)

    @field_validator("name", "language")
    @classmethod
    def require_non_empty_account_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_account_phone_number(cls, value: str) -> str:
        return AssistedRegistrationRequestCreate.validate_phone_number(value)


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
    price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    profit_margin: Optional[float] = None
    tags: str
    category: str
    material: str
    quantity: int
    image_url: str
    video_url: str
    language: str
    created_at: datetime
    owner: Optional["PublicUserOut"] = None
    class Config:
        from_attributes = True


# AI
class AIAnalyzeRequest(BaseModel):
    description: str = Field(min_length=1)
    language: str = "en"
    quantity: int = 1

    @field_validator("description")
    @classmethod
    def require_nonempty_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Please describe your product before creating a draft.")
        return value

class AIAnalyzeResponse(BaseModel):
    product_name: str
    category: Optional[str] = None
    material: Optional[str] = None
    quantity: int
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    suggested_price: Optional[float] = None
    profit_margin: Optional[float] = None
    greeting: Optional[str] = None
    title: str
    description: str
    tags: List[str]
    language: str
    source: Literal["ai", "basic_draft"]
    provider: Optional[Literal["gemini", "groq"]] = None
    materials: List[str] = Field(default_factory=list)
    suggested_price_min: Optional[float] = None
    suggested_price_max: Optional[float] = None
    target_customer: Optional[str] = None
    selling_points: List[str] = Field(default_factory=list)

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
