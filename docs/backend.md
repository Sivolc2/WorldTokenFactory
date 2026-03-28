# World Token Factory — Backend Design

## Overview

The backend is a FastAPI server responsible for three things:

1. Decomposing a business description into a flow of steps and risk factors
2. Running analysis agents at three depth levels against a local data folder
3. Serving file metadata and media assets to the frontend

All AI integration points are marked with `# Placeholder` comments. The architecture is designed for incremental swap-out: local folder → Google Drive, stub agents → Gemini calls.

---

## Folder Structure

```
repo_src/backend/
├── agents/
│   ├── decomposer.py              # Business → steps + risk factors
│   ├── depth1.py                  # Quick Scan (filenames only)
│   ├── depth2.py                  # Research Brief (reads files, synthesises)
│   ├── depth3.py                  # Deep Run (autoresearch iterative loop)
│   ├── risk_evaluate.py           # Fixed evaluator: uncertainty_score()
│   ├── risk_research_template.py  # Modifiable STRATEGY dict
│   ├── risk_program.md            # Loop agent instructions
│   ├── orchestrator.py            # Routes requests to correct depth agent
│   └── oil_canned.py              # Hardcoded oil demo structure (fast demo path)
├── models/
│   └── risk.py                    # Pydantic: RiskMetrics, Artifact, AnalysisResult, StreamEvent
├── services/
│   ├── data_source.py             # File access — list_files(), read_file(), list_domains()
│   ├── token_counter.py           # Token tracking + pre-run estimates
│   ├── gemini_multimodal.py       # Gemini vision/audio/video scanning
│   └── youtube.py                 # YouTube thumbnail + title resolution
├── routers/
│   └── youtube_meta.py            # GET /youtube-meta endpoint
└── llm_chat/
    └── llm_interface.py           # ask_llm() + gemini_client singleton
```

---

## Data Folder

All source data lives under `./data/` (override with `DATA_PATH` env var). Agents use `data_source.py` as the only interface — swap to Google Drive without changing agent code.

```
data/
  oil/
    pipeline_integrity_2023.pdf
    gulf_subsidence_report.md
    offshore_hurricane_exposure.pdf
    seismic_survey_2019.pdf
    colonial_pipeline_incident_analysis.url   ← YouTube link
    expert_interview_risk_jan2024.mp3
    ...
  lemming/
    lemming_habitat_survey.md
    cliff_proximity_analysis.png
    predator_population_data.csv
    arctic_climate_trends.pdf
    ...
  geo/
    corridor_fault_map.png
    gulf_storm_tracks_2010_2023.png
    subsidence_heatmap.png
    permian_basin_satellite.tif
    ...
  shared/
    risk_framework_reference.md
    financial_loss_modelling_guide.md
    ...
```

File types by extension:

| Extension | Type | Notes |
|-----------|------|-------|
| `.pdf`, `.md`, `.txt`, `.docx` | `document` | Text extracted at depth 2+ |
| `.png`, `.jpg`, `.jpeg`, `.webp` | `image` | Inline preview in frontend |
| `.tif`, `.tiff` | `document` | GeoTIFF — passed to Gemini multimodal |
| `.mp3`, `.wav`, `.m4a` | `audio` | Inline player in frontend |
| `.mp4`, `.mkv`, `.mov` | `video` | Gemini multimodal |
| `.csv`, `.json`, `.xlsx`, `.tsv` | `data` | Read as text at depth 2+ |
| `.url` | `youtube` | File contains a raw YouTube URL |

Subdirectories are scanned one level deep (e.g. `oil/artifacts/`).

---

## API Endpoints

### POST /decompose

Takes a business description, returns a structured flow of steps with initial risk factors. No analysis yet — just names and descriptions.

**Request:**
```json
{
  "description": "Oil company with offshore drilling in the Gulf of Mexico and pipeline across Texas",
  "max_steps": 5
}
```

**Response (streamed — one step object per line):**
```json
{
  "business_name": "Gulf Coast Oil Operator",
  "steps": [
    {
      "id": "step_1",
      "name": "Extraction",
      "description": "Offshore drilling and well operations",
      "position": 1,
      "risk_factors": [
        { "id": "rf_1_1", "name": "Well Blowout Risk", "description": "..." },
        { "id": "rf_1_2", "name": "Seismic / Geological", "description": "..." }
      ]
    }
  ],
  "tokens_used": 420
}
```

```python
# Placeholder: replace stub "oil"/"lemming" matching with Gemini call for all inputs
# Placeholder: stream steps one at a time as they are generated
```

---

### POST /analyse

Runs an analysis agent on a specific risk factor at a specified depth. Streams typed events back to the frontend.

**Request:**
```json
{
  "risk_factor_id": "rf_1_2",
  "risk_factor_name": "Seismic / Geological",
  "business_context": "Offshore oil operator, Gulf of Mexico, pipeline across Texas",
  "step_context": "Extraction — offshore drilling and well operations",
  "depth": 3,
  "data_domains": ["oil", "geo", "shared"],
  "feedback": "Focus more on induced seismicity from wastewater injection"
}
```

**Streamed events:**

```json
{ "event": "step", "text": "Scanning 3 domain(s) for filename matches" }
{ "event": "file_found", "filename": "seismic_survey_2019.pdf", "domain": "oil" }
{ "event": "step", "text": "Gemini multimodal scan (video, GeoTIFF, imagery)" }
{ "event": "signal", "text": "Multimodal: 2 visual/geo file(s) — corridor_fault_map.png, permian_basin_satellite.tif" }
{ "event": "step", "text": "[Iteration 1/3] Running research pass — strategy: Historical incident record, Regulatory compliance..." }
{ "event": "token_update", "tokens": 3200 }
{ "event": "iteration_update", "iteration": 1, "uncertainty_score": 0.63, "uncertainty_usd": 63000000, "loss_range_low": 4200000, "loss_range_high": 67200000, "tokens_so_far": 3200, "strategy_threads": ["Historical incident record", "Regulatory compliance status", "Geospatial exposure"] }
{ "event": "signal", "text": "[iter 1] No seismic survey data post-2021 events" }
{ "event": "step", "text": "[Iteration 1] Refining research strategy" }
{ "event": "signal", "text": "Strategy updated: Shifting to induced seismicity thread after user feedback" }
{ "event": "step", "text": "[Iteration 2/3] Running research pass — strategy: Induced seismicity risk, Regulatory compliance..." }
{ "event": "iteration_update", "iteration": 2, "uncertainty_score": 0.41, "uncertainty_usd": 41000000, ... }
{ "event": "step", "text": "Incorporating multimodal findings into final synthesis" }
{ "event": "complete", "result": { ... AnalysisResult ... } }
```

**Complete result object:**
```json
{
  "risk_factor_id": "rf_1_2",
  "summary": "Seismic exposure along the eastern pipeline corridor is poorly characterised...",
  "gaps": [
    "No seismic survey data post-2021 events",
    "Subsidence on eastern segments uncharacterised"
  ],
  "metrics": {
    "failure_rate": 0.23,
    "uncertainty": 0.71,
    "loss_range_low": 4200000,
    "loss_range_high": 41000000,
    "loss_range_note": "Range narrowed from $67M to $41M after induced seismicity thread"
  },
  "artifacts": [
    { "filename": "seismic_survey_2019.pdf", "domain": "oil", "type": "document", "relevance": "..." },
    { "filename": "corridor_fault_map.png", "domain": "geo", "type": "image", "relevance": "..." },
    { "filename": "colonial_pipeline_incident_analysis.url", "domain": "oil", "type": "youtube", "url": "https://...", "relevance": "..." }
  ],
  "tokens_used": 18400,
  "depth": 3
}
```

---

### GET /files

Returns all available files grouped by domain and type.

```json
{
  "domains": {
    "oil": {
      "documents": ["pipeline_integrity_2023.pdf", "gulf_subsidence_report.md"],
      "images": [],
      "youtube": ["colonial_pipeline_incident_analysis.url"],
      "audio": ["expert_interview_risk_jan2024.mp3"],
      "data": ["subsidence_measurements_2022.csv"]
    }
  }
}
```

```python
# Placeholder: replace local folder scan with Google Drive API list
# Placeholder: map domain names to Google Drive folder IDs
```

---

### GET /media/{domain}/{filename}

Serves a file from the data folder. Used for inline PNG previews and audio streaming.

```python
# Placeholder: replace with Google Drive file fetch by ID
```

---

### GET /youtube-meta

Fetches thumbnail URL and title for a YouTube link.

**Request:** `?url=https://youtube.com/watch?v=...`

```json
{
  "title": "Colonial Pipeline Incident — Root Cause and Risk Lessons",
  "thumbnail_url": "https://img.youtube.com/vi/{id}/hqdefault.jpg",
  "url": "https://youtube.com/watch?v=..."
}
```

Thumbnail URL is derived from video ID (no API key). Title uses oEmbed.

```python
# Placeholder: add YouTube Data API v3 key for reliable title + description
```

---

## Agent Design

### Decomposer (`agents/decomposer.py`)

Takes free-text business description → structured flow of up to 5 steps with risk factors.

- If input matches "lemming" → hardcoded lemming structure (fast demo path)
- If input matches "oil" → `oil_canned.py` hardcoded structure (fast demo path)
- Otherwise → LLM call with decomposition prompt

```python
# Placeholder: replace stub matching with Gemini call for all inputs
# Placeholder: add streaming so steps emit one by one as generated
```

---

### Depth 1 — Quick Scan (`agents/depth1.py`)

Filename-only analysis. Does not read file contents.

**Process:**
1. Extract keywords from risk factor name + business context
2. Scan filenames across specified domains
3. Score each file by keyword overlap with filename
4. Return top 8 matches as artifacts
5. Generate summary from template (no LLM call)
6. Return wide uncertainty metrics (depth-1 baseline)

**Output:** Summary (low confidence), 8 artifact filenames, metrics with `uncertainty=0.80`

```python
# Placeholder: keyword overlap → embedding similarity on filenames
# Placeholder: template summary → Gemini call
```

---

### Depth 2 — Research Brief (`agents/depth2.py`)

Reads file contents and synthesises a structured brief.

**Process:**
1. Run Depth 1 to get candidate files
2. Read content of matched files (truncated at 3,000 chars each)
3. Call LLM with content + risk factor context
4. Extract: summary, gaps, failure rate, uncertainty, loss range
5. Identify most relevant files for artifact relevance notes

```python
# Placeholder: image files (PNG) not yet passed to LLM — replace with Gemini multimodal
# Placeholder: LLM call → Gemini 1.5 Pro long-context
# Placeholder: loss range estimation is heuristic → Gemini grounded analysis
```

---

### Depth 3 — Deep Run (`agents/depth3.py`)

Iterative autoresearch-style loop. Designed for long-running, high-token jobs.

**The loop (inspired by karpathy/autoresearch):**

```
Objective: minimize uncertainty_score = (loss_high - loss_low) / $1B
```

1. Run Depth 1 to get candidate files + Gemini multimodal scan
2. Read all matching documents once (shared across iterations)
3. For each iteration (default: 3):
   a. Run `_run_single_pass()` — 3–5 analysis threads + synthesis
   b. Score the result with `risk_evaluate.uncertainty_score()`
   c. Emit `iteration_update` event (drives the frontend TokenEfficiencyChart)
   d. Log to `risk_iterations.tsv`
   e. Check stopping criteria (score < 0.05, plateau < 0.01 Δ, max iterations)
   f. Call LLM with current strategy + results → updated STRATEGY dict
4. Final synthesis incorporating multimodal findings from best-scoring iteration

**Stopping criteria:** score < 0.05 (converged), Δ < 0.01 over last 2 iterations, or `max_iterations` reached.

**Key files:**

| File | Role | Analogy to autoresearch |
|------|------|------------------------|
| `risk_evaluate.py` | Fixed scorer — `uncertainty_score()` | `prepare.py` / `val_bpb` |
| `risk_research_template.py` | Modifiable `STRATEGY` dict | `train.py` |
| `risk_program.md` | Instructions for the loop agent | `program.md` |
| `risk_iterations.tsv` | Per-iteration score log | `results.tsv` |

**`iteration_update` event** (drives the frontend chart):
```json
{
  "event": "iteration_update",
  "iteration": 2,
  "uncertainty_score": 0.41,
  "uncertainty_usd": 41000000,
  "loss_range_low": 4200000,
  "loss_range_high": 45200000,
  "tokens_so_far": 12400,
  "strategy_threads": ["Induced seismicity", "Regulatory gaps", "Financial modelling"]
}
```

```python
# Placeholder: _run_single_pass() threads run sequentially → async parallel with asyncio.gather
# Placeholder: dynamic max_iterations based on remaining token budget
# Placeholder: strategy refinement → Gemini call with long context of all previous iterations
```

---

### Gemini Multimodal (`services/gemini_multimodal.py`)

Selects and scans visual/geo/video files using Gemini's multimodal capability.

- Runs once per Depth 3 analysis (not per iteration)
- Selects up to 6 files from matched artifacts (prioritises GeoTIFF, video, PNG)
- Findings fed into the final synthesis step
- Gated on `gemini_client is not None` — skipped if no API key

```python
# Placeholder: gemini_client currently None — wire GEMINI_API_KEY env var
# Placeholder: select_multimodal_files() prioritisation heuristic → improve with content-aware selection
```

---

## Data Models (`models/risk.py`)

### RiskMetrics
```python
failure_rate: float          # 0.0–1.0  probability of bad outcome
uncertainty: float           # 0.0–1.0  confidence in the failure rate
loss_range_low: int          # USD
loss_range_high: int         # USD
loss_range_note: str         # why the range is wide or narrow
```

### Artifact
```python
filename: str
domain: str
type: Literal["document", "image", "youtube", "audio", "data", "video"]
relevance: str               # one line — why this file was used
url: str | None              # only for youtube type
```

### AnalysisResult
```python
risk_factor_id: str
summary: str
gaps: list[str]
metrics: RiskMetrics
artifacts: list[Artifact]
tokens_used: int
depth: int                   # 1, 2, or 3
```

### StreamEvent types

| event | Fields |
|-------|--------|
| `step` | `text` — human-readable progress label |
| `file_found` | `filename`, `domain` |
| `signal` | `text` — notable finding or gap |
| `token_update` | `tokens` — cumulative token count |
| `iteration_update` | `iteration`, `uncertainty_score`, `uncertainty_usd`, `loss_range_low`, `loss_range_high`, `tokens_so_far`, `strategy_threads` |
| `complete` | `result` — full AnalysisResult |
| `error` | `text` — error message |

---

## Token Counting

`services/token_counter.py` tracks usage per-request and session-wide.

```python
counter.record(request_id, tokens, depth)
counter.get_total() -> int
counter.estimate(depth, file_count) -> (low, high)  # shown before run
```

Estimates by depth tier:

| Depth | Base range | Additional |
|-------|-----------|-----------|
| 1 | 200–800 | — |
| 2 | 1,500–4,000 | +300 tokens per matched file |
| 3 | 8,000–25,000 | +600 tokens per file × iterations |

```python
# Placeholder: fixed ranges → model-aware projection based on actual content length
```

---

## Placeholder Summary

All integration points in one place:

| File | Placeholder | Replace with |
|------|-------------|-------------|
| `agents/decomposer.py` | Stub demo matching | Gemini call for all inputs |
| `agents/decomposer.py` | Batch step response | Streaming steps |
| `agents/depth1.py` | Keyword filename matching | Embedding similarity |
| `agents/depth1.py` | Template summary | Gemini call |
| `agents/depth2.py` | Text-only file reading | Gemini multimodal (images too) |
| `agents/depth2.py` | LLM stub | Gemini 1.5 Pro |
| `agents/depth3.py` | Sequential threads | `asyncio.gather` parallel calls |
| `agents/depth3.py` | Fixed max_iterations=3 | Dynamic based on token budget |
| `agents/depth3.py` | Strategy refinement | Gemini long-context call over all iterations |
| `services/gemini_multimodal.py` | `gemini_client=None` | Wire `GEMINI_API_KEY` env var |
| `services/data_source.py` | Local folder reads | Google Drive API |
| `services/token_counter.py` | Fixed range estimates | Model-aware projection |
| `services/youtube.py` | oEmbed title only | YouTube Data API v3 |

---

## Running Locally

```bash
cd repo_src/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Data folder expected at `../../../data/` relative to the backend source directory. Override:

```bash
DATA_PATH=/path/to/data uvicorn main:app --reload
```

Environment variables:

| Var | Purpose |
|-----|---------|
| `DATA_PATH` | Override default data folder location |
| `GEMINI_API_KEY` | Enable Gemini multimodal scan in Depth 3 |
| `OPENROUTER_API_KEY` | Alternative LLM provider for `ask_llm()` |
