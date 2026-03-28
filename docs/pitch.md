# World Token Factory — Hackathon Pitch

**Event:** Multimodal Frontier Hackathon
**Prize pool:** $45k+
**Target sponsors:** Google DeepMind, Assistant UI, DigitalOcean

---

## The One-Liner

> *"Every business is a token factory. We show you what it costs to reduce the uncertainty that's putting yours at risk."*

---

## The Problem

Businesses carry risks they can't fully see. Not because the information doesn't exist — but because it's scattered across documents, satellite images, expert interviews, regulatory filings, and data files that nobody has time to synthesise.

When a pipeline operator doesn't know the seismic exposure on their eastern corridor, that ignorance has a cost. It shows up as wide insurance premiums, delayed decisions, or — eventually — an incident.

The same is true for any business with complex operations: you're not flying blind, you're flying with patchy visibility. Some areas you understand well. Others you're just hoping will be fine.

**Reducing that uncertainty costs tokens** — research time, compute, attention. The question is: which uncertainties are worth paying to resolve?

---

## The Insight: Token Factory

A business takes in resources (capital, attention, compute, time) and produces outputs (products, decisions, revenue). It's a factory.

AI has made one input dramatically cheaper: the cognitive work of research and synthesis. What used to take an analyst weeks can be done in minutes — if you know what to ask.

This reframes the question from *"are we at risk?"* to *"how many tokens does it cost to find out, and is that worth it?"*

That's a question any CEO, investor, or risk officer can answer immediately. And it's a question nobody has built a tool around — until now.

---

## What We Built

A web app that:

1. **Takes a business description** — free text, described naturally
2. **Decomposes it** into up to 5 operational steps, each with specific risk factors
3. **Runs AI agents** at three depth levels against a corpus of domain documents, maps, audio, and video
4. **Shows two separate risk metrics** per factor — failure rate (what we know) and uncertainty (what we don't)
5. **Shows a potential loss range** — the width of the range is itself the signal
6. **Makes the AI's reasoning visible** — a live agent thread panel shows every step as it runs

### The Business Flow Chart

The main view is not a dashboard. It's a **flow diagram of the business itself**, with each step colored by risk. Extraction → Transport → Refining → Distribution → Market. Each box shows precise numbers. You can see at a glance where the danger is, and drill into any step to understand why.

### Two Depth Levels That Matter for the Demo

- **Research Brief (Depth 2):** Agent reads source files, synthesises findings, identifies gaps. Completes in under a minute. The agent thread panel shows it thinking live.
- **Deep Run (Depth 3):** Parallelized agents, full corpus, extended reasoning. Estimated at 24 hours of equivalent compute. Shows the *cost* of going deep — and makes the token factory concept tangible.

---

## The Two Demo Cases

### 🐭 Lemming Farmers Inc.

Opens the pitch. Gets a laugh. Proves the system is domain-agnostic.

Risk factors include: population volatility, migration corridor disruption, cliff proximity, predator pressure, Arctic climate trends, market demand uncertainty.

The system treats it entirely seriously. A fault map of the habitat appears. The cliff proximity risk is flagged as HIGH. The audience understands immediately that this works on *anything*.

**Punchline:** *"The system doesn't know it's a joke. It treats every business the same."*

Then we switch to the real thing.

### 🛢️ Gulf Coast Oil Operator

Five operational steps. Real risk factors. Real uncertainty.

- **Extraction:** Seismic exposure, 2019 data gap, FR 23% / UN 71% / $4M–$67M
- **Refining:** Most complex step, highest uncertainty, $9M–$120M range — the width of that range tells the story
- **Market:** Highest failure rate, commodity price exposure, least controllable

We run the Research Brief agent live on one factor. The audience watches the agent thread:
- Scan files for relevant data
- Find three source documents
- Extract risk signals (inspection gap, seismic cross-reference)
- Generate the loss range with an explanation of why it's wide

Then we switch one factor to Deep Run and point to the parallelized threads and the 24hr compute estimate. Token counter ticks up.

**Close:** *"This is what it costs to reduce uncertainty in this business. Now you know which uncertainties are worth paying for."*

---

## Why Multimodal

The data sources for real business risk are inherently multimodal:

- **Text:** regulatory filings, inspection reports, expert analysis
- **Images:** satellite maps, fault line diagrams, infrastructure photos
- **Video:** incident case studies, expert interviews on YouTube
- **Audio:** recorded expert interviews, field reports
- **Structured data:** measurement series, historical incident records

A text-only tool misses the satellite signal. A vision-only tool misses the literature gap. The power is in synthesising across all of them — which is exactly what Gemini is built for.

---

## Sponsor Integration

| Sponsor | How we use it |
|---------|--------------|
| **Google DeepMind / Gemini** | Multimodal core — satellite image analysis, document synthesis, agent reasoning, long-context research briefs |
| **Assistant UI** | Live agent thread panel + chat interface over the full analysis |
| **DigitalOcean** | Backend inference hosting and API serving |

---

## The Bigger Vision

World Token Factory starts with individual businesses analysing their own risk. But the same engine applies anywhere decisions are made under uncertainty:

- **PE / investment firms** — due diligence on acquisition targets, understanding risk before capital is committed
- **Infrastructure investors** — geospatial risk for specific assets before construction begins
- **Research organisations** — finding gaps in the scientific literature (the MetaResearch Engine, our longer-term project)

The core insight scales: wherever there is uncertainty and a cost to resolving it, the token factory model applies.

---

## Business Model (Post-Hackathon)

| Phase | Model |
|-------|-------|
| **1. Reports** | Per-analysis pricing — businesses pay per risk brief |
| **2. Subscription** | Ongoing monitoring — risk factors re-run as new data arrives |
| **3. Enterprise API** | B2B integration into existing risk management workflows |

Target buyers: insurance underwriters, infrastructure investors, PE due diligence teams, corporate risk officers. These are buyers with high willingness to pay for reduced uncertainty — it directly affects capital allocation decisions worth millions.

---

## What We'd Say to Judges

We didn't build a demo that *looks* like AI is doing something. We built a system where the AI's reasoning is the product — visible, step by step, in real time. The agent thread panel isn't a log; it's the pitch. You're watching the token factory run.

The lemming farmers make you laugh. The oil operator makes you think. The token counter makes it concrete.

*What does it cost to know what you don't know? Now you can find out.*
