---
name: world-token-factory
description: >-
  Call the World Token Factory API to run geospatial risk assessments on any business.
  Decomposes businesses into operational steps, identifies risk factors, and runs
  multi-depth AI analysis returning structured risk tokens with failure rates,
  uncertainty scores, loss ranges, and cited evidence.
version: 2.0.0
license: MIT
---

# World Token Factory — Risk Assessment Skill

Use this skill to assess geospatial and operational risk for any business via the World Token Factory API.

## Base URL

```
https://king-prawn-app-kbwtp.ondigitalocean.app
```

## Authentication

Pass an API key via `X-API-Key` header. Get a key from the World Token Factory dashboard.

```
X-API-Key: your_key_here
```

## Endpoints

### 1. Decompose a Business

Break any business into operational steps and risk factors.

```
POST /api/decompose
Content-Type: application/json

{
  "description": "Gulf Coast oil pipeline operator focused on Permian Basin extraction",
  "max_steps": 5
}
```

**Response**: NDJSON stream of steps, each with risk factors and initial metrics (failure_rate, uncertainty, loss_range).

### 2. Analyse a Risk Factor

Run AI analysis on a specific risk factor at three depth levels.

```
POST /api/analyse
Content-Type: application/json

{
  "risk_factor_id": "rf_1_1",
  "risk_factor_name": "ERCOT Grid Failure Risk",
  "business_context": "Gulf Coast Oil Operator",
  "step_context": "Permian Field Operations",
  "depth": 2,
  "data_domains": ["oil"]
}
```

**Depth levels**:
- `1` — Quick Scan: filename matching, ~350 tokens, instant
- `2` — Research Brief: reads source docs + Senso RAG, ~3k tokens, 30-60 seconds
- `3` — Deep Run: parallel agents, multimodal (GeoTIFF, PDF, video), ~200k tokens

**Response**: NDJSON stream with events: `step`, `signal`, `file_found`, `token_update`, `complete`.

### 3. Orchestrated Analysis (Full Pipeline)

Fan out to all data sources in parallel, synthesize with model-routed LLM.

```
POST /api/orchestrate/analyse
Content-Type: application/json

{
  "business_name": "Gulf Coast Oil Operator",
  "step_name": "Permian Field Operations",
  "risk_factor_name": "ERCOT Grid Failure Risk",
  "risk_factor_description": "Power curtailment to field compressors during ERCOT stress events",
  "domain": "oil",
  "lat": 31.5,
  "lng": -102.5,
  "depth": 2
}
```

**What it does**:
- Queries Senso RAG knowledge base for regulatory context
- Fetches live weather from Open-Meteo at the coordinates
- Searches local multimodal artifact catalog (DEMs, satellite imagery, PDFs, video)
- Checks Nexla data pipeline status
- Routes to optimal model via the DO Gradient model router (39 models)
- Synthesizes with reasoning chain + cited evidence sources

**Response**: NDJSON stream with reasoning chain, evidence sources, risk metrics.

### 4. Chat

Conversational risk assessment interface.

```
POST /api/chat
Content-Type: application/json

{
  "prompt": "What are the top 3 risks for a warehouse near the Mississippi River?",
  "system_message": "You are a World Token Factory risk analyst.",
  "max_tokens": 2048,
  "temperature": 0.3
}
```

### 5. Model Route Preview

See which AI model would be selected for a given prompt.

```
POST /api/model-route
Content-Type: application/json

{
  "prompt": "Assess seismic risk for Permian Basin pipeline infrastructure",
  "system_message": "risk analysis"
}
```

**Response**: `{ "task_type": "geospatial", "selected_model": "kimi-k2.5", "reason": "..." }`

### 6. System Health

```
GET /api/health
GET /api/sponsor-status
GET /api/orchestrate/systems
GET /api/models
```

## Risk Token Schema

Every analysis produces a structured Risk Token:

```json
{
  "risk_factor_id": "rf_1_1",
  "summary": "Cited analysis with specific numbers...",
  "gaps": ["Specific knowledge gap 1", "Gap 2"],
  "metrics": {
    "failure_rate": 0.22,
    "uncertainty": 0.76,
    "loss_range_low": 48000000,
    "loss_range_high": 360000000,
    "loss_range_note": "Wide range reflects ERCOT event duration uncertainty"
  },
  "artifacts": [
    {"filename": "permian_basin_risk_brief.md", "type": "document", "relevance": "..."}
  ],
  "tokens_used": 3200,
  "depth": 2
}
```

**Key insight**: `failure_rate` and `uncertainty` are SEPARATE metrics. A 5% failure rate with 80% uncertainty is very different from 5% with 10% uncertainty. The width of the loss range is itself a signal about information quality.

## Example: Assess Any Business

```python
import httpx

API = "https://king-prawn-app-kbwtp.ondigitalocean.app"
KEY = "your_unkey_api_key"

# Step 1: Decompose
r = httpx.post(f"{API}/api/decompose",
    headers={"X-API-Key": KEY, "Content-Type": "application/json"},
    json={"description": "Solar panel installation company in Florida"})

# Step 2: Analyse each risk factor
for step in r.json().get("steps", []):
    for rf in step["risk_factors"]:
        analysis = httpx.post(f"{API}/api/analyse",
            headers={"X-API-Key": KEY, "Content-Type": "application/json"},
            json={
                "risk_factor_id": rf["id"],
                "risk_factor_name": rf["name"],
                "business_context": "Solar installer, Florida",
                "step_context": step["name"],
                "depth": 2,
                "data_domains": ["general"]
            })
        print(f"{rf['name']}: {analysis.json()}")
```

## Powered By

Railtracks (agent orchestration) · Senso (RAG knowledge base) · Nexla (data pipelines) · DigitalOcean (hosting + Gradient AI inference) · Unkey (API key management) · Augment (code context) · Google Gemini (LLM) · assistant-ui (chat interface)
