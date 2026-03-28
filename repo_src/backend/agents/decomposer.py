import json
import re
from repo_src.backend.models.business import DecomposeResponse, Step
from repo_src.backend.models.risk import RiskFactor, RiskMetrics
from repo_src.backend.llm_chat.llm_interface import ask_llm


def _m(fr, un, low, high, note="Ballpark estimate — run analysis to refine"):
    """Shorthand to build a RiskMetrics dict."""
    return {"failure_rate": fr, "uncertainty": un, "loss_range_low": low,
            "loss_range_high": high, "loss_range_note": note}


OIL_DECOMPOSITION = {
    "business_name": "Gulf Coast Oil Operator",
    "steps": [
        {
            "id": "step_1", "name": "Exploration", "position": 1,
            "description": "Seismic surveys and prospect identification",
            "risk_factors": [
                {"id": "rf_1_1", "name": "Seismic Survey Accuracy",
                 "description": "Errors in subsurface data leading to dry wells",
                 "initial_metrics": _m(0.12, 0.72, 2_000_000, 18_000_000, "Dry-well cost based on GOM average well CAPEX")},
                {"id": "rf_1_2", "name": "Geopolitical Access Risk",
                 "description": "Political instability restricting exploration licences",
                 "initial_metrics": _m(0.08, 0.78, 8_000_000, 65_000_000, "Licence forfeit and redeployment costs; wide range due to jurisdiction uncertainty")},
                {"id": "rf_1_3", "name": "Capital Allocation Risk",
                 "description": "Over-commitment of capital to low-probability prospects",
                 "initial_metrics": _m(0.18, 0.65, 12_000_000, 95_000_000, "Portfolio IRR erosion if >2 consecutive dry runs")},
            ]
        },
        {
            "id": "step_2", "name": "Extraction", "position": 2,
            "description": "Offshore drilling and well operations",
            "risk_factors": [
                {"id": "rf_2_1", "name": "Well Blowout Risk",
                 "description": "Probability and impact of uncontrolled well release",
                 "initial_metrics": _m(0.07, 0.82, 55_000_000, 520_000_000, "Macondo-calibrated tail; wide range reflects response cost uncertainty")},
                {"id": "rf_2_2", "name": "Seismic / Geological",
                 "description": "Fault proximity and seismic activity near well sites",
                 "initial_metrics": _m(0.14, 0.76, 18_000_000, 140_000_000, "Subsidence and fault-induced casing damage; post-2019 survey gap inflates range")},
                {"id": "rf_2_3", "name": "Equipment Failure",
                 "description": "BOP and drilling equipment failure rates",
                 "initial_metrics": _m(0.22, 0.58, 6_000_000, 45_000_000, "Downtime cost at GOM day rates; BOP repair leads dominate high end")},
                {"id": "rf_2_4", "name": "Hurricane / Storm Exposure",
                 "description": "Seasonal storm risk to offshore platforms",
                 "initial_metrics": _m(0.16, 0.72, 20_000_000, 180_000_000, "Cat 3+ direct hit; insurance deductibles and production loss combined")},
            ]
        },
        {
            "id": "step_3", "name": "Transportation", "position": 3,
            "description": "Pipeline and tanker logistics across Gulf and Texas",
            "risk_factors": [
                {"id": "rf_3_1", "name": "Pipeline Integrity",
                 "description": "Corrosion, subsidence, and age-related failure risk",
                 "initial_metrics": _m(0.16, 0.72, 12_000_000, 95_000_000, "ILI findings on eastern corridor; subsidence survey gap widens range")},
                {"id": "rf_3_2", "name": "Spill / Leak Risk",
                 "description": "Environmental and financial exposure from release events",
                 "initial_metrics": _m(0.10, 0.70, 25_000_000, 210_000_000, "NRD liability + cleanup; onshore vs offshore location drives 8x spread")},
                {"id": "rf_3_3", "name": "Regulatory Compliance",
                 "description": "PHMSA and state-level compliance obligations",
                 "initial_metrics": _m(0.28, 0.55, 3_000_000, 28_000_000, "6 open PHMSA conditions; penalty range per violation history")},
            ]
        },
        {
            "id": "step_4", "name": "Refining", "position": 4,
            "description": "Crude processing at Gulf Coast refineries",
            "risk_factors": [
                {"id": "rf_4_1", "name": "Fire and Explosion Risk",
                 "description": "Process safety incidents at refinery units",
                 "initial_metrics": _m(0.05, 0.82, 35_000_000, 380_000_000, "TX City benchmark for major PSI; probability low but consequence tail very wide")},
                {"id": "rf_4_2", "name": "Environmental Compliance",
                 "description": "Emissions, effluent, and EPA permit adherence",
                 "initial_metrics": _m(0.32, 0.58, 6_000_000, 55_000_000, "Enhanced 2023 monitoring requirements; consent decree risk at high end")},
                {"id": "rf_4_3", "name": "Throughput Disruption",
                 "description": "Unplanned shutdowns reducing refining capacity",
                 "initial_metrics": _m(0.18, 0.62, 10_000_000, 80_000_000, "Margin loss at $8/bbl crack spread during 30-90 day outage window")},
            ]
        },
        {
            "id": "step_5", "name": "Distribution & Sales", "position": 5,
            "description": "Fuel delivery and commodity trading",
            "risk_factors": [
                {"id": "rf_5_1", "name": "Commodity Price Volatility",
                 "description": "WTI and Brent price swings affecting margins",
                 "initial_metrics": _m(0.38, 0.48, 15_000_000, 120_000_000, "Unhedged exposure over 90-day window at ±$15/bbl scenario")},
                {"id": "rf_5_2", "name": "Storage Capacity Risk",
                 "description": "Tank farm capacity constraints and overflow risk",
                 "initial_metrics": _m(0.08, 0.68, 4_000_000, 35_000_000, "Contango carry cost + spot premium at capacity ceiling")},
                {"id": "rf_5_3", "name": "Counterparty Risk",
                 "description": "Credit exposure from trading counterparties",
                 "initial_metrics": _m(0.10, 0.62, 6_000_000, 50_000_000, "Mark-to-market exposure; concentrated counterparty book inflates tail")},
            ]
        },
    ]
}

LEMMING_DECOMPOSITION = {
    "business_name": "Arctic Lemming Farm",
    "steps": [
        {
            "id": "step_1", "name": "Habitat Management", "position": 1,
            "description": "Maintaining tundra enclosures and cliff-edge runs",
            "risk_factors": [
                {"id": "rf_1_1", "name": "Habitat Degradation",
                 "description": "Permafrost thaw and enclosure collapse risk",
                 "initial_metrics": _m(0.22, 0.72, 80_000, 650_000, "Enclosure rebuild cost + temporary capacity loss during repair")},
                {"id": "rf_1_2", "name": "Predator Ingress",
                 "description": "Arctic fox and snowy owl access to enclosures",
                 "initial_metrics": _m(0.32, 0.65, 45_000, 380_000, "Population loss cost at market rate; fox den within 180m of B-2")},
                {"id": "rf_1_3", "name": "Climate Exposure",
                 "description": "Unexpected warming events disrupting winter hibernation cycles",
                 "initial_metrics": _m(0.18, 0.80, 120_000, 1_200_000, "Metabolic stress mortality + supplemental feed cost over multi-year trend")},
            ]
        },
        {
            "id": "step_2", "name": "Breeding", "position": 2,
            "description": "Population management and reproductive cycles",
            "risk_factors": [
                {"id": "rf_2_1", "name": "Population Crash Risk",
                 "description": "Cyclical boom-bust population dynamics disrupting supply",
                 "initial_metrics": _m(0.28, 0.75, 280_000, 2_400_000, "3 consecutive suppressed peak years; lost revenue + restocking cost")},
                {"id": "rf_2_2", "name": "Disease and Parasite Risk",
                 "description": "Epizootic events in dense enclosure conditions",
                 "initial_metrics": _m(0.22, 0.72, 150_000, 1_100_000, "Full enclosure mortality scenario at B-1 density levels")},
                {"id": "rf_2_3", "name": "Nutritional Deficiency",
                 "description": "Inadequate lichen and moss availability in captivity",
                 "initial_metrics": _m(0.15, 0.65, 60_000, 450_000, "Supplemental feed cost + sub-optimal growth reducing yield")},
            ]
        },
        {
            "id": "step_3", "name": "Harvest", "position": 3,
            "description": "Ethical collection and transport of lemmings",
            "risk_factors": [
                {"id": "rf_3_1", "name": "Handler Injury Risk",
                 "description": "Bite risk and ergonomic hazards during capture",
                 "initial_metrics": _m(0.42, 0.55, 25_000, 200_000, "Workers comp + seasonal temp replacement during recovery")},
                {"id": "rf_3_2", "name": "Stress Mortality",
                 "description": "Death rates during handling and transport exceeding 15%",
                 "initial_metrics": _m(0.38, 0.62, 90_000, 720_000, "15-30% mortality at current density; market value loss per season")},
                {"id": "rf_3_3", "name": "Seasonal Timing Risk",
                 "description": "Narrow harvest windows misaligned with market demand",
                 "initial_metrics": _m(0.28, 0.65, 110_000, 850_000, "Revenue delay or forfeit if demand peaks outside harvest window")},
            ]
        },
        {
            "id": "step_4", "name": "Processing", "position": 4,
            "description": "Preparation of products for research and pet markets",
            "risk_factors": [
                {"id": "rf_4_1", "name": "Contamination Risk",
                 "description": "Pathogen transfer to processed products",
                 "initial_metrics": _m(0.18, 0.70, 65_000, 520_000, "Batch recall + decontamination; research client liability at high end")},
                {"id": "rf_4_2", "name": "Regulatory Compliance",
                 "description": "CITES and exotic animal trade regulations",
                 "initial_metrics": _m(0.22, 0.62, 40_000, 320_000, "Permit suspension scenario; legal cost + lost export season")},
                {"id": "rf_4_3", "name": "Cold Chain Failure",
                 "description": "Temperature excursion during frozen product storage",
                 "initial_metrics": _m(0.12, 0.72, 25_000, 200_000, "Single freezer failure event; insurance deductible + replacement stock")},
            ]
        },
        {
            "id": "step_5", "name": "Distribution", "position": 5,
            "description": "Delivery to research institutions and specialist pet suppliers",
            "risk_factors": [
                {"id": "rf_5_1", "name": "Demand Volatility",
                 "description": "Research grant cycles creating unpredictable order patterns",
                 "initial_metrics": _m(0.32, 0.65, 130_000, 980_000, "Grant cycle gap of 6-18 months; overhead during low-order period")},
                {"id": "rf_5_2", "name": "Transport Mortality",
                 "description": "Live specimen death rates during international shipping",
                 "initial_metrics": _m(0.42, 0.60, 55_000, 440_000, "IATA live animal regulations; 20-35% mortality in non-compliant shipments")},
                {"id": "rf_5_3", "name": "Competitor Risk",
                 "description": "Vole and hamster suppliers undercutting on price",
                 "initial_metrics": _m(0.22, 0.70, 95_000, 750_000, "Margin compression if commodity rodent substitution accelerates")},
            ]
        },
    ]
}

DECOMPOSE_SYSTEM = """You are a senior business risk analyst. Given a business description, identify the primary value chain steps and key risk factors with ballpark financial impact estimates.

Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "business_name": "Short descriptive name",
  "steps": [
    {
      "id": "step_1",
      "name": "Step name (2-4 words)",
      "description": "One sentence description",
      "position": 1,
      "risk_factors": [
        {
          "id": "rf_1_1",
          "name": "Risk factor name (3-5 words)",
          "description": "One sentence description of this specific risk",
          "initial_metrics": {
            "failure_rate": 0.15,
            "uncertainty": 0.75,
            "loss_range_low": 500000,
            "loss_range_high": 5000000,
            "loss_range_note": "One sentence explaining the range"
          }
        }
      ]
    }
  ]
}

Rules:
- 3 to 5 steps maximum
- 3 to 6 risk factors per step
- Be specific to this business, not generic
- IDs must follow the pattern step_N and rf_N_M
- failure_rate: annual probability 0.0-1.0
- uncertainty: how well-characterised this estimate is 0.0-1.0 (high = poorly known)
- loss_range in USD integers, realistic for this business scale"""


def _parse_response(text: str, max_steps: int) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    data = json.loads(text)
    steps = data.get("steps", [])[:max_steps]
    data["steps"] = steps
    return data


def _build_rf(rf_data: dict) -> RiskFactor:
    im = rf_data.get("initial_metrics")
    initial_metrics = None
    if im:
        try:
            initial_metrics = RiskMetrics(
                failure_rate=float(im.get("failure_rate", 0.15)),
                uncertainty=float(im.get("uncertainty", 0.75)),
                loss_range_low=int(im.get("loss_range_low", 100_000)),
                loss_range_high=int(im.get("loss_range_high", 1_000_000)),
                loss_range_note=im.get("loss_range_note", "Ballpark estimate"),
            )
        except Exception:
            pass
    return RiskFactor(
        id=rf_data["id"],
        name=rf_data["name"],
        description=rf_data["description"],
        initial_metrics=initial_metrics,
    )


async def decompose(description: str, max_steps: int = 5) -> DecomposeResponse:
    desc_lower = description.lower()

    if "lemming" in desc_lower:
        raw = LEMMING_DECOMPOSITION
    elif "oil" in desc_lower or "gulf" in desc_lower or "pipeline" in desc_lower:
        raw = OIL_DECOMPOSITION
    else:
        response_text = await ask_llm(
            prompt_text=f"Business description:\n{description}",
            system_message=DECOMPOSE_SYSTEM,
            max_tokens=2500,
            temperature=0.3,
        )
        try:
            raw = _parse_response(response_text, max_steps)
        except Exception as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\n\nRaw: {response_text[:500]}")

    steps = []
    for s in raw["steps"][:max_steps]:
        rfs = [_build_rf(rf) for rf in s["risk_factors"]]
        steps.append(Step(
            id=s["id"],
            name=s["name"],
            description=s["description"],
            position=s["position"],
            risk_factors=rfs,
        ))

    tokens = 150 + sum(80 + len(s.risk_factors) * 40 for s in steps)

    return DecomposeResponse(
        business_name=raw["business_name"],
        steps=steps,
        tokens_used=tokens,
    )
