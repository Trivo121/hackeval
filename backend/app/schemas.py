
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    user_id: str
    google_sub: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    user_id: str
    google_sub: Optional[str] = None

    class Config:
        from_attributes = True

# --- Project & Evaluation Schemas ---

class ScoringCriterionRequest(BaseModel):
    name: str
    weight: int

class ProblemStatementRequest(BaseModel):
    title: str
    description: str

class ProjectCreateRequest(BaseModel):
    project_name: str
    description: Optional[str] = None
    drive_folder_url: str
    
    # Logic / Config
    track_mode: str  # 'ps' or 'theme'
    theme_desc: Optional[str] = None
    problem_statements: List[ProblemStatementRequest] = []
    scoring_criteria: List[ScoringCriterionRequest] = []
    
    # Feature Flags
    auto_categorization_enabled: bool = True
    plagiarism_detection_enabled: bool = True
    submission_deadline: Optional[datetime] = None

class ProjectResponse(BaseModel):
    project_id: str
    project_name: str
    status: str
    message: str


class ProcessingStartResponse(BaseModel):
    message: str
    project_id: str
    queued: int