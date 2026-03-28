# World Token Factory

> *Describe your business. We decompose it into risk factors, then let you drill into each one — from a quick scan to a full intelligence brief.*

Built for the **Multimodal Frontier Hackathon**. World Token Factory treats every business as a **token factory** — taking attention and compute in, producing decisions and outputs. The core question it answers: *how many tokens does it cost to reduce the uncertainty that's putting your business at risk?*

---

## What It Does

1. **Describe your business** — free text, or pick a demo example
2. **Decompose** — AI breaks it into up to 5 business process steps, each with a set of risk factors
3. **Analyse** — run agents at three depth levels against a corpus of domain documents, maps, videos, and data files
4. **Inspect** — see precise risk metrics (failure rate, uncertainty, potential loss range) per factor, with source artifacts
5. **Watch the AI think** — a live agent thread panel shows the reasoning chain in real time as it runs

### The Two Demo Cases

| | Description |
|-|-------------|
| 🐭 **Lemming Farmers Inc.** | Humorous but structurally complete. Shows the system works on any business — including ones with existential cliff-proximity risk. |
| 🛢️ **Gulf Coast Oil Operator** | Serious. Every operational step carries real, quantifiable uncertainty. Shows the full depth of the analysis. |

---

## Key Concepts

### Token Factory

A business can be modelled as a factory that consumes tokens (attention, compute, research effort) and produces outputs (decisions, products, revenue). Uncertainty is expensive — not knowing something costs you either in bad decisions or in the tokens required to find out. World Token Factory makes that cost visible and lets you choose how much uncertainty to resolve.

### Two Separate Risk Metrics

Most risk tools collapse everything into one number. We don't.

- **Failure Rate** — given what we know, the probability of a bad outcome
- **Uncertainty** — how much we *don't* know (confidence in the failure rate itself)

A 5% failure rate with 80% uncertainty is very different from a 5% failure rate with 10% uncertainty. The potential loss is always shown as a range — the width of that range is itself the signal.

### Three Depth Levels

| Depth | Name | What runs | Token cost |
|-------|------|-----------|------------|
| 1 | Quick Scan | Filename matching only — fast orientation | ~150–800 |
| 2 | Research Brief | Agent reads source files, synthesises findings, identifies gaps | ~1,500–8,000 |
| 3 | Deep Run | Iterative autoresearch loop + Gemini multimodal — full corpus | ~8,000–100,000+ |

### The Autoresearch Loop (Depth 3)

Depth 3 uses an iterative optimization loop inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch). Instead of minimizing validation loss, it minimizes `uncertainty_score` — the normalized width of the loss range:

```
uncertainty_score = (loss_range_high - loss_range_low) / $1B prior
```

Each iteration:
1. Runs 3–5 parallel analysis threads against the document corpus
2. Scores the result: how wide is the loss range? (lower = better)
3. Refines the research strategy via LLM: different threads, different keyword focus, different synthesis emphasis
4. Logs to `risk_iterations.tsv`
5. Emits `iteration_update` events so the frontend chart plots real uncertainty reduction

The chart's Y-axis shows the actual loss range narrowing in real time as iterations complete. That's the token factory concept made visible.

---

## Project Structure

```
WorldTokenFactory/
├── docs/
│   ├── frontend.md            # UI design spec
│   ├── backend.md             # Backend API, agents, data models
│   └── pitch.md               # Hackathon pitch narrative
├── repo_src/
│   ├── frontend/              # React + TypeScript (Vite)
│   └── backend/
│       ├── agents/
│       │   ├── decomposer.py          # Business → steps + risk factors
│       │   ├── depth1.py              # Quick scan (filenames only)
│       │   ├── depth2.py              # Research brief (reads files)
│       │   ├── depth3.py              # Deep run (autoresearch loop)
│       │   ├── risk_evaluate.py       # uncertainty_score() — fixed evaluator
│       │   ├── risk_research_template.py  # STRATEGY dict — modified by loop agent
│       │   └── risk_program.md        # Instructions for the research loop agent
│       ├── models/
│       │   └── risk.py                # Pydantic: RiskMetrics, Artifact, AnalysisResult
│       └── services/
│           ├── data_source.py         # File access (local → GDrive later)
│           ├── token_counter.py       # Token tracking + estimates
│           ├── gemini_multimodal.py   # Gemini vision/audio/video scanning
│           └── youtube.py             # YouTube metadata resolution
├── data/
│   ├── oil/                   # Oil industry demo datasets
│   ├── lemming/               # Lemming farmers demo datasets
│   ├── geo/                   # PNG maps and geospatial overlays
│   └── shared/                # General risk reference docs
├── vendor/
│   └── autoresearch/          # git submodule — karpathy/autoresearch
│                              # Loop pattern adapted for risk research
└── risk_iterations.tsv        # Per-iteration uncertainty scores (written at runtime)
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run both frontend and backend
pnpm dev

# Or separately
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:8000
```

Data folder defaults to `./data/`. Override with `DATA_PATH` environment variable.

```bash
DATA_PATH=/path/to/data pnpm dev:backend
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI |
| Monorepo | Turborepo + pnpm |
| AI core | Gemini 1.5 Pro — multimodal, long context |
| Multimodal | Gemini for satellite imagery, video, audio analysis |
| Data source | Local `/data/` folder (Google Drive target) |
| Research loop | karpathy/autoresearch pattern (vendor submodule) |

Integration points are marked with `# Placeholder` comments. See [`docs/backend.md`](docs/backend.md) for the full map.

---

## Sponsor Integrations

| Sponsor | Integration |
|---------|------------|
| **Google DeepMind / Gemini** | Multimodal scan (imagery, video, audio), decomposition, research synthesis |
| **Assistant UI** | Live agent thread panel and chat interface |
| **DigitalOcean** | Backend inference hosting |

---

## Documentation

| Doc | Contents |
|-----|---------|
| [`docs/frontend.md`](docs/frontend.md) | UI layout, components, risk metrics display, artifact types, agent thread panel |
| [`docs/backend.md`](docs/backend.md) | API endpoints, agent design, autoresearch loop, stream events, placeholder map |
| [`docs/pitch.md`](docs/pitch.md) | Hackathon pitch narrative, one-liners, sponsor table, business model |

---

## Development

```bash
pnpm lint         # Lint frontend and backend
pnpm typecheck    # TypeScript type checking
pnpm test         # Run all tests
pnpm ci           # Full CI pipeline
```
