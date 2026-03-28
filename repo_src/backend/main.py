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

app = FastAPI(title="AI-Friendly Repository Backend", version="1.0.0", lifespan=lifespan)

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

@app.get("/")
async def read_root():
    """A simple root endpoint to confirm the API is running."""
    return {"message": "Welcome to the Backend API. Database is initialized."}

@app.get("/api/hello")
async def read_hello():
    """A simple API endpoint to test connectivity."""
    return {"message": "Hello from FastAPI Backend!"}

# Example (commented out) CRUD endpoints would go here
# You would typically put these in separate router files (e.g., in an `api` or `routers` directory)
# and include them in the main app.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")), log_level=os.getenv("LOG_LEVEL", "info").lower())
