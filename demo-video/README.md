# World Token Factory — Demo Video

3-minute action trailer built with [Remotion](https://remotion.dev).
Pure React motion graphics — no external assets required.

## Scenes

| # | Title | Time | Frames |
|---|-------|------|--------|
| 1 | Title Card | 0–5s | 0–150 |
| 2 | The Problem | 5–15s | 150–450 |
| 3 | The Solution | 15–30s | 450–900 |
| 4 | Orchestration | 30–60s | 900–1800 |
| 5 | Risk Map | 60–90s | 1800–2700 |
| 6 | Agent Thread | 90–120s | 2700–3600 |
| 7 | Tech Stack | 120–150s | 3600–4500 |
| 8 | Call to Action | 150–180s | 4500–5400 |

Total: 5400 frames @ 30fps = 3 minutes exactly.

## Setup

```bash
cd demo-video
npm install
```

## Preview in Remotion Studio

```bash
npm run dev
# Opens http://localhost:3000 — live preview with scrubbing
```

## Render Full Video

```bash
npm run render
# Output: out/demo.mp4
```

Or with explicit flags:

```bash
npx remotion render src/index.ts Main out/demo.mp4 --codec=h264 --concurrency=4
```

## Render Individual Scenes (faster iteration)

```bash
npm run render:scene1   # Title card only
npm run render:scene4   # Orchestration only
npm run render:scene8   # CTA only
# etc.
```

## Render Commands Reference

```bash
# Full render with concurrency
npm run render:fast

# Specific scene by ID
npx remotion render src/index.ts Scene1-Title out/scene1.mp4
npx remotion render src/index.ts Scene5-RiskMap out/scene5.mp4

# Still frame (for thumbnail)
npx remotion still src/index.ts Main --frame=0 out/thumbnail.png
```

## Project Structure

```
demo-video/
  src/
    index.ts              # Remotion entry point (registerRoot)
    Root.tsx              # All Composition registrations + Series assembly
    types.ts              # Shared colors, fonts, types
    components/
      Atoms.tsx           # Reusable animation primitives:
                          #   FadeIn, SlideUp, ScaleIn, Typewriter,
                          #   NeonLine, Chip, PulseDot, GridBg,
                          #   ScanLine, SectionLabel
    scenes/
      Scene1Title.tsx     # Title card with spring drop + corner brackets
      Scene2Problem.tsx   # Risk data sources panel
      Scene3Solution.tsx  # Account picker + risk decomposition bars
      Scene4Orchestration.tsx  # Agent network graph (SVG + nodes)
      Scene5RiskMap.tsx   # Geo-spatial grid risk map
      Scene6AgentThread.tsx    # Reasoning steps typewriter reveal
      Scene7TechStack.tsx # Sponsor/tech cards fly-in
      Scene8CTA.tsx       # Final call to action + links
  out/                    # Rendered output (gitignored)
  tsconfig.json
  package.json
```

## Design System

| Token | Value | Use |
|-------|-------|-----|
| bg | #0a0a0f | Page background |
| text | #e0ffe0 | Primary text |
| accent | #00ff88 | Neon green — primary CTA, highlights |
| secondary | #00ccff | Cyan — data sources, info |
| danger | #ff0066 | Red — critical risk, warnings |
| warn | #ffaa00 | Amber — elevated risk |

Font: Space Grotesk (display), Courier New (mono).

## Notes

- All visuals are pure CSS/SVG React — no image assets needed.
- The `out/` directory is gitignored. Run render locally to produce video.
- For hackathon submission, render at 1920x1080 H.264.
