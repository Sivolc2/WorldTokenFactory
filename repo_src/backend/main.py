from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager

# Load environment variables from .env file if it exists
# This is particularly useful for local development.
# In production, environment variables should be set through the deployment environment.

# Determine the directory of the current file (main.py)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the .env file relative to main.py
env_path_backend = os.path.join(current_dir, '.env')

# Construct the path to the .env file in the project root (if applicable)
project_root_env = os.path.join(current_dir, '..', '..', '.env') # Assuming repo_src/backend/main.py

if os.path.exists(env_path_backend):
    print(f"Loading environment variables from: {env_path_backend}")
    load_dotenv(dotenv_path=env_path_backend)
elif os.path.exists(project_root_env) and os.path.basename(os.getcwd()) != "backend":
    # Only load project root .env if not already in backend (where local .env takes precedence)
    print(f"Loading environment variables from project root: {project_root_env}")
    load_dotenv(dotenv_path=project_root_env)
else:
    print("No .env file found in backend directory or project root, or backend/.env takes precedence. Relying on system environment variables.")

# Import database setup function AFTER loading env vars,
# as db connection might depend on them.
from repo_src.backend.database.setup import init_db
from repo_src.backend.database import models, connection # For example endpoints
from repo_src.backend.functions.items import router as items_router # Import the items router
from repo_src.backend.routers.chat import router as chat_router # Import the chat router
from repo_src.backend.routers.decompose import router as decompose_router
from repo_src.backend.routers.analyse import router as analyse_router
from repo_src.backend.routers.files import router as files_router
from repo_src.backend.routers.media import router as media_router
from repo_src.backend.routers.youtube_meta import router as youtube_meta_router
from repo_src.backend.routers.railtracks_route import router as railtracks_router
from repo_src.backend.routers.nexla_route import router as nexla_router
from repo_src.backend.routers.orchestrator_route import router as orchestrator_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    print("Application startup: Initializing database...")
    init_db() # Initialize database and create tables
    print("Application startup complete.")
    yield
    # Shutdown: Clean up resources if needed
    print("Application shutdown: Cleaning up resources...")
    # Any cleanup code would go here
    print("Application shutdown complete.")

app = FastAPI(title="World Token Factory", version="2.0.0", lifespan=lifespan)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items_router)
app.include_router(chat_router)
app.include_router(decompose_router)
app.include_router(analyse_router)
app.include_router(files_router)
app.include_router(media_router)
app.include_router(youtube_meta_router)
app.include_router(railtracks_router)
app.include_router(nexla_router)
app.include_router(orchestrator_router)

@app.get("/")
async def read_root():
    """A simple root endpoint to confirm the API is running."""
    return {"message": "Welcome to the Backend API. Database is initialized."}

@app.get("/api/hello")
async def read_hello():
    """A simple API endpoint to test connectivity."""
    return {"message": "Hello from World Token Factory!"}

@app.get("/api/sponsor-status")
async def sponsor_status():
    """Check which sponsor tool integrations are active."""
    from repo_src.backend.agents.railtracks_orchestrator import RAILTRACKS_AVAILABLE
    from repo_src.backend.services.augment_service import check_augment_status
    return {
        "gemini": bool(os.getenv("GEMINI_API_KEY")),
        "openrouter": bool(os.getenv("OPENROUTER_API_KEY")),
        "senso": bool(os.getenv("SENSO_API_KEY")),
        "unkey": bool(os.getenv("UNKEY_API_ID")),
        "nexla": bool(os.getenv("NEXLA_TOKEN")),
        "railtracks": RAILTRACKS_AVAILABLE,
        "digitalocean": True,
        "augment": check_augment_status(),
        "assistant_ui": True,
    }

@app.get("/api/models")
async def list_gradient_models():
    """List available DO Gradient models with routing metadata."""
    from repo_src.backend.services.model_router import list_available_models
    return {"models": list_available_models()}

@app.post("/api/model-route")
async def route_model_endpoint(request: dict):
    """Preview which model the router would select for a given prompt."""
    from repo_src.backend.services.model_router import route_model, detect_task_type, get_model_info
    prompt = request.get("prompt", "")
    system = request.get("system_message", "")
    task_type = detect_task_type(prompt, system)
    model_id, reason = route_model(prompt, system)
    return {
        "task_type": task_type,
        "selected_model": model_id,
        "reason": reason,
        "model_info": get_model_info(model_id),
    }

@app.get("/api/health")
async def health_check():
    """Comprehensive health check showing all integrated systems."""
    import httpx

    health = {
        "status": "ok",
        "version": "2.0.0",
        "systems": {}
    }

    # Gemini
    if os.getenv("GEMINI_API_KEY"):
        health["systems"]["gemini"] = {"status": "configured", "model": "gemini-2.5-flash"}

    # DO Gradient
    if os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY"):
        health["systems"]["gradient"] = {"status": "configured", "inference_url": "https://inference.do-ai.run/v1/"}

    # Senso
    senso_key = os.getenv("SENSO_API_KEY")
    if senso_key:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(
                    "https://apiv2.senso.ai/api/v1/org/credits/balance",
                    headers={"X-API-Key": senso_key},
                )
                health["systems"]["senso"] = {
                    "status": "connected" if r.status_code in (200, 202) else "error",
                    "credits": r.json() if r.status_code in (200, 202) else None,
                }
        except Exception:
            health["systems"]["senso"] = {"status": "timeout"}

    # Unkey
    if os.getenv("UNKEY_API_ID"):
        health["systems"]["unkey"] = {"status": "configured", "api_id": os.getenv("UNKEY_API_ID")}

    # Railtracks
    try:
        from repo_src.backend.agents.railtracks_orchestrator import RAILTRACKS_AVAILABLE
        health["systems"]["railtracks"] = {"status": "available" if RAILTRACKS_AVAILABLE else "not_installed"}
    except ImportError:
        health["systems"]["railtracks"] = {"status": "import_error"}

    # Model router
    try:
        from repo_src.backend.services.model_router import list_available_models
        models = list_available_models()
        health["systems"]["model_router"] = {"status": "ok", "models_available": len(models)}
    except ImportError:
        health["systems"]["model_router"] = {"status": "import_error"}

    return health


@app.post("/api/senso/ingest-all")
async def senso_ingest_all():
    """Batch ingest all local risk documents into Senso KB."""
    import httpx
    from pathlib import Path

    senso_key = os.getenv("SENSO_API_KEY", "")
    if not senso_key:
        return {"status": "error", "message": "SENSO_API_KEY not set"}

    data_root = Path(__file__).parent.parent.parent / "data"
    results = []

    async with httpx.AsyncClient(timeout=30) as client:
        for md_file in data_root.rglob("*.md"):
            if md_file.name == "README.md":
                continue
            title = md_file.stem.replace("_", " ").title()
            text = md_file.read_text(encoding="utf-8")[:5000]
            r = await client.post(
                "https://apiv2.senso.ai/api/v1/org/kb/raw",
                headers={"X-API-Key": senso_key, "Content-Type": "application/json"},
                json={"title": title, "content": text},
            )
            results.append({
                "file": str(md_file.relative_to(data_root)),
                "title": title,
                "status": r.status_code,
                "id": r.json().get("id") if r.status_code in (200, 202) else None,
            })

    return {"ingested": len(results), "results": results}


@app.post("/api/senso/configure-brand")
async def senso_configure_brand():
    """Configure the Senso Brand Kit with the World Token Factory risk analyst persona."""
    from repo_src.backend.services.senso_service import senso_configure_brand_kit
    return await senso_configure_brand_kit()


@app.post("/api/senso/create-content-type")
async def senso_create_content_type():
    """Create a RiskToken content type in Senso for structured output."""
    from repo_src.backend.services.senso_service import senso_create_risk_token_content_type
    return await senso_create_risk_token_content_type()


@app.post("/api/augment/search")
async def augment_search(request: dict):
    """Use Augment Context Engine to semantically search the codebase."""
    from repo_src.backend.services.augment_service import augment_search_codebase
    return await augment_search_codebase(request.get("query", ""))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")), log_level=os.getenv("LOG_LEVEL", "info").lower())
