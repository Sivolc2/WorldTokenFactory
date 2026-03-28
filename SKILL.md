---
name: world-token-factory
description: >-
  Geospatial risk assessment agent for any business. Decomposes businesses into
  operational steps, identifies risk factors, and runs multi-depth AI analysis
  using satellite data, weather APIs, regulatory documents, and financial models.
  Returns structured risk tokens with failure rates, uncertainty scores, and
  loss ranges backed by cited evidence.
version: 1.0.0
author: World Token Factory Team
tags:
  - risk-assessment
  - geospatial
  - multimodal
  - agents
  - business-intelligence
tools:
  - railtracks
  - senso
  - nexla
  - unkey
  - gemini
---

# World Token Factory — Agent Skill

## What This Skill Does

Treats any business as a **token factory** — consuming compute and attention to reduce uncertainty. Given a business description, it:

1. **Decomposes** the business into 3-5 operational steps with specific risk factors
2. **Analyses** each risk factor at three depth levels (quick scan → research brief → deep run)
3. **Returns structured risk tokens** with:
   - Failure rate (0-1, probability of bad outcome)
   - Uncertainty (0-1, confidence in the failure rate)
   - Loss range (USD, width indicates information quality)
   - Evidence artifacts (documents, maps, data files)
   - Knowledge gaps (what's unknown and what it would cost to find out)

## API Endpoints

```
POST /api/decompose     — Decompose business into steps + risk factors
POST /api/analyse       — Run risk analysis at depth 1/2/3
POST /api/chat          — Conversational risk assessment
GET  /api/railtracks/status  — Check Railtracks agent availability
POST /api/railtracks/analyse — Run Railtracks fan-out analysis
GET  /api/nexla/status  — Check Nexla data pipeline status
GET  /api/sponsor-status — Check all sponsor tool integrations
```

## Authentication

API endpoints are gated by Unkey API keys. Pass `X-API-Key` header:
```
curl -X POST https://your-deploy.ondigitalocean.app/api/decompose \
  -H "X-API-Key: your_unkey_key" \
  -H "Content-Type: application/json" \
  -d '{"description": "Gulf Coast oil pipeline operator"}'
```

## Agent Architecture (Railtracks)

```
QueryDecomposer (Gemini Flash)
       │
       ├── search_risk_data      → Senso RAG knowledge base
       ├── fetch_geospatial_context → Open-Meteo weather API
       └── calculate_risk_metrics   → Validation + scoring
       │
       ▼
  RiskSynthesizer (Gemini Pro) → Structured RiskToken output
```

## Sponsor Tools Used

| Tool | Role |
|------|------|
| Railtracks | Multi-agent orchestration |
| Google Gemini | LLM inference (2.5 Flash + Pro) |
| Senso | RAG knowledge base for risk/regulatory docs |
| Nexla | Geospatial data pipeline |
| DigitalOcean | Deployment (App Platform) |
| Unkey | API key management + credit metering |
| Augment Code | Development acceleration (MCP) |
| assistant-ui | Chat interface components |

## Quick Start

```bash
git clone https://github.com/Sivolc2/WorldTokenFactory
cd WorldTokenFactory
pnpm install
pip install -r repo_src/backend/requirements.txt
cp .env.defaults .env  # Add your API keys
pnpm dev
```
