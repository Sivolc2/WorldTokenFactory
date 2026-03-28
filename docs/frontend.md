# World Token Factory — Frontend Design Document

## Concept

The UI presents a business as a flow of up to 5 steps, each colored by risk level. Users drill into any step to see decomposed risk factors, run agents at varying depths, and inspect the evidence (artifacts) behind each analysis. A live agent thread panel shows reasoning in real time — a key demo moment for hackathon audiences.

---

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP BAR                                                            │
│  [Business Name]                    Tokens: 14,320    [Run All ▶]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BUSINESS FLOW CHART  (main view)                                   │
│                                                                     │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   │
│  │  Step  │──▶│  Step  │──▶│  Step  │──▶│  Step  │──▶│  Step  │   │
│  │   1    │   │   2    │   │   3    │   │   4    │   │   5    │   │
│  └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                          ┌─────────┐│
│  RISK FACTOR DETAIL  (selected step)           AGENT    │ AGENT   ││
│                                                THREAD   │ THREAD  ││
│  Risk factors list + analysis + artifacts      PANEL    │ PANEL   ││
│                                                (slides  │         ││
│                                                 in)     └─────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screen 1: Business Input

Entry point. Minimal. One job: get the business context.

**Elements:**
- Large heading: *"What business are we analysing?"*
- Multi-line free text input — no structured form fields. User describes naturally.
  - Example: *"Oil company with offshore drilling in the Gulf of Mexico and pipeline infrastructure across Texas and Louisiana"*
- Example buttons (pre-populate input):
  - 🐭 Lemming Farmers Inc.
  - 🛢️ Gulf Coast Oil Operator
- Global default depth selector — pill tabs: `Quick Scan` / `Research Brief` / `Deep Run`
  - Applies to all risk factors unless overridden per card
- Analyse button — submits, transitions to main view

On submit: input screen fades out. Flow chart begins populating with steps streamed in from the decomposer.

---

## Screen 2: Business Flow Chart (Main View)

The centrepiece. A horizontal flow diagram of up to 5 business steps connected by directional arrows. Serves as navigation, risk summary, and the primary visual for the demo.

### Step Boxes

Each box displays:
- **Step name** (e.g. "Extraction", "Pipeline Transport", "Refining")
- **Failure Rate** — probability of a bad outcome given known data (e.g. `FR: 23%`)
- **Uncertainty** — how much is unknown about this step (e.g. `UN: 71%`)
- **Loss Range** — potential financial impact as a range (e.g. `$4M – $67M`)
- **Color fill** — smooth spectrum from deep green → amber → deep red based on combined risk score. Not three states — a continuous gradient. Boxes should be visually distinct from each other across the 5 steps.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Extraction  │ ──▶ │   Transport  │ ──▶ │   Refining   │
│              │     │              │     │              │
│  FR:  23%    │     │  FR:   8%    │     │  FR:  31%    │
│  UN:  71%    │     │  UN:  34%    │     │  UN:  58%    │
│ $4M – $67M   │     │ $1M –  $8M   │     │ $9M – $120M  │
└──────────────┘     └──────────────┘     └──────────────┘
   🟠 ELEVATED           🟢 LOW               🔴 HIGH
```

### Connecting Arrows

Arrows between steps can also be colored to indicate **cascading risk** — a failed step that blocks downstream operations. Initially neutral grey; colored once analysis is complete.

### Interaction

- Clicking a box opens the Risk Factor Detail section below the flow chart
- Selected box gets a highlighted border
- Boxes populate one by one as the decomposer streams results (not all at once — feels alive)
- Boxes start grey/neutral and gain their color as analysis completes

---

## Risk Metrics — Two Distinct Values

Every risk factor exposes three distinct values. These must never be collapsed into one number.

| Metric | Meaning |
|--------|---------|
| **Failure Rate** | Given current knowledge, probability of a negative outcome |
| **Uncertainty** | Confidence gap — how well we actually understand this risk |
| **Potential Loss** | Financial impact, expressed as a range (min–max) |

The **range width** is itself informative. `$4M – $67M` signals a poorly understood risk even if the midpoint seems manageable. `$30M – $35M` signals a well-characterised risk even if it's larger in expected value.

### Visual Treatment (in detail view)

```
PIPELINE INTEGRITY
──────────────────────────────────────────────────────────
Failure Rate    23%    ████████░░░░░░░░   ELEVATED
Uncertainty     71%    ███████████████░   VERY HIGH

Potential Loss
$4.2M  ├─────────────────────────────────────────┤  $67M
       low estimate                          high estimate

⚠  Wide range driven by: outdated inspection data + uncharacterised
   seismic exposure along the eastern corridor
──────────────────────────────────────────────────────────
```

The warning note below the range explains the *source* of the swing — this is the gap the system identified, and is the core value of the analysis.

**Color scale for risk bars:**
- 0–20%: deep green
- 20–40%: yellow-green
- 40–60%: amber
- 60–80%: orange
- 80–100%: deep red

Uncertainty uses the same scale independently. A low failure rate with high uncertainty is a distinct and important state (shown as green bar + orange bar — "we think it's fine but we're not sure").

---

## Risk Factor Detail Section

Appears below the flow chart when a step box is clicked. Shows the risk factors within that step and the full analysis for a selected factor.

### Risk Factor List (left of detail section)

Compact rows for each risk factor within the selected step:
- Status dot: grey / amber pulsing / green / red
- Risk factor name
- Depth badge (current setting)
- Once complete: FR% and UN% inline
- Clickable to load detail on the right

### Risk Factor Detail (right of detail section)

**Idle state:**
- Name + 2-line description
- Depth picker (1 / 2 / 3) — overrides global default for this factor
- Estimated token cost per depth (shown before running)
- "Analyse" button

**Running state:**
- Spinner / progress animation
- Token counter ticking for this factor
- Short status message: *"Scanning available data sources..."*

**Complete state:**

```
┌───────────────────────────────────────────────────────┐
│  🛢️  Pipeline Integrity                               │
│  Depth: Research Brief  ·  Tokens used: 2,140         │
├───────────────────────────────────────────────────────┤
│  SUMMARY                                              │
│  2–4 sentences: key finding, primary uncertainty,     │
│  what's missing, and why the loss range is wide       │
├───────────────────────────────────────────────────────┤
│  GAPS IDENTIFIED                                      │
│  • Last formal inspection: 2019 — 4-year data gap     │
│  • Seismic exposure on eastern segment uncharacterised│
│  • No independent verification of operator self-report│
├───────────────────────────────────────────────────────┤
│  RISK METRICS                                         │
│  [as shown in risk metrics section above]             │
├───────────────────────────────────────────────────────┤
│  ARTIFACTS  (5 found)                                 │
│  [see artifact list below]                            │
└───────────────────────────────────────────────────────┘
```

---

## Artifact List

Artifacts are the evidence layer — they show where the analysis came from and are displayed as a clean list below the analysis. Different file types get distinct treatments.

### Document

```
📄  pipeline_integrity_2023.pdf
    /oil/  ·  Referenced for inspection history and segment data
```

### Image / Map (PNG)

```
🗺️  corridor_fault_map.png                          [▾ Preview]
    /geo/  ·  Fault line proximity along pipeline corridor
    ┌────────────────────────────────────────┐
    │         [PNG inline preview]           │
    └────────────────────────────────────────┘
```

Collapsed by default. Click to expand inline. No map rendering — raw PNG display is sufficient.

### YouTube Video

```
🎥  Texas Pipeline Failure — 2021 Colonial Incident Analysis
    youtube.com/watch?v=...
    ┌────────────────────────────────────────┐
    │   [YouTube thumbnail]          ▶ Play  │
    │   "Colonial Pipeline Incident —        │
    │    Root Cause and Risk Lessons"        │
    └────────────────────────────────────────┘
    [Open in YouTube ↗]
```

Thumbnail fetched from YouTube URL. Title shown if resolvable. Inline player or external link. Audio plays through browser.

### Audio File

```
🎵  expert_interview_risk_jan2024.mp3
    /oil/
    [▶  ──────────────────────────────  0:00 / 14:32]
```

Minimal inline player: play/pause, scrub bar, duration.

### Data File

```
📊  subsidence_measurements_2022.csv
    /geo/  ·  Ground movement data across pipeline corridor
```

No preview — filename and relevance note only.

---

## Agent Thread Side Panel

Slides in from the right when any agent is started. Remains visible while agent runs. Can be dismissed but re-opened.

### Depth 1 & 2 Thread

```
┌──────────────────────────────────────────┐
│  AGENT THREAD                        ×   │
│  Pipeline Integrity  ·  Research Brief   │
│  ────────────────────────────────────    │
│                                          │
│  ✓  Received risk factor                 │
│     └ "Pipeline Integrity"               │
│     └ Context: Gulf Coast oil operator   │
│                                          │
│  ✓  Scanned /data/oil/ for matches       │
│     └ 📄 pipeline_integrity_2023.pdf     │
│     └ 📄 gulf_subsidence_report.md       │
│     └ 🗺️ corridor_fault_map.png          │
│                                          │
│  ⟳  Extracting risk signals...           │
│     └ Subsidence: 3 high-risk segments   │
│     └ Inspection gap: 2019–2023          │
│     └ Seismic cross-ref: 2022 events     │
│                                          │
│  ○  Estimating failure probability       │
│  ○  Identifying uncertainty sources      │
│  ○  Generating loss range                │
│                                          │
│  ────────────────────────────────────    │
│  ▓▓▓▓▓▓▓░░░░░░  1,240 / ~2,100 tokens   │
└──────────────────────────────────────────┘
```

- ✓ = complete step
- ⟳ = currently running (animated)
- ○ = pending
- Sub-bullets appear progressively as the agent works
- Token bar fills in real time

### Depth 3 Thread (Deep Run)

```
┌──────────────────────────────────────────┐
│  AGENT THREAD  ·  DEEP RUN           ×   │
│  Pipeline Integrity                      │
│  ────────────────────────────────────    │
│                                          │
│  Parallelized agent threads:             │
│                                          │
│  ✓  Thread A  Historical incident data   │
│  ⟳  Thread B  Seismic exposure analysis  │
│  ⟳  Thread C  Regulatory filing scan     │
│  ○  Thread D  Financial loss modelling   │
│  ○  Synthesis across threads             │
│                                          │
│  ────────────────────────────────────    │
│  Estimated full run:  ~24hr compute      │
│  Tokens so far:       48,200             │
│                                          │
│  [Stop & use partial results]            │
└──────────────────────────────────────────┘
```

The "24hr compute" estimate makes the depth difference tangible. "Stop & use partial" gives the user an exit without losing work.

---

## Depth Tiers

| Tier | Name | What happens | Approx tokens | Speed |
|------|------|-------------|---------------|-------|
| **1** | Quick Scan | Filename matching, stub summary | 200–500 | Seconds |
| **2** | Research Brief | Agent reads files, synthesises, cites, identifies gaps | 1k–5k | 10–60s |
| **3** | Deep Run | Parallelized agents, extended reasoning, full corpus | 100k–1M+ | Hours |

Token cost estimated before run, actual shown after. Depth 3 shows a progress state with option to stop early.

---

## Visual Design Direction

**Tone:** Bloomberg terminal meets modern SaaS. Analytical, efficient, but not plain.

- **Top bar:** dark background, business name left, token counter and run controls right
- **Flow chart:** light background with subtle dot grid. Boxes bold and high-contrast. Color differences between boxes must be legible from across a room.
- **Risk bars:** warm-to-cool spectrum. Not just red/green.
- **Agent thread panel:** dark background, monospace-adjacent font for step log. Feels like real compute.
- **Artifact previews:** card style with subtle shadow, rounded corners.
- **Transitions:** boxes fade in as decomposer runs. Agent thread lines type in progressively. Token counter animates.

---

## Components Summary

| Component | Purpose |
|-----------|---------|
| `BusinessInput` | Text entry, examples, depth default, submit |
| `BusinessFlowChart` | 5-step diagram, colored boxes, clickable |
| `StepBox` | Individual step with FR/UN/loss range + color |
| `RiskFactorList` | Sidebar list of factors within a selected step |
| `RiskFactorDetail` | Full analysis: summary, gaps, metrics, artifacts |
| `RiskMetricsDisplay` | FR bar + UN bar + loss range bar with annotation |
| `ArtifactList` | Container for all artifact types |
| `DocumentArtifact` | Filename + relevance note |
| `ImageArtifact` | PNG with collapsible inline preview |
| `YouTubeArtifact` | Thumbnail + inline player + external link |
| `AudioArtifact` | Inline play/pause/scrub player |
| `DataArtifact` | Filename + note, no preview |
| `AgentThreadPanel` | Slide-in panel with live step log + token bar |
| `DepthPicker` | 1 / 2 / 3 selector, per factor or global |
| `TokenCounter` | Global running total in top bar |

---

## Demo Flow (on stage)

### Lemming Farmers (opener — gets a laugh)

1. Click 🐭 *Lemming Farmers Inc.*
2. Five boxes appear: Breeding → Habitat Mgmt → Harvest → Transport → Market
3. "Cliff Proximity" risk factor in Habitat Mgmt — audience laughs
4. Run Depth 1 on all — completes in seconds, boxes colour up
5. Click Harvest → select "Cliff Proximity" → artifact list shows `lemming_habitat_map.png`
6. Expand PNG — map with cliff marked prominently
7. Punchline: *"The system doesn't know it's a joke. It treats every business the same."*

### Oil Operator (the real pitch)

1. Click 🛢️ *Gulf Coast Oil Operator*
2. Flow chart populates — Extraction and Refining boxes come up deep red
3. Run Research Brief on Refining — agent thread slides in, audience watches it work
4. Result: FR 31%, UN 58%, loss range $9M–$120M
5. Gaps identified: outdated safety audit, seismic data gap
6. Expand `corridor_fault_map.png` — visual evidence
7. Play YouTube artifact — expert commentary on the exact risk type
8. Switch one factor to Deep Run — show parallelized threads + 24hr compute estimate
9. Point to token counter — *"this is the cost of reducing uncertainty"*
