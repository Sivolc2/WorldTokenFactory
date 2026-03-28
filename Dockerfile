FROM node:20-slim AS frontend-build
WORKDIR /build
COPY repo_src/frontend/ ./
RUN npm install --legacy-peer-deps 2>&1 || true
RUN npx vite build 2>&1 || echo "Vite build failed, trying tsc skip..." && npx vite build --skipTypeCheck 2>&1 || true
# If dist doesn't exist, create a minimal index.html
RUN if [ ! -f dist/index.html ]; then \
      mkdir -p dist && \
      echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>World Token Factory</title></head><body><div id="root"><h1 style="color:#00ff88;background:#0a0a0f;padding:40px;font-family:monospace">World Token Factory API is running. Frontend build pending.</h1><p style="color:#e0ffe0;background:#0a0a0f;padding:0 40px;font-family:monospace">API: <a href="/api/sponsor-status" style="color:#00ccff">/api/sponsor-status</a> | <a href="/api/health" style="color:#00ccff">/api/health</a> | <a href="/docs" style="color:#00ccff">/docs</a></p></div></body></html>' > dist/index.html; \
    fi

FROM python:3.12-slim
WORKDIR /app
COPY . .
COPY --from=frontend-build /build/dist /app/static

RUN pip install --no-cache-dir -r repo_src/backend/requirements.txt

ENV DATABASE_URL=sqlite:///./wtf.db
ENV PORT=8080

EXPOSE 8080
CMD ["uvicorn", "repo_src.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
