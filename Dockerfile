FROM node:20-slim AS frontend-build
WORKDIR /app/repo_src/frontend
COPY repo_src/frontend/package.json repo_src/frontend/package-lock.json* ./
RUN npm install
COPY repo_src/frontend/ ./
ENV VITE_API_URL=""
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY . .
COPY --from=frontend-build /app/repo_src/frontend/dist /app/static

RUN pip install --no-cache-dir -r repo_src/backend/requirements.txt

ENV DATABASE_URL=sqlite:///./wtf.db
ENV PORT=8080

EXPOSE 8080
CMD ["uvicorn", "repo_src.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
