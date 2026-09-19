from sqlalchemy import CheckConstraint, Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="artisan")  # artisan | intern | admin
    language = Column(String, default="en")
    location = Column(String, default="")
    phone_number = Column(String, default="")
    bio = Column(Text, default="")
    services = Column(String, default="") # comma-separated list of services
    pricing = Column(String, default="") # ex: "$10/hr", "Negotiable"
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="owner")
    manager_requests = relationship("ManagerRequest", back_populates="artisan")
    sent_hire_requests = relationship("InternHireRequest", foreign_keys="InternHireRequest.artisan_id", back_populates="artisan")
    received_hire_requests = relationship("InternHireRequest", foreign_keys="InternHireRequest.intern_id", back_populates="intern")
    sent_alerts = relationship("InternAlert", foreign_keys="InternAlert.intern_id", back_populates="intern")
    received_alerts = relationship("InternAlert", foreign_keys="InternAlert.artisan_id", back_populates="artisan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    raw_description = Column(Text, default="")
    price = Column(Float, nullable=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    profit_margin = Column(Float, nullable=True)
    tags = Column(Text, default="")  # comma-separated
    category = Column(String, default="")
    material = Column(String, default="")
    quantity = Column(Integer, default=1)
    image_url = Column(String, default="")
    video_url = Column(String, default="")
    language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="products")
    manager_requests = relationship("ManagerRequest", back_populates="product")


class ManagerRequest(Base):
    __tablename__ = "manager_requests"

    id = Column(Integer, primary_key=True, index=True)
    artisan_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    description = Column(Text, default="")
    status = Column(String, default="open")  # open | in_progress | closed
    created_at = Column(DateTime, default=datetime.utcnow)

    artisan = relationship("User", back_populates="manager_requests")
    product = relationship("Product", back_populates="manager_requests")
    applications = relationship("InternApplication", back_populates="request")


class InternApplication(Base):
    __tablename__ = "intern_applications"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id"))
    request_id = Column(Integer, ForeignKey("manager_requests.id"))
    cover_note = Column(Text, default="")
    college = Column(String, default="")
    skills = Column(String, default="")
    status = Column(String, default="pending")  # pending | selected | rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    request = relationship("ManagerRequest", back_populates="applications")

class InternHireRequest(Base):
    __tablename__ = "intern_hire_requests"

    id = Column(Integer, primary_key=True, index=True)
    artisan_id = Column(Integer, ForeignKey("users.id"))
    intern_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True) # Optional link to a specific product
    message = Column(Text, default="")
    status = Column(String, default="pending")  # pending | accepted | rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    artisan = relationship("User", foreign_keys=[artisan_id], back_populates="sent_hire_requests")
    intern = relationship("User", foreign_keys=[intern_id], back_populates="received_hire_requests")
    product = relationship("Product")

class InternAlert(Base):
    __tablename__ = "intern_alerts"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id"))
    artisan_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True) # Optional link to product
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    intern = relationship("User", foreign_keys=[intern_id], back_populates="sent_alerts")
    artisan = relationship("User", foreign_keys=[artisan_id], back_populates="received_alerts")
    product = relationship("Product")


class AssistedRegistrationRequest(Base):
    __tablename__ = "assisted_registration_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'contacted', 'completed', 'cancelled')",
            name="ck_assisted_registration_request_status",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    preferred_language = Column(String, nullable=False)
    preferred_callback_time = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class GrowthRequest(Base):
    __tablename__ = "growth_requests"
    id = Column(Integer, primary_key=True)
    artisan_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    help_type = Column(String, nullable=False)
    preferred_duration_months = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="pending")
    assigned_student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    artisan = relationship("User", foreign_keys=[artisan_id])
    assigned_student = relationship("User", foreign_keys=[assigned_student_id])


class PilotEngagement(Base):
    __tablename__ = "pilot_engagements"
    id = Column(Integer, primary_key=True)
    growth_request_id = Column(Integer, ForeignKey("growth_requests.id"), nullable=False, unique=True)
    artisan_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    funding_type = Column(String, nullable=False, default="PLATFORM_SPONSORED")
    artisan_cost = Column(Float, nullable=False, default=0)
    stipend_amount = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    request = relationship("GrowthRequest")
    artisan = relationship("User", foreign_keys=[artisan_id])
    student = relationship("User", foreign_keys=[student_id])


# Operational records are intentionally separate from the original matching
# tables.  They let a sponsored pilot grow into a documented, participant-only
# workflow without changing historic requests or products.
class PilotTask(Base):
    __tablename__ = "pilot_tasks"
    id = Column(Integer, primary_key=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    assigned_student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
    student_update = Column(Text, default="")
    artisan_feedback = Column(Text, default="")
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PilotDiscovery(Base):
    __tablename__ = "pilot_discoveries"
    id = Column(Integer, primary_key=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    current_challenges = Column(Text, default="")
    priorities = Column(Text, default="")
    proposed_deliverables = Column(Text, default="")
    status = Column(String, nullable=False, default="submitted")
    admin_notes = Column(Text, default="")
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PilotMetric(Base):
    __tablename__ = "pilot_metrics"
    id = Column(Integer, primary_key=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=False, index=True)
    stage = Column(String, nullable=False)  # before | current | final
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=True)
    notes = Column(Text, default="")
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PaidEngagement(Base):
    __tablename__ = "paid_engagements"
    id = Column(Integer, primary_key=True)
    artisan_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=True)
    source = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    agreed_rate = Column(Float, nullable=False)
    rate_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="proposed")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EngagementAgreement(Base):
    __tablename__ = "engagement_agreements"
    id = Column(Integer, primary_key=True)
    paid_engagement_id = Column(Integer, ForeignKey("paid_engagements.id"), nullable=False, unique=True)
    deliverables = Column(Text, nullable=False)
    growth_targets = Column(Text, default="")
    artisan_accepted_at = Column(DateTime, nullable=True)
    student_accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PaidEngagementTask(Base):
    __tablename__ = "paid_engagement_tasks"
    id = Column(Integer, primary_key=True)
    paid_engagement_id = Column(Integer, ForeignKey("paid_engagements.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    due_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="pending")
    student_update = Column(Text, default="")
    artisan_feedback = Column(Text, default="")
    completed_at = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PaymentRecord(Base):
    __tablename__ = "payment_records"
    id = Column(Integer, primary_key=True)
    paid_engagement_id = Column(Integer, ForeignKey("paid_engagements.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=False)
    reference_note = Column(Text, default="")
    status = Column(String, nullable=False, default="declared")
    declared_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    student_confirmed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)


class EngagementReview(Base):
    __tablename__ = "engagement_reviews"
    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="ck_engagement_review_rating"),)
    id = Column(Integer, primary_key=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=True)
    paid_engagement_id = Column(Integer, ForeignKey("paid_engagements.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EngagementIssue(Base):
    __tablename__ = "engagement_issues"
    id = Column(Integer, primary_key=True)
    pilot_id = Column(Integer, ForeignKey("pilot_engagements.id"), nullable=True)
    paid_engagement_id = Column(Integer, ForeignKey("paid_engagements.id"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="open")
    admin_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
