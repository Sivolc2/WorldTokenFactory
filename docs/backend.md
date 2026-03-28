# World Token Factory — Backend Design Document

## Overview

The backend is a lightweight API server responsible for three things:
1. Decomposing a business description into a flow of steps and risk factors
2. Running analysis agents at varying depth levels against a local data folder
3. Serving file metadata and media assets to the frontend

The architecture is designed to be swapped out incrementally — local folder becomes Google Drive, stub responses become Gemini calls, filename matching becomes vector RAG. Every placeholder is marked clearly.

---

## Tech Stack

- **Runtime:** Python (FastAPI) — async-friendly, easy to add streaming responses
- **AI calls:** Placeholder stubs now → Gemini API later
- **Data source:** Local `/data/` folder now → Google Drive later
- **Vector store:** Not used yet → Gemini RAG / embedding search later
- **Token counting:** Tracked per-request and accumulated in session

---

## Folder Structure

```
WorldTokenFactory/
├── docs/
│   ├── frontend.md
│   └── backend.md
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── routes/
│   │   ├── decompose.py     # POST /decompose
│   │   ├── analyse.py       # POST /analyse
│   │   ├── files.py         # GET /files
│   │   └── media.py         # GET /media/{filename}
│   ├── agents/
│   │   ├── decomposer.py    # Business → steps + risk factors
│   │   ├── depth1.py        # Quick scan agent
│   │   ├── depth2.py        # Research brief agent
│   │   └── depth3.py        # Deep run / parallelized agent
│   ├── services/
│   │   ├── data_source.py   # Local folder access (→ GDrive later)
│   │   ├── token_counter.py # Track token usage
│   │   └── youtube.py       # Fetch YouTube metadata
│   └── models/
│       ├── business.py      # Pydantic models for request/response
│       └── risk.py          # Risk factor, metrics, artifact types
├── data/
│   ├── oil/                 # Oil industry demo datasets
│   ├── lemming/             # Lemming farmers demo datasets
│   ├── geo/                 # PNG maps, shapefiles, geo overlays
│   └── shared/              # General risk reference docs
└── frontend/                # Frontend app (separate doc)
```

---

## Data Folder Convention

All source data lives under `/data/`. At Depth 1, the backend only reads filenames — no file content is accessed. At Depth 2+, file content is read and passed to the agent.

```
/data/
  /oil/
    pipeline_integrity_2023.pdf
    gulf_subsidence_report.md
    offshore_hurricane_exposure.pdf
    regulatory_compliance_2022.md
    ...
  /lemming/
    lemming_habitat_survey.md
    cliff_proximity_analysis.png
    predator_population_data.csv
    arctic_climate_trends.pdf
    ...
  /geo/
    corridor_fault_map.png
    gulf_storm_tracks_2010_2023.png
    subsidence_heatmap.png
    ...
  /shared/
    risk_framework_reference.md
    financial_loss_modelling_guide.md
    ...
```

**File naming convention:** `{topic}_{descriptor}_{year_if_relevant}.{ext}`

YouTube links are stored as `.url` files containing just the URL:
```
/data/oil/colonial_pipeline_incident_analysis.url
  → https://youtube.com/watch?v=...
```

Audio files stored directly:
```
/data/oil/expert_interview_risk_jan2024.mp3
```

---

## API Endpoints

### POST /decompose

Takes a business description and returns a structured flow of steps, each with an initial set of risk factors (no analysis yet — just names and descriptions).

**Request:**
```json
{
  "description": "Oil company with offshore drilling in the Gulf of Mexico and pipeline infrastructure across Texas and Louisiana",
  "max_steps": 5
}
```

**Response:**
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
        {
          "id": "rf_1_1",
          "name": "Well Blowout Risk",
          "description": "Probability and impact of uncontrolled well release"
        },
        {
          "id": "rf_1_2",
          "name": "Seismic / Geological",
          "description": "Fault proximity and seismic activity near well sites"
        }
      ]
    }
  ],
  "tokens_used": 420
}
```

Steps are returned as a stream — each step object is emitted as it is generated, so the frontend can populate boxes progressively.

**Agent behaviour:**
- Calls decomposer agent with business description
- Agent returns up to 5 steps, each with 3–6 risk factors
- Risk factors at this stage have no metrics — just name + description

```python
# # Placeholder: replace stub with Gemini call
# Currently returns hardcoded structure for demo examples
# and a basic LLM call for free-text input
```

---

### POST /analyse

Runs an analysis agent on a specific risk factor at a specified depth. Returns summary, risk metrics, gaps, and artifact list.

**Request:**
```json
{
  "risk_factor_id": "rf_1_2",
  "risk_factor_name": "Seismic / Geological",
  "business_context": "Offshore oil operator, Gulf of Mexico, pipeline across Texas",
  "step_context": "Extraction — offshore drilling and well operations",
  "depth": 2,
  "data_domains": ["oil", "geo", "shared"]
}
```

**Response (streamed):**

The response streams as a series of typed events so the frontend can update the agent thread panel in real time:

```json
{ "event": "step", "text": "Scanning /data/oil/ for matches" }
{ "event": "file_found", "filename": "gulf_subsidence_report.md", "domain": "oil" }
{ "event": "file_found", "filename": "corridor_fault_map.png", "domain": "geo" }
{ "event": "step", "text": "Extracting risk signals" }
{ "event": "signal", "text": "Subsidence detected on 3 pipeline segments" }
{ "event": "signal", "text": "Last seismic survey: 2019 — data gap identified" }
{ "event": "step", "text": "Estimating failure probability" }
{ "event": "step", "text": "Generating loss range" }
{ "event": "complete", "result": { ... full result object ... } }
```

**Full result object:**
```json
{
  "risk_factor_id": "rf_1_2",
  "summary": "Seismic exposure along the eastern pipeline corridor is poorly characterised. The most recent independent survey dates to 2019, predating the 2022 seismic cluster events. Three segments show measurable subsidence that has not been formally assessed for pipeline integrity impact.",
  "gaps": [
    "No seismic survey data post-2021 events",
    "Subsidence on eastern segments uncharacterised",
    "Self-reported operator data — no independent verification"
  ],
  "metrics": {
    "failure_rate": 0.23,
    "uncertainty": 0.71,
    "loss_range_low": 4200000,
    "loss_range_high": 67000000,
    "loss_range_note": "Wide range driven by uncharacterised seismic exposure and outdated inspection data"
  },
  "artifacts": [
    {
      "filename": "pipeline_integrity_2023.pdf",
      "domain": "oil",
      "type": "document",
      "relevance": "Referenced for inspection history and segment data"
    },
    {
      "filename": "corridor_fault_map.png",
      "domain": "geo",
      "type": "image",
      "relevance": "Fault line proximity along pipeline corridor"
    },
    {
      "filename": "colonial_pipeline_incident_analysis.url",
      "domain": "oil",
      "type": "youtube",
      "url": "https://youtube.com/watch?v=...",
      "relevance": "Case study for similar infrastructure failure"
    }
  ],
  "tokens_used": 2140,
  "depth": 2
}
```

---

### GET /files

Scans the local data folder and returns all available files grouped by domain and type. Used by the frontend to display what data is available before analysis runs, and to support future manual artifact pinning.

**Response:**
```json
{
  "domains": {
    "oil": {
      "documents": ["pipeline_integrity_2023.pdf", "gulf_subsidence_report.md"],
      "images": ["corridor_fault_map.png"],
      "youtube": ["colonial_pipeline_incident_analysis.url"],
      "audio": ["expert_interview_risk_jan2024.mp3"],
      "data": ["subsidence_measurements_2022.csv"]
    },
    "geo": {
      "images": ["gulf_storm_tracks.png", "subsidence_heatmap.png"]
    },
    "lemming": {
      "documents": ["lemming_habitat_survey.md", "arctic_climate_trends.pdf"],
      "images": ["cliff_proximity_analysis.png"],
      "data": ["predator_population_data.csv"]
    }
  }
}
```

```python
# # Placeholder: replace local folder scan with Google Drive API list
```

---

### GET /media/{domain}/{filename}

Serves a file from the local data folder. Used by the frontend to render inline PNG previews and stream audio files.

- PNG/JPG: returned as image
- MP3/WAV: returned as audio stream with range support (for scrubbing)
- PDF/MD: returned as raw bytes (frontend can open in new tab)

```python
# # Placeholder: replace with Google Drive file fetch by ID
```

---

### GET /youtube-meta

Fetches thumbnail URL and title for a YouTube link, used by the frontend to render YouTube artifact cards.

**Request:** `?url=https://youtube.com/watch?v=...`

**Response:**
```json
{
  "title": "Colonial Pipeline Incident — Root Cause and Risk Lessons",
  "thumbnail_url": "https://img.youtube.com/vi/{id}/hqdefault.jpg",
  "url": "https://youtube.com/watch?v=..."
}
```

Thumbnail URL is constructed directly from the video ID (no API key required for thumbnail). Title uses oEmbed or YouTube Data API.

```python
# # Placeholder: add YouTube Data API key for reliable title resolution
```

---

## Agent Design

### Decomposer Agent (`agents/decomposer.py`)

Takes a free-text business description and returns a structured flow.

**Responsibilities:**
- Identify the primary value chain steps (max 5)
- For each step: generate a name, short description, and list of risk factors
- Risk factors should be specific to the business context, not generic

**Stub behaviour (Depth 0 / demo examples):**
- If input matches "lemming" → return hardcoded lemming structure
- If input matches "oil" → return hardcoded oil structure
- Otherwise → call LLM with decomposition prompt

```python
# # Placeholder: replace stub matching with Gemini call for all inputs
# # Placeholder: add streaming support so steps emit one by one
```

---

### Depth 1 Agent — Quick Scan (`agents/depth1.py`)

Filename-only analysis. Does not read file contents.

**Process:**
1. Receive risk factor name + business context + available domains
2. Scan filenames across relevant domains
3. Match filenames to the risk factor using keyword/semantic matching on the filename only
4. Return matched filenames as artifact list
5. Generate a stub summary based on risk factor name + matched filenames alone

**Output:** Summary (brief, low confidence), artifact list (filenames only), rough metrics (wide uncertainty range)

```python
# # Placeholder: filename semantic matching currently uses keyword overlap
# # Placeholder: replace with embedding similarity on filenames once vector store is available
# # Placeholder: summary generated from template — replace with Gemini call
```

---

### Depth 2 Agent — Research Brief (`agents/depth2.py`)

Reads file contents and synthesises a structured brief.

**Process:**
1. Run Depth 1 to get candidate files
2. Read content of matched files
3. Pass content + risk factor context to LLM
4. Extract: summary, gaps, failure rate estimate, uncertainty estimate, loss range
5. Identify which files were most relevant (for artifact relevance notes)
6. Stream reasoning steps back to frontend as events

**Output:** Full result object with metrics, gaps, and annotated artifacts

```python
# # Placeholder: file reading currently supports .md, .txt, .pdf (text extraction)
# # Placeholder: LLM call is a stub — replace with Gemini 1.5 Pro for long context
# # Placeholder: loss range estimation is heuristic — replace with Gemini grounded analysis
# # Placeholder: image files (PNG) not yet passed to LLM — replace with Gemini multimodal
```

---

### Depth 3 Agent — Deep Run (`agents/depth3.py`)

Parallelized multi-thread analysis. Designed for long-running, high-token jobs.

**Process:**
1. Decompose the risk factor into 3–5 sub-threads (e.g. historical data, regulatory, financial, geospatial)
2. Spin up parallel agent tasks, one per thread
3. Each thread runs independently against relevant file subsets
4. Emit progress events per thread as they complete
5. Synthesis agent combines thread outputs into final result
6. Track and report token usage per thread

**Output:** Deeper result with per-thread findings and synthesised conclusion. Token count significantly higher.

```python
# # Placeholder: parallelization is currently sequential with thread labels
# # Placeholder: replace with async parallel LLM calls once Gemini integration is in
# # Placeholder: synthesis step is a stub — replace with Gemini call over thread outputs
# # Placeholder: "24hr compute" estimate is static label — replace with dynamic token projection
```

---

## Services

### Data Source Service (`services/data_source.py`)

Single interface for all file access. Swap the implementation without changing agent code.

**Interface:**
```python
list_files(domain: str) -> list[FileMetadata]
read_file(domain: str, filename: str) -> str | bytes
file_exists(domain: str, filename: str) -> bool
```

**Current implementation:** reads from local `/data/` directory

```python
# # Placeholder: add GoogleDriveDataSource implementation
# # Placeholder: map domain names to Google Drive folder IDs
# # Placeholder: add caching layer for frequently accessed files
```

---

### Token Counter Service (`services/token_counter.py`)

Tracks token usage per analysis and globally across a session.

**Interface:**
```python
record(request_id: str, tokens: int, depth: int)
get_total() -> int
get_by_request(request_id: str) -> int
estimate(depth: int, file_count: int) -> tuple[int, int]  # (low, high)
```

Estimates shown to user before they run an analysis are generated by `estimate()` based on depth level and number of matched files.

```python
# # Placeholder: estimates are currently fixed ranges per depth tier
# # Placeholder: replace with model-aware token projection based on actual content length
```

---

### YouTube Service (`services/youtube.py`)

Resolves YouTube URLs to metadata. Thumbnail extracted from video ID directly (no API key needed). Title uses oEmbed endpoint.

```python
# # Placeholder: add YouTube Data API v3 key for reliable title + description
# # Placeholder: cache resolved metadata to avoid repeated fetches
```

---

## Data Models (`models/`)

### Risk Factor
```
id: str
name: str
description: str
step_id: str
```

### Risk Metrics
```
failure_rate: float          # 0.0 – 1.0
uncertainty: float           # 0.0 – 1.0
loss_range_low: int          # USD
loss_range_high: int         # USD
loss_range_note: str         # plain language explanation of the range width
```

### Artifact
```
filename: str
domain: str
type: "document" | "image" | "youtube" | "audio" | "data"
relevance: str               # one line, why this file was used
url: str | None              # only for youtube type
```

### Analysis Result
```
risk_factor_id: str
summary: str
gaps: list[str]
metrics: RiskMetrics
artifacts: list[Artifact]
tokens_used: int
depth: int
```

### Stream Event
```
event: "step" | "file_found" | "signal" | "complete" | "error"
text: str | None
filename: str | None
domain: str | None
result: AnalysisResult | None   # only on "complete"
```

---

## Placeholder Summary

All placeholders in one place for the integrations team:

| Location | Placeholder | Replace with |
|----------|-------------|-------------|
| `agents/decomposer.py` | Stub matching on "oil" / "lemming" | Gemini call for all inputs |
| `agents/decomposer.py` | Sequential step emission | Streaming response |
| `agents/depth1.py` | Keyword filename matching | Embedding similarity |
| `agents/depth1.py` | Template summary | Gemini call |
| `agents/depth2.py` | File reading (text only) | Gemini multimodal (images too) |
| `agents/depth2.py` | LLM call stub | Gemini 1.5 Pro |
| `agents/depth2.py` | Heuristic loss range | Gemini grounded analysis |
| `agents/depth3.py` | Sequential threads | Async parallel Gemini calls |
| `agents/depth3.py` | Static 24hr estimate | Dynamic token projection |
| `services/data_source.py` | Local folder reads | Google Drive API |
| `services/token_counter.py` | Fixed range estimates | Model-aware projection |
| `services/youtube.py` | oEmbed title only | YouTube Data API v3 |
| All agents | No RAG | Gemini RAG / vector search |

---

## Running Locally

```bash
cd WorldTokenFactory/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Data folder expected at `../data/` relative to the backend directory. Override with `DATA_PATH` environment variable.

```bash
DATA_PATH=/path/to/your/data uvicorn main:app --reload
```
