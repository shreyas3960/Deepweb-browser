from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from openai import OpenAI
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# A4F OpenAI Client
A4F_API_KEY = os.environ.get('A4F_API_KEY')
A4F_BASE_URL = os.environ.get('A4F_BASE_URL', 'https://api.a4f.co/v1')
A4F_MODEL = os.environ.get('A4F_MODEL', 'provider-5/gpt-5-nano')

if not A4F_API_KEY:
    logging.error("A4F_API_KEY not set")
else:
    ai_client = OpenAI(api_key=A4F_API_KEY, base_url=A4F_BASE_URL)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    workspace_id: str = Field(default_factory=lambda: f"ws_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Clip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    clip_id: str = Field(default_factory=lambda: f"clip_{uuid.uuid4().hex[:12]}")
    user_id: str
    workspace_id: Optional[str] = None
    content: str
    url: Optional[str] = None
    title: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Note(BaseModel):
    model_config = ConfigDict(extra="ignore")
    note_id: str = Field(default_factory=lambda: f"note_{uuid.uuid4().hex[:12]}")
    user_id: str
    workspace_id: Optional[str] = None
    content: str
    title: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FocusSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: f"session_{uuid.uuid4().hex[:12]}")
    user_id: str
    workspace_id: Optional[str] = None
    topic: dict
    local_matching_rules: dict
    synth_templates: dict
    confidence: float
    notes: List[str] = []
    recommendations: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Bookmark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bookmark_id: str = Field(default_factory=lambda: f"bm_{uuid.uuid4().hex[:12]}")
    user_id: str
    url: str
    title: str
    favicon: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BrowsingHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    history_id: str = Field(default_factory=lambda: f"hist_{uuid.uuid4().hex[:12]}")
    user_id: str
    url: str
    title: str
    visited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    theme: str = "dark"
    font_size: str = "medium"
    spacing_density: str = "comfortable"
    default_search_engine: str = "google"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ AUTH HELPERS ============

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> Optional[User]:
    """Get user from session_token cookie or Authorization header"""
    print(f"DEBUG: get_current_user called. Cookie: {session_token}")
    print(f"DEBUG: Headers: {request.headers}")
    token = session_token
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        print("DEBUG: No token found")
        return None
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        print(f"DEBUG: Session not found for token: {token}")
        return None
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        return None
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

async def require_auth(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    """Require authentication or raise 401"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def get_optional_user(request: Request, session_token: Optional[str] = Cookie(None)) -> Optional[User]:
    """Get user if authenticated, return None for guest mode"""
    return await get_current_user(request, session_token)

def get_guest_user_id() -> str:
    """Generate a consistent guest user ID based on session (or create one per browser session)"""
    # For guest mode, we'll use a consistent guest ID
    # In production, you might want to use session-based guest IDs
    return "guest_user"

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Process session_id from Emergent Auth and create session"""
    try:
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            raise HTTPException(status_code=400, detail="X-Session-ID header required")
        
        async with httpx.AsyncClient() as http_client:
            auth_response = await http_client.get(
                'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                headers={'X-Session-ID': session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        existing_user = await db.users.find_one({"email": auth_data['email']}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user['user_id']
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": auth_data['name'],
                    "picture": auth_data.get('picture')
                }}
            )
        else:
            user_doc = {
                "user_id": user_id,
                "email": auth_data['email'],
                "name": auth_data['name'],
                "picture": auth_data.get('picture'),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        session_token = auth_data.get('session_token', f"session_{uuid.uuid4().hex}")
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user, "session_token": session_token}
        
    except Exception as e:
        logging.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user"""
    user = await require_auth(request, session_token)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    token = session_token
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============ AI ENDPOINTS ============

@api_router.post("/session_init")
async def session_init(request: Request, session_token: Optional[str] = Cookie(None)):
    """Initialize a focus session with AI (single call)"""
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    
    if 'ai_client' not in globals():
         raise HTTPException(status_code=503, detail="AI service not configured (A4F_API_KEY missing)")

    try:
        body = await request.json()
        topic_source = body.get('topicSourceText', '')[:2000]
        workspace_id = body.get('workspaceId')
        sensitivity = body.get('sensitivity', 'balanced')
        
        if not topic_source:
            raise HTTPException(status_code=400, detail="topicSourceText required")
        
        prompt = f"""You are an AI assistant for a focus/productivity app. Analyze this topic and return ONLY valid JSON (no markdown, no backticks) with this exact structure:

{{
  "sessionId": "unique_session_id",
  "topic": {{
    "title": "concise title",
    "keywords": [{{"kw":"keyword1","weight":0.8}}, {{"kw":"keyword2","weight":0.6}}],
    "phrases": ["important phrase 1", "important phrase 2"],
    "summarySeed": "brief summary under 300 chars",
    "tagSuggestions": ["tag1", "tag2", "tag3"]
  }},
  "localMatchingRules": {{
    "minKeywordOverlap": 0.20,
    "minWeightedScore": 0.60,
    "titleBoost": 1.3,
    "domainWhitelist": [],
    "ignoreShortPages": true
  }},
  "synthTemplates": {{
    "outlineTemplate": "## {{{{title}}}}\\n\\n### Key Points\\n- {{{{point1}}}}\\n- {{{{point2}}}}",
    "summaryPromptSeed": "Summarize the key findings about {{{{topic}}}}"
  }},
  "confidence": 0.85,
  "notes": ["Generated analysis for focus session"],
  "recommendations": {{
    "keywordsToTrack": ["keyword1", "keyword2"],
    "maxPageTextCharsToEmbed": 2000
  }}
}}

Topic to analyze: {topic_source}

Remember: Return ONLY the JSON object, no other text."""

        response = ai_client.chat.completions.create(
            model=A4F_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        import json
        session_data = json.loads(response_text)
        
        # Store in database
        session_doc = FocusSession(
            user_id=user_id,
            workspace_id=workspace_id,
            topic=session_data.get('topic', {}),
            local_matching_rules=session_data.get('localMatchingRules', {}),
            synth_templates=session_data.get('synthTemplates', {}),
            confidence=session_data.get('confidence', 0.0),
            notes=session_data.get('notes', []),
            recommendations=session_data.get('recommendations', {})
        )
        
        doc = session_doc.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.focus_sessions.insert_one(doc)
        
        return session_data
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error: {e}. Response: {response_text}")
        return JSONResponse(
            status_code=400,
            content={"error": "Failed to parse AI response", "raw_response": response_text[:500]}
        )
    except Exception as e:
        logging.error(f"Session init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ WORKSPACE ENDPOINTS ============

@api_router.get("/workspaces", response_model=List[Workspace])
async def get_workspaces(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    workspaces = await db.workspaces.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for w in workspaces:
        if isinstance(w.get('created_at'), str):
            w['created_at'] = datetime.fromisoformat(w['created_at'])
        if isinstance(w.get('updated_at'), str):
            w['updated_at'] = datetime.fromisoformat(w['updated_at'])
    return workspaces

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    ws = Workspace(user_id=user_id, **workspace)
    doc = ws.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.workspaces.insert_one(doc)
    return ws

# ============ CLIP ENDPOINTS ============

@api_router.get("/clips", response_model=List[Clip])
async def get_clips(request: Request, session_token: Optional[str] = Cookie(None), workspace_id: Optional[str] = None):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    query = {"user_id": user_id}
    if workspace_id:
        query["workspace_id"] = workspace_id
    clips = await db.clips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for c in clips:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return clips

@api_router.post("/clips", response_model=Clip)
async def create_clip(clip: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    c = Clip(user_id=user_id, **clip)
    doc = c.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clips.insert_one(doc)
    return c

@api_router.delete("/clips/{clip_id}")
async def delete_clip(clip_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.clips.delete_one({"clip_id": clip_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clip not found")
    return {"message": "Deleted"}

# ============ NOTE ENDPOINTS ============

@api_router.get("/notes", response_model=List[Note])
async def get_notes(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    notes = await db.notes.find({"user_id": user_id}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    for n in notes:
        if isinstance(n.get('created_at'), str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
        if isinstance(n.get('updated_at'), str):
            n['updated_at'] = datetime.fromisoformat(n['updated_at'])
    return notes

@api_router.post("/notes", response_model=Note)
async def create_note(note: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    n = Note(user_id=user_id, **note)
    doc = n.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.notes.insert_one(doc)
    return n

@api_router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, note: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    note['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.notes.update_one(
        {"note_id": note_id, "user_id": user_id},
        {"$set": note}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    updated = await db.notes.find_one({"note_id": note_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Note(**updated)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.notes.delete_one({"note_id": note_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Deleted"}

# ============ TASK ENDPOINTS ============

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for t in tasks:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if t.get('due_date') and isinstance(t['due_date'], str):
            t['due_date'] = datetime.fromisoformat(t['due_date'])
    return tasks

@api_router.post("/tasks", response_model=Task)
async def create_task(task: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    t = Task(user_id=user_id, **task)
    doc = t.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('due_date'):
        doc['due_date'] = doc['due_date'].isoformat()
    await db.tasks.insert_one(doc)
    return t

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.tasks.update_one(
        {"task_id": task_id, "user_id": user_id},
        {"$set": task}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('due_date') and isinstance(updated['due_date'], str):
        updated['due_date'] = datetime.fromisoformat(updated['due_date'])
    return Task(**updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.tasks.delete_one({"task_id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Deleted"}

# ============ BOOKMARK ENDPOINTS ============

@api_router.get("/bookmarks", response_model=List[Bookmark])
async def get_bookmarks(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    bookmarks = await db.bookmarks.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for b in bookmarks:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
    return bookmarks

@api_router.post("/bookmarks", response_model=Bookmark)
async def create_bookmark(bookmark: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    b = Bookmark(user_id=user_id, **bookmark)
    doc = b.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookmarks.insert_one(doc)
    return b

@api_router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.bookmarks.delete_one({"bookmark_id": bookmark_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Deleted"}

# ============ HISTORY ENDPOINTS ============

@api_router.get("/history", response_model=List[BrowsingHistory])
async def get_history(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    history = await db.browsing_history.find({"user_id": user_id}, {"_id": 0}).sort("visited_at", -1).limit(100).to_list(100)
    for h in history:
        if isinstance(h.get('visited_at'), str):
            h['visited_at'] = datetime.fromisoformat(h['visited_at'])
    return history

@api_router.post("/history", response_model=BrowsingHistory)
async def add_history(history: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    h = BrowsingHistory(user_id=user_id, **history)
    doc = h.model_dump()
    doc['visited_at'] = doc['visited_at'].isoformat()
    await db.browsing_history.insert_one(doc)
    return h

@api_router.delete("/history")
async def clear_history(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    await db.browsing_history.delete_many({"user_id": user_id})
    return {"message": "History cleared"}

# ============ SETTINGS ENDPOINTS ============

@api_router.get("/settings", response_model=UserSettings)
async def get_settings(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        settings = UserSettings(user_id=user_id).model_dump()
        settings['updated_at'] = settings['updated_at'].isoformat()
        await db.user_settings.insert_one(settings)
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return UserSettings(**settings)

@api_router.put("/settings", response_model=UserSettings)
async def update_settings(settings: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    settings['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    updated = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return UserSettings(**updated)

# ============ FOCUS SESSION ENDPOINTS ============

@api_router.get("/focus_sessions", response_model=List[FocusSession])
async def get_focus_sessions(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    sessions = await db.focus_sessions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for s in sessions:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return sessions

@api_router.put("/focus_sessions/{session_id}")
async def update_focus_session(session_id: str, updates: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    result = await db.focus_sessions.update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Updated"}

# ============ PAGE SUMMARIZER ENDPOINT ============

@api_router.post("/summarize_page")
async def summarize_page(request: Request, session_token: Optional[str] = Cookie(None)):
    """Summarize page content using AI"""
    user = await get_optional_user(request, session_token)
    user_id = user.user_id if user else get_guest_user_id()
    
    if 'ai_client' not in globals():
        raise HTTPException(status_code=503, detail="AI service not configured (A4F_API_KEY missing)")
    
    try:
        body = await request.json()
        page_url = body.get('url')
        page_content = body.get('content', '')
        page_title = body.get('title', 'Untitled Page')
        
        if not page_url and not page_content:
            raise HTTPException(status_code=400, detail="Either URL or content is required")
        
        # If only URL provided, fetch the content
        if page_url and not page_content:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                try:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                    }
                    resp = await client.get(page_url, headers=headers)
                    page_content = resp.text
                except Exception as e:
                    logging.error(f"Failed to fetch page content: {e}")
                    raise HTTPException(status_code=400, detail=f"Failed to fetch page content: {str(e)}")
        
        # Extract text content (basic HTML stripping)
        import re
        from html import unescape
        # Remove script and style elements
        page_content = re.sub(r'<script[^>]*>.*?</script>', '', page_content, flags=re.DOTALL | re.IGNORECASE)
        page_content = re.sub(r'<style[^>]*>.*?</style>', '', page_content, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', page_content)
        # Decode HTML entities
        text = unescape(text)
        # Clean up whitespace
        text = ' '.join(text.split())
        
        # Limit content length for API
        max_chars = 8000
        if len(text) > max_chars:
            text = text[:max_chars] + "..."
        
        prompt = f"""Summarize the following webpage content. Provide a concise summary with key points, main topics, and important information.

Title: {page_title}
URL: {page_url if page_url else 'N/A'}

Content:
{text}

Please provide:
1. A brief overview (2-3 sentences)
2. Key points (bulleted list)
3. Main topics discussed
4. Important details or takeaways

Format your response as JSON with this structure:
{{
  "summary": "Brief overview of the page",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "mainTopics": ["Topic 1", "Topic 2"],
  "takeaways": ["Takeaway 1", "Takeaway 2"],
  "wordCount": 0
}}

Return ONLY the JSON object, no markdown formatting."""

        response = ai_client.chat.completions.create(
            model=A4F_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        import json
        summary_data = json.loads(response_text)
        
        # Store summary in database (optional)
        summary_doc = {
            "summary_id": f"sum_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "url": page_url,
            "title": page_title,
            "summary": summary_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.page_summaries.insert_one(summary_doc)
        
        return summary_data
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error in summarize_page: {e}. Response: {response_text[:500]}")
        return JSONResponse(
            status_code=400,
            content={"error": "Failed to parse AI response", "raw_response": response_text[:500]}
        )
    except Exception as e:
        logging.error(f"Page summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ READER MODE ENDPOINT ============

@api_router.post("/reader_mode")
async def reader_mode(request: Request, session_token: Optional[str] = Cookie(None)):
    """Extract clean readable content from a webpage using AI"""
    user = await get_optional_user(request, session_token)
    
    try:
        body = await request.json()
        page_url = body.get('url')
        
        if not page_url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Handle localhost URLs
        is_localhost = 'localhost' in page_url.lower() or '127.0.0.1' in page_url
        if not page_url.startswith('http'):
            protocol = 'http://' if is_localhost else 'https://'
            page_url = protocol + page_url
        
        # Fetch page content
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
            try:
                resp = await client.get(page_url, headers=headers)
                html_content = resp.text
            except httpx.ConnectError:
                raise HTTPException(status_code=503, detail=f"Connection refused. Make sure the server at {page_url} is running.")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to fetch page: {str(e)}")
        
        # Extract readable content using AI
        if 'ai_client' in globals():
            import re
            from html import unescape
            
            # Basic cleanup
            html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
            html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
            
            # Limit HTML for AI processing
            html_sample = html_content[:12000]
            
            prompt = f"""Extract the main readable content from this HTML page. Return ONLY a JSON object with:
{{
  "title": "Page title",
  "content": "Clean readable text content with proper paragraphs separated by double newlines",
  "summary": "Brief summary in one sentence"
}}

HTML Content:
{html_sample}

Return ONLY the JSON, no markdown, no backticks."""
            
            try:
                response = ai_client.chat.completions.create(
                    model=A4F_MODEL,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                response_text = response.choices[0].message.content.strip()
                if response_text.startswith('```'):
                    lines = response_text.split('\n')
                    response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                    response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                import json
                reader_data = json.loads(response_text)
                return reader_data
            except Exception as e:
                logging.error(f"AI reader extraction failed: {e}, falling back to basic extraction")
        
        # Fallback to basic extraction (no BeautifulSoup needed)
        from html import unescape
        import re
        
        # Remove scripts and styles
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else 'Untitled'
        title = re.sub(r'<[^>]+>', '', title)
        title = unescape(title)
        
        # Remove nav, footer, header, aside
        html_content = re.sub(r'<nav[^>]*>.*?</nav>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<footer[^>]*>.*?</footer>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<header[^>]*>.*?</header>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<aside[^>]*>.*?</aside>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Try to extract main content areas
        article_match = re.search(r'<article[^>]*>(.*?)</article>', html_content, re.IGNORECASE | re.DOTALL)
        main_match = re.search(r'<main[^>]*>(.*?)</main>', html_content, re.IGNORECASE | re.DOTALL)
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.IGNORECASE | re.DOTALL)
        
        content_html = article_match.group(1) if article_match else (main_match.group(1) if main_match else (body_match.group(1) if body_match else html_content))
        
        # Extract paragraphs and headings
        paragraphs = []
        for tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']:
            matches = re.findall(rf'<{tag}[^>]*>(.*?)</{tag}>', content_html, re.IGNORECASE | re.DOTALL)
            for match in matches:
                text = re.sub(r'<[^>]+>', ' ', match)
                text = unescape(text)
                text = ' '.join(text.split())
                if len(text) > 20:
                    paragraphs.append(text)
        
        # If no paragraphs found, extract all text
        if not paragraphs:
            text = re.sub(r'<[^>]+>', ' ', content_html)
            text = unescape(text)
            text = ' '.join(text.split())
            paragraphs = [p.strip() for p in text.split('. ') if len(p.strip()) > 50]
        
        content = '\n\n'.join(paragraphs[:100])  # Limit to 100 paragraphs
        
        return {
            "title": title[:200],
            "content": content[:50000],  # Limit content
            "summary": f"Content extracted from {page_url}"
        }
        
    except Exception as e:
        logging.error(f"Reader mode error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ PROXY ENDPOINT ============

@api_router.get("/proxy")
async def proxy(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    
    # Handle localhost URLs - check if it's a localhost/127.0.0.1 URL
    is_localhost = 'localhost' in url.lower() or '127.0.0.1' in url or url.startswith('http://localhost') or url.startswith('https://localhost')
    
    if not url.startswith('http'):
        # Determine protocol based on whether it's localhost
        protocol = 'http://' if is_localhost else 'https://'
        url = protocol + url
    elif url.startswith('https://localhost') or url.startswith('https://127.0.0.1'):
        # Convert https localhost to http
        url = url.replace('https://', 'http://')
    
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        try:
            # Add some headers to mimic a browser
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
            
            resp = await client.get(url, headers=headers)
            
            content = resp.text
            # Simple base tag injection to help with relative links
            if "<head>" in content:
                content = content.replace("<head>", f'<head><base href="{url}">')
            elif "<html>" in content:
                content = content.replace("<html>", f'<html><head><base href="{url}"></head>')
                
            return Response(content=content, media_type=resp.headers.get("content-type", "text/html"))
        except httpx.ConnectError as e:
            error_msg = f"Connection refused. Make sure the server at {url} is running and accessible."
            return Response(
                content=f'<html><head><title>Connection Error</title></head><body style="font-family: Arial, sans-serif; padding: 40px; background: #1a1a1a; color: #fff;"><h1>Connection Error</h1><p>{error_msg}</p><p style="color: #888;">If you are trying to access localhost, ensure the server is running on the specified port.</p></body></html>',
                media_type="text/html",
                status_code=503
            )
        except httpx.TimeoutException:
            return Response(
                content='<html><head><title>Timeout</title></head><body style="font-family: Arial, sans-serif; padding: 40px; background: #1a1a1a; color: #fff;"><h1>Request Timeout</h1><p>The request to load the page took too long.</p></body></html>',
                media_type="text/html",
                status_code=504
            )
        except Exception as e:
            error_msg = str(e)
            return Response(
                content=f'<html><head><title>Error</title></head><body style="font-family: Arial, sans-serif; padding: 40px; background: #1a1a1a; color: #fff;"><h1>Error loading page</h1><p>{error_msg}</p></body></html>',
                media_type="text/html",
                status_code=500
            )

# ============ SUGGESTIONS PROXY ============

@api_router.get("/suggestions")
async def get_suggestions(q: str):
    """Proxy Google suggestions to avoid CORS"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={encodeURIComponent(q)}"
            response = await client.get(url, timeout=5.0)
            return response.json()
    except Exception as e:
        logging.error(f"Suggestions error: {e}")
        return [[], []]

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "DeepBrowser API", "status": "ok"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
