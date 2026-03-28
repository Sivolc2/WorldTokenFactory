# World Token Factory

> *Describe your business. We decompose it into risk factors, then let you drill into each one — from a quick scan to a full intelligence brief.*

Built for the **Multimodal Frontier Hackathon**. World Token Factory treats every business as a **token factory** — taking attention and compute in, producing decisions and outputs. The core question it answers: *how many tokens does it cost to reduce the uncertainty that's putting your business at risk?*

---

## What It Does

1. **Describe your business** — free text, or pick a demo example
2. **Decompose** — AI breaks it into up to 5 business process steps, each with a set of risk factors
3. **Analyse** — run agents at three depth levels against a corpus of domain documents, maps, videos, and data files
4. **Inspect** — see precise risk metrics (failure rate, uncertainty, potential loss range) per factor, with the source artifacts that back them up
5. **Watch the AI think** — a live agent thread panel shows the reasoning chain in real time

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

A 5% failure rate with 80% uncertainty is very different from a 5% failure rate with 10% uncertainty. The potential loss is always shown as a range — the width of that range is itself informative.

### Three Depth Levels

| Depth | Name | What runs |
|-------|------|-----------|
| 1 | Quick Scan | Filename matching only — fast orientation |
| 2 | Research Brief | Agent reads source files, synthesises findings, identifies gaps |
| 3 | Deep Run | Parallelized agents, extended reasoning, full corpus — long token run |

---

## Project Structure

```
WorldTokenFactory/
├── docs/
│   ├── frontend.md        # Full frontend design spec
│   ├── backend.md         # Backend API, agents, and placeholder map
│   └── pitch.md           # Hackathon pitch narrative
├── repo_src/
│   ├── frontend/          # React + TypeScript (Vite)
│   └── backend/           # Python FastAPI
├── data/
│   ├── oil/               # Oil industry demo datasets
│   ├── lemming/           # Lemming farmers demo datasets
│   ├── geo/               # PNG maps and geospatial overlays
│   └── shared/            # General risk reference docs
└── README.md
```

---

## Quick Start

```bash
# Install dependencies and set up environment
pnpm setup-project

# Run both frontend and backend
pnpm dev

# Or separately
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:8000
```

Data folder defaults to `./data/`. Override with `DATA_PATH` environment variable.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI |
| Monorepo | Turborepo + pnpm |
| AI (current) | Stub agents with placeholder responses |
| AI (target) | Gemini 1.5 Pro — multimodal, long context |
| Data (current) | Local `/data/` folder |
| Data (target) | Google Drive via Drive API |

All integration points are marked with `# Placeholder` comments in the backend code. See [`docs/backend.md`](docs/backend.md) for the full placeholder map.

---

## Sponsor Integrations

| Sponsor | Integration |
|---------|------------|
| **Google DeepMind / Gemini** | Core AI engine — multimodal analysis, decomposition, research agents |
| **Assistant UI** | Chat interface and live agent thread panel |
| **DigitalOcean** | Backend inference hosting |

---

## Documentation

| Doc | Contents |
|-----|---------|
| [`docs/frontend.md`](docs/frontend.md) | Full UI design: layout, components, risk metrics display, artifact types, agent thread panel, demo flow |
| [`docs/backend.md`](docs/backend.md) | API endpoints, agent design, services, data models, placeholder map |
| [`docs/pitch.md`](docs/pitch.md) | Hackathon pitch narrative, one-liners, business case |

---

## Development

```bash
pnpm lint         # Lint frontend and backend
pnpm typecheck    # TypeScript type checking
pnpm test         # Run all tests
pnpm e2e          # Playwright end-to-end tests
pnpm ci           # Full CI pipeline (lint + typecheck + test)
```
