"""
Pre-baked analysis results for the Permian Basin — Hormuz Crisis Backstop scenario.

D1 (Quick Scan) — instant, filename-level. Uncertainty slightly tighter than initial_metrics.
D2 (Research Brief) — reads real data files. Meaningful range narrowing.

The pair of results per factor lets the frontend Token Efficiency chart show visible
refinement steps as the user runs each depth tier.
"""

import asyncio
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics

# ── helpers ──────────────────────────────────────────────────────────────────

def _a(filename, domain, ftype, relevance, url=None):
    return Artifact(filename=filename, domain=domain, type=ftype, relevance=relevance, url=url)

def _m(fr, un, low, high, note):
    return RiskMetrics(failure_rate=fr, uncertainty=un,
                       loss_range_low=low, loss_range_high=high, loss_range_note=note)

# IDs that belong to the hardcoded oil scenario
OIL_RF_IDS = {
    "rf_1_1", "rf_1_2", "rf_1_3",
    "rf_2_1", "rf_2_2",
    "rf_3_1", "rf_3_2",
}

# ── shared artifacts ──────────────────────────────────────────────────────────

_PERMIAN_BRIEF   = _a("permian_basin_risk_brief.md", "oil", "document",
                       "Three active Permian risk vectors: ERCOT grid, zombie well pressure, Waha pipeline bottleneck")
_PERMIAN_DEM     = _a("artifacts/permian_basin_midland_dem_30m.tif", "oil", "map",
                       "Copernicus 30m DEM — Delaware Basin / western Permian; pipeline and well infrastructure terrain")
_PERMIAN_VIDEO   = _a("artifacts/permian_power_grid_risk.mkv", "oil", "video",
                       "ERCOT reliability analysis for Permian Basin field operations — power buildout delay risk")
_PIPELINE_INT    = _a("pipeline_integrity_2023.md", "oil", "document",
                       "847-mile Gulf Coast pipeline assessment: ILI findings, 6 open PHMSA conditions, segment anomalies")
_PIPELINE_GIS    = _a("artifacts/pipeline_risk_gis_ml.pdf", "oil", "document",
                       "GIS + ML pipeline failure probability model — ensemble classifier results, risk zone maps")
_SUBSIDENCE      = _a("gulf_subsidence_report.md", "oil", "document",
                       "Zone-by-zone subsidence rates; eastern offshore 2019 survey gap; $4.2M–$67M repair range")
_HURRICANE       = _a("offshore_hurricane_exposure.md", "oil", "document",
                       "Cat 3+ platform exposure: 847 platform-days downtime 2010–2023, insurance deductibles, 3 high-risk assets")
_COMPLIANCE      = _a("regulatory_compliance_2022.md", "oil", "document",
                       "$420K 2020 PHMSA penalty; 4 BSEE SEMS findings (2 critical); open consent decree risk")
_CUSHING_DEM     = _a("artifacts/cushing_oklahoma_dem_30m.tif", "oil", "map",
                       "Copernicus 30m DEM — Cushing, OK; terrain around the 94M-barrel pipeline crossroads hub")
_CSB_VIDEO       = _a("artifacts/csb_bp_texas_city_anatomy_of_disaster.mp4", "oil", "video",
                       "CSB root-cause analysis of BP Texas City refinery explosion — process safety and failure chain benchmark")

# ── per-factor canned data ────────────────────────────────────────────────────
# Each entry: (summary, gaps, metrics, artifacts, tokens_used)

_DATA: dict[str, dict] = {

    # ── Step 1: Permian Field Operations ─────────────────────────────────────

    "rf_1_1": {
        "name": "ERCOT Grid Failure Risk",
        "d1": {
            "summary": (
                "Filename scan matched the Permian Basin risk brief and the ERCOT power grid risk video. "
                "The risk brief flags industry testimony that 'the greatest risk of failure for the Permian Basin "
                "Reliability Plan is for these necessary projects to falter under any delay.' ERCOT transmission "
                "additions required to support Permian field operations at current production levels are delayed. "
                "A summer 2026 heat event or winter storm could curtail compressor and pump operations across the basin. "
                "Uncertainty remains high — ERCOT stress events are seasonal and not predictable at a 6-month horizon."
            ),
            "gaps": [
                "ERCOT reserve margin forecast for summer 2026 peak not quantified in available files",
                "Specific MW of delayed West Texas transmission additions not confirmed",
                "Operator-level diesel backup genset capacity not documented",
            ],
            "metrics": _m(0.22, 0.76, 48_000_000, 360_000_000,
                          "Filename scan; production curtailment cost at large-operator scale; duration uncertainty drives wide range"),
            "artifacts": [_PERMIAN_BRIEF, _PERMIAN_VIDEO],
            "tokens": 285,
        },
        "d2": {
            "summary": (
                "The Permian Basin risk brief and ERCOT power grid video provide strong grounding. "
                "ERCOT summer 2026 load forecast shows a 3.7 GW reserve margin deficit if planned West Texas "
                "transmission additions slip — a scenario the brief characterises as already likely. "
                "Permian field operations depend on approximately 4.2 GW of electricity to sustain 6.7 Mbbl/day output; "
                "without new import capacity, a demand spike triggers automatic load-shedding that hits field compressors "
                "and injection pumps before residential consumers. DEM analysis of the Permian Basin Midland terrain "
                "confirms the flat basin topology: no gravity-assist for fluid movement, full electrical dependency. "
                "A 5-day ERCOT curtailment event during a Hormuz ramp scenario would reduce Permian output by an "
                "estimated 850 Kbbl/day — costing a large integrated operator $60–280M in lost production margin "
                "depending on WTI price at the time. Diesel backup provides partial mitigation but sourcing 450 MW "
                "of mobile generation in a crisis timeline is operationally uncertain."
            ),
            "gaps": [
                "Operator-specific diesel genset pre-positioning and procurement lead times not documented",
                "ERCOT real-time demand curves for Q3 2026 not in data store — reserve margin estimate is modelled",
                "Load-shedding priority schedule for industrial vs field customers not confirmed",
            ],
            "metrics": _m(0.25, 0.52, 60_000_000, 280_000_000,
                          "ERCOT grid analysis + DEM confirms full electrical dependency; duration modelled at 5-day curtailment scenario"),
            "artifacts": [_PERMIAN_BRIEF, _PERMIAN_VIDEO, _PERMIAN_DEM],
            "tokens": 2_140,
        },
    },

    "rf_1_2": {
        "name": "Zombie Well Pressure Crisis",
        "d1": {
            "summary": (
                "Filename scan matched the Permian Basin risk brief directly. "
                "Texas regulators have issued pressure management notices to Chevron, BP, and Coterra — documented "
                "in the brief as a Railroad Commission response to 'widespread' underground pressure increases from "
                "wastewater injection. The Permian has approximately 120,000 plugged or inactive legacy wells "
                "('zombie wells'), with ~8,400 classified as orphaned or inadequately sealed. Three blowout incidents "
                "occurred in the basin 2022–2024. Spatial distribution of zombie wells relative to active injection "
                "zones is poorly mapped, which is the primary driver of uncertainty."
            ),
            "gaps": [
                "Spatial map of zombie well locations relative to active wastewater injection zones not available",
                "Railroad Commission enforcement timeline and shutdown order status not documented",
                "Wastewater injection volumes by sub-basin (Delaware vs Midland) not quantified",
            ],
            "metrics": _m(0.18, 0.72, 30_000_000, 235_000_000,
                          "Filename scan; Railroad Commission notices confirmed; zombie well spatial gap drives wide range"),
            "artifacts": [_PERMIAN_BRIEF],
            "tokens": 248,
        },
        "d2": {
            "summary": (
                "The Permian Basin risk brief documents a structurally underreported risk: wastewater injection "
                "volumes in the Delaware Basin run at approximately 18.4 Mbbl/day — among the highest in North America. "
                "As this water is re-injected into formations already stressed by decades of extraction, "
                "underground pressure migrates through fault networks into legacy well casings. "
                "Zombie wells — abandoned, poorly sealed, or inadequately plugged — become pressure conduits. "
                "The Railroad Commission notices to Chevron, BP, and Coterra represent the formal acknowledgement "
                "that the problem is no longer localised. In a production ramp scenario, injection volumes would "
                "increase proportionally, accelerating pressure propagation nonlinearly. "
                "The $32M–$190M loss range reflects: low end = targeted shutdown orders on specific injection zones "
                "with production rerouting; high end = a blowout event triggering a broad production moratorium "
                "across multiple pads, plus Railroad Commission-mandated remediation of abandoned well infrastructure. "
                "Uncertainty has been reduced by confirming the active regulatory enforcement posture, "
                "but the spatial coverage of the zombie well risk cannot be quantified without GIS data."
            ),
            "gaps": [
                "GIS layer of zombie well locations vs active injection zones not in data store — key unquantified exposure",
                "Railroad Commission enforcement timeline: shutdown orders vs compliance window not confirmed",
                "Pressure propagation modelling for Delaware Basin fractured basement not available",
            ],
            "metrics": _m(0.20, 0.55, 32_000_000, 190_000_000,
                          "Risk brief + regulatory notices confirm active enforcement; spatial gap prevents further narrowing of high end"),
            "artifacts": [_PERMIAN_BRIEF, _PERMIAN_DEM],
            "tokens": 1_860,
        },
    },

    "rf_1_3": {
        "name": "Waha Gas Pipeline Bottleneck",
        "d1": {
            "summary": (
                "Filename scan matched the Permian Basin risk brief. This risk is not hypothetical — it is currently "
                "active. Waha natural gas hub prices have been negative on 38 out of 51 days in 2026 to date. "
                "When gas prices go deeply negative, producers must either pay to dispose of associated gas or shut in "
                "oil wells — both cases degrade or halt oil production economics. "
                "The Blackcomb pipeline, a key egress relief valve, has been pushed from July to November 2026. "
                "A Hormuz-driven production ramp would increase associated gas volumes, worsening the constraint at "
                "exactly the wrong moment. Uncertainty is moderate — the timeline is known but the curtailment "
                "magnitude depends on the scale and duration of any ramp attempt."
            ),
            "gaps": [
                "Operator-specific associated gas volumes and oil-to-gas ratio for affected pads not available",
                "Flaring capacity headroom and Railroad Commission flaring permit status not documented",
                "Waha forward curve and gas hedging position not provided",
            ],
            "metrics": _m(0.68, 0.48, 38_000_000, 170_000_000,
                          "Active constraint confirmed: 38/51 negative Waha days in 2026; Blackcomb delay to November documented"),
            "artifacts": [_PERMIAN_BRIEF],
            "tokens": 262,
        },
        "d2": {
            "summary": (
                "This is the most time-sensitive risk in the portfolio — it is not a probability, it is a present-tense "
                "operational constraint. The Permian Basin risk brief documents a structural egress deficit that will "
                "persist until at least November 2026 when Blackcomb comes online. "
                "The mechanism: associated gas is a co-product of oil production; if it cannot be transported, "
                "producers must flare (subject to Railroad Commission limits), pay negative prices to dispose of it, "
                "or shut in the oil well. At deeply negative Waha prices (-$1 to -$3/MMBtu), shut-in becomes "
                "economically rational for wells with high gas-to-oil ratios. "
                "A ramp scenario triggered by Hormuz disruption would add an estimated 0.8–1.2 Bcf/day of incremental "
                "associated gas across the basin — far exceeding current spare egress capacity. "
                "The $42M–$155M loss range reflects the curtailment cost at a large operator's Permian position: "
                "low end = managed partial shut-in of highest GOR wells during the bottleneck window; "
                "high end = involuntary curtailment across multiple pad sites with regulatory flaring restrictions "
                "binding simultaneously. Uncertainty is lower than other factors because the constraint's timeline "
                "and mechanism are well-documented — the unknown is the scale of any external demand shock."
            ),
            "gaps": [
                "Operator gas-to-oil ratio by pad cluster not provided — curtailment magnitude cannot be precisely allocated",
                "Railroad Commission flaring permit headroom for this operator not in data store",
                "Blackcomb delay risk: probability of further delay beyond November 2026 not assessed",
            ],
            "metrics": _m(0.72, 0.32, 42_000_000, 155_000_000,
                          "Active, documented constraint with known timeline; range driven by ramp magnitude uncertainty; mechanism well-characterised"),
            "artifacts": [_PERMIAN_BRIEF, _PERMIAN_DEM],
            "tokens": 2_280,
        },
    },

    # ── Step 2: Midstream Egress ──────────────────────────────────────────────

    "rf_2_1": {
        "name": "Gulf Coast Pipeline Integrity",
        "d1": {
            "summary": (
                "Three files matched: pipeline integrity report (2023), gulf subsidence report, and the GIS/ML "
                "pipeline risk model. The 847-mile Gulf Coast mainline has 6 open PHMSA conditions, "
                "2 of which are delinquent past their 90-day resolution target. "
                "Segment B (miles 445–512) last had an ILI run in 2019 — reinspection is overdue per PHMSA schedule. "
                "The subsidence report identifies the eastern offshore approach as having 2.4–4.8 inches of "
                "uncharacterised cumulative movement since 2019. "
                "The GIS/ML model flags elevated failure probability in zones with corrosion + subsidence co-occurrence."
            ),
            "gaps": [
                "Segment B ILI reinspection still outstanding — corrosion state since 2019 unknown",
                "2 delinquent PHMSA conditions: closure status and enforcement risk not confirmed",
                "Post-2022 seismic cluster near Brazoria County not factored into pipeline stress models",
            ],
            "metrics": _m(0.16, 0.68, 13_000_000, 88_000_000,
                          "Three files matched: ILI findings, subsidence gap, and PHMSA conditions; Segment B gap drives range width"),
            "artifacts": [_PIPELINE_INT, _SUBSIDENCE, _PIPELINE_GIS],
            "tokens": 272,
        },
        "d2": {
            "summary": (
                "The pipeline integrity assessment (2023) documents Segment A with 14 metal loss anomalies exceeding "
                "50% wall thickness and a subsidence rate of 0.8 inches/year. Segment B — the coastal crossing — "
                "has not had an ILI run since 2019 despite hurricane-related scour at 3 crossings and a diving "
                "survey only scheduled for Q4 2023. "
                "The gulf subsidence report confirms differential movement of 1.8–3.1mm/year in the eastern offshore "
                "approach, with bell-hole corrosion acceleration consistent with subsidence-induced stress. "
                "The GIS/ML model (arXiv:2501.11213) applied to similar Colorado field data shows that corrosion + "
                "subsidence co-occurrence raises failure probability by 2.3× relative to baseline. "
                "Six open PHMSA conditions (2 delinquent) create concurrent enforcement exposure: a failure event "
                "during a compliance gap would trigger civil penalties at the high end of the schedule. "
                "The $14M–$72M range reflects: low end = targeted hydrotesting and PHMSA condition closure; "
                "high end = a reportable release on the Segment B coastal crossing triggering full rehabilitation "
                "plus OPA third-party liability."
            ),
            "gaps": [
                "Segment B ILI reinspection not yet completed — coastal corrosion state uncharacterised",
                "Post-2022 Brazoria County seismic cluster (M2.4–3.6) not in current pipeline stress models",
                "PHMSA delinquent condition closure timeline and enforcement posture not confirmed",
            ],
            "metrics": _m(0.16, 0.46, 14_000_000, 72_000_000,
                          "ILI anomalies + subsidence quantified; Segment B gap retained as primary residual uncertainty"),
            "artifacts": [_PIPELINE_INT, _SUBSIDENCE, _PIPELINE_GIS, _COMPLIANCE],
            "tokens": 2_450,
        },
    },

    "rf_2_2": {
        "name": "Cushing Storage Congestion",
        "d1": {
            "summary": (
                "Filename scan matched the Cushing DEM. Cushing, Oklahoma — 'Pipeline Crossroads of the World' — "
                "holds approximately 94M barrels of crude storage capacity across multiple operators. "
                "At operational limits (~80% utilisation), incoming crude must accept steep discounts or be "
                "diverted, increasing pipeline and transport costs upstream. "
                "A Hormuz-driven US production ramp would push incremental barrels through the Cushing hub; "
                "if Permian and GOM production both ramp simultaneously, Cushing utilisation could approach "
                "operational limits within 4–6 weeks. Uncertainty is moderate — Cushing inventory data is public "
                "but forward utilisation under a ramp scenario is not modelled in available files."
            ),
            "gaps": [
                "Current Cushing utilisation rate and weekly EIA inventory trend not in data store",
                "Operator-specific tank allocation and lease terms at Cushing not available",
                "Pipeline diversion capacity to alternate hubs (Midland, St James) not quantified",
            ],
            "metrics": _m(0.14, 0.62, 20_000_000, 125_000_000,
                          "Filename scan; 94M-barrel capacity confirmed from DEM context; utilisation surge risk under ramp scenario"),
            "artifacts": [_CUSHING_DEM],
            "tokens": 235,
        },
        "d2": {
            "summary": (
                "The Cushing DEM confirms the hub's geography: a concentrated tank farm in a flat Oklahoma basin, "
                "surrounded by converging pipeline infrastructure. Cushing's role as the WTI delivery point makes "
                "it the price-setting node for North American crude — congestion here propagates directly into "
                "upstream price discounts and downstream supply chain disruptions. "
                "In a Hormuz crisis scenario where Permian is asked to ramp from 6.7 to 7.5+ Mbbl/day, "
                "the incremental 800 Kbbl/day would hit Cushing within 48–72 hours of leaving the wellhead. "
                "At a starting utilisation of ~65% (typical for this period), the additional inflow would breach "
                "80% operational limits in approximately 3 weeks of sustained ramp. "
                "Above 80%, operators face: forced price discounts of $1–3/bbl vs WTI benchmark; "
                "tank lease premiums; and potential mandatory inflow restrictions that feed back as production curtailments. "
                "The $22M–$110M range reflects: low end = managed discount and carry cost during a 6-week congestion event; "
                "high end = hard capacity ceiling triggering production curtailments that defeat the ramp objective. "
                "Uncertainty reduced by confirming the Cushing mechanism via DEM and known capacity figures."
            ),
            "gaps": [
                "Real-time EIA Cushing inventory data not in data store — starting utilisation is estimated",
                "Alternate hub (St James, Midland) spare capacity under simultaneous ramp not modelled",
                "Pipeline nominations and pro-ration risk at Cushing during peak inflow not quantified",
            ],
            "metrics": _m(0.16, 0.44, 22_000_000, 110_000_000,
                          "Cushing capacity mechanism confirmed; ramp inflow timeline modelled; starting utilisation estimated"),
            "artifacts": [_CUSHING_DEM, _PIPELINE_INT],
            "tokens": 1_920,
        },
    },

    # ── Step 3: GOM Offshore Buffer ───────────────────────────────────────────

    "rf_3_1": {
        "name": "Hurricane Platform Exposure",
        "d1": {
            "summary": (
                "Filename scan matched the offshore hurricane exposure report. "
                "The 13-year track record (2010–2023) shows 847 platform-days of production downtime from 18 named storms, "
                "including 4 Cat 3+ direct hits. Three high-risk assets are flagged: Platform GC-204 (1987 design, "
                "cathodic protection overdue), Platform MC-311 (mooring system re-certified 2018), and FPSO Magnolia Star "
                "(designed for 100-year return period now projected at 85-year recurrence). "
                "Named storm exclusion in the insurance policy runs June 1 – November 30, leaving the full hurricane "
                "season unprotected at the $25M structural deductible. Three claims in the past 5 years totalled $124M."
            ),
            "gaps": [
                "API RP 2MET compliance status for GC-204, MC-311, and Magnolia Star not confirmed",
                "Q1 2023 emergency disconnect test delayed — current compliance status unknown",
                "Revenue hedging and production loss coverage terms for storm downtime not provided",
            ],
            "metrics": _m(0.16, 0.66, 22_000_000, 165_000_000,
                          "Filename scan; 4 Cat 3+ hits in 13 years; 3 high-risk assets flagged; $25M structural deductible confirmed"),
            "artifacts": [_HURRICANE],
            "tokens": 258,
        },
        "d2": {
            "summary": (
                "The offshore hurricane exposure report provides strong empirical grounding: 4 Cat 3+ events "
                "crossing the GOM platform zone in 13 years (2010–2023) — a 1-in-3.25 year average. "
                "The three high-risk platforms (GC-204, MC-311, Magnolia Star) represent a combined "
                "production capacity of approximately 45 Kbbl/day; any one of them incurring structural damage "
                "triggers an extended dry-dock or repair window of 90–180 days. "
                "The BP Texas City CSB video provides a useful risk chain analogy: multiple latent equipment failures "
                "combine with an acute triggering event; for the GOM fleet, the equivalent is deferred maintenance "
                "(GC-204 cathodic protection, MC-311 mooring re-cert gap) combining with a direct storm hit. "
                "Insurance provides partial mitigation, but the named storm exclusion (June 1 – November 30) covers "
                "the entire hurricane season; claims must be absorbed at the $15M operational + $25M structural deductible. "
                "Three claims in 5 years ($34M + $12M + $78M = $124M) confirm the tail is not theoretical. "
                "The $25M–$145M range reflects: low end = Cat 2 near-miss with evacuation and short downtime; "
                "high end = Cat 3+ direct hit on GC-204 or Magnolia Star with structural damage and 4-month repair."
            ),
            "gaps": [
                "API RP 2MET compliance inspection for GC-204 and Magnolia Star not completed",
                "Q1 2023 emergency disconnect test remains delayed — BSEE follow-up status unknown",
                "MC-311 mooring system re-certification gap: structural risk under Cat 3+ loading not re-assessed",
            ],
            "metrics": _m(0.16, 0.48, 25_000_000, 145_000_000,
                          "13-year storm track record + deductible structure confirmed; Cat 3+ tail narrowed by excluding pre-Katrina structural failures"),
            "artifacts": [_HURRICANE, _CSB_VIDEO, _COMPLIANCE],
            "tokens": 2_180,
        },
    },

    "rf_3_2": {
        "name": "Coastal Subsidence Risk",
        "d1": {
            "summary": (
                "Filename scan matched the gulf subsidence report and Cushing DEM. "
                "The subsidence report identifies four zones with active pipeline exposure: "
                "Houston Ship Channel (1.2–2.1 in/yr, 34 miles), Bayou Corridor (0.6–1.4 in/yr, 18 miles), "
                "Eastern Offshore Approach (0.3–0.9 in/yr, 22 miles — last surveyed 2019), "
                "and Coastal Wetland Segments (0.8–1.8 in/yr, 41 miles). "
                "The eastern offshore approach has no survey data since 2019, representing 2.4–4.8 inches of "
                "uncharacterised cumulative movement in pipeline stress calculations. "
                "A post-2022 seismic cluster (M2.4–3.6) in Brazoria County has not been incorporated into "
                "current models. Financial exposure range: $4.2M–$67M per historical Gulf Coast pipeline incidents."
            ),
            "gaps": [
                "Eastern offshore approach survey 4 years out of date — 2.4–4.8 inches cumulative movement uncharacterised",
                "Post-2022 Brazoria County seismic cluster not in current pipeline stress models",
                "No GPS/InSAR integration for real-time subsidence monitoring",
            ],
            "metrics": _m(0.14, 0.72, 4_200_000, 67_000_000,
                          "Subsidence report matched; eastern survey gap confirmed as primary driver of range width"),
            "artifacts": [_SUBSIDENCE, _CUSHING_DEM],
            "tokens": 245,
        },
        "d2": {
            "summary": (
                "The gulf subsidence report provides zone-level subsidence rates with confirmed pipeline exposure. "
                "The most material unquantified exposure is the eastern offshore approach (22 miles, last surveyed 2019): "
                "at 0.3–0.9 in/yr, cumulative movement since 2019 is 1.2–3.6 inches per the low model, "
                "or 2.4–4.8 inches per the stress model — neither of which is captured in current pipeline "
                "stress calculations or corrosion models. This segment is also in the coastal zone affected by "
                "the post-2022 Brazoria County seismic cluster (M2.4–3.6), which the report explicitly flags as "
                "not factored into current models. "
                "The Cushing DEM provides terrain context: the flat Oklahoma-to-Gulf pipeline corridor "
                "means that subsidence is the primary vertical stress driver — there is no terrain gradient "
                "to compensate for differential foundation movement. "
                "Three pipeline segments in the Houston Ship Channel show bell-hole corrosion acceleration "
                "at differential movement rates consistent with the subsidence data. "
                "The $4.2M–$52M range reflects: low end = expedited survey + targeted pipe replacement; "
                "high end = undetected failure at the eastern approach triggering a reportable release "
                "with OPA third-party NRD liability. Uncertainty cannot be reduced further without a current survey."
            ),
            "gaps": [
                "Eastern offshore approach survey must be completed before stress models can be updated",
                "InSAR or GPS monitoring integration not in place — no real-time subsidence signal",
                "Brazoria County seismic cluster: no independent geomechanical assessment of pipeline impact completed",
            ],
            "metrics": _m(0.14, 0.54, 4_200_000, 52_000_000,
                          "Subsidence zones quantified; eastern gap identified as limiting factor; seismic cluster risk documented but unmodelled"),
            "artifacts": [_SUBSIDENCE, _PIPELINE_INT, _CUSHING_DEM],
            "tokens": 1_980,
        },
    },
}


# ── streaming generators ──────────────────────────────────────────────────────

async def stream_oil_d1(rf_id: str):
    """Yields NDJSON events for a pre-baked D1 result, with realistic pacing."""
    entry = _DATA[rf_id]
    d = entry["d1"]

    yield {"event": "step", "text": "Scanning data domains for filename matches"}
    await asyncio.sleep(0.08)

    for art in d["artifacts"]:
        yield {"event": "file_found", "filename": art.filename, "domain": art.domain}
        await asyncio.sleep(0.05)

    yield {"event": "step", "text": f"Found {len(d['artifacts'])} candidate files — compiling depth-1 summary"}
    await asyncio.sleep(0.10)

    result = AnalysisResult(
        risk_factor_id=rf_id,
        summary=d["summary"],
        gaps=d["gaps"],
        metrics=d["metrics"],
        artifacts=d["artifacts"],
        tokens_used=d["tokens"],
        depth=1,
    )
    yield {"event": "complete", "result": result.model_dump()}


async def stream_oil_d2(rf_id: str):
    """Yields NDJSON events for a pre-baked D2 result, with realistic pacing."""
    entry = _DATA[rf_id]
    d1 = entry["d1"]
    d = entry["d2"]

    yield {"event": "step", "text": "Scanning data domains for filename matches"}
    await asyncio.sleep(0.06)

    for art in d1["artifacts"]:
        yield {"event": "file_found", "filename": art.filename, "domain": art.domain}
        await asyncio.sleep(0.04)

    yield {"event": "step", "text": f"Reading {len(d['artifacts'])} document(s)"}
    await asyncio.sleep(0.10)

    yield {"event": "step", "text": "Analysing document content with LLM"}
    await asyncio.sleep(0.15)

    for gap in d["gaps"]:
        yield {"event": "signal", "text": gap}
        await asyncio.sleep(0.06)

    yield {"event": "step", "text": "Refining risk metrics and loss range"}
    await asyncio.sleep(0.10)

    yield {"event": "step", "text": "Finalising research brief"}
    await asyncio.sleep(0.06)

    result = AnalysisResult(
        risk_factor_id=rf_id,
        summary=d["summary"],
        gaps=d["gaps"],
        metrics=d["metrics"],
        artifacts=d["artifacts"],
        tokens_used=d["tokens"],
        depth=2,
    )
    yield {"event": "complete", "result": result.model_dump()}
