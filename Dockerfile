FROM python:3.12-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r repo_src/backend/requirements.txt

# Default to SQLite if no DATABASE_URL is set
ENV DATABASE_URL=sqlite:///./wtf.db
ENV PORT=8080

EXPOSE 8080
CMD ["uvicorn", "repo_src.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
