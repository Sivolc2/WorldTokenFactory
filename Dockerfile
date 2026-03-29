FROM node:20-slim AS frontend-build
WORKDIR /build
COPY repo_src/frontend/ ./
RUN npm install --legacy-peer-deps 2>&1 || true
RUN npx vite build 2>&1 || true
RUN if [ ! -f dist/index.html ]; then \
      mkdir -p dist/assets && \
      echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>World Token Factory</title><style>body{margin:0;background:#0a0a0f;color:#e0ffe0;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}a{color:#00ccff}.c{text-align:center}h1{color:#00ff88;font-size:2em}p{opacity:0.7}</style></head><body><div class="c"><h1>WORLD TOKEN FACTORY</h1><p>Every business is a token factory</p><p style="margin-top:2em"><a href="/api/sponsor-status">/api/sponsor-status</a> · <a href="/api/health">/api/health</a> · <a href="/docs">/docs</a></p></div></body></html>' > dist/index.html; \
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
