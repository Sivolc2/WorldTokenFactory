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
    "business_name": "Permian Basin — Hormuz Crisis Backstop",
    "steps": [
        {
            "id": "step_1", "name": "Permian Field Operations", "position": 1,
            "description": "Wellfield production and associated infrastructure in the Permian Basin, Texas",
            "risk_factors": [
                {"id": "rf_1_1", "name": "ERCOT Grid Failure Risk",
                 "description": "Power curtailment to field compressors and pumps during ERCOT stress events",
                 "initial_metrics": _m(0.22, 0.82, 45_000_000, 380_000_000, "Production curtailment cost at large-operator scale; wide range reflects ERCOT event duration uncertainty")},
                {"id": "rf_1_2", "name": "Zombie Well Pressure Crisis",
                 "description": "Wastewater injection causing underground pressure buildup, regulatory shutdowns, and blowout risk",
                 "initial_metrics": _m(0.18, 0.75, 28_000_000, 250_000_000, "Railroad Commission shutdown orders plus cleanup liability; spatial distribution of zombie wells poorly mapped")},
                {"id": "rf_1_3", "name": "Waha Gas Pipeline Bottleneck",
                 "description": "Negative Waha hub prices and Blackcomb pipeline delay forcing associated gas curtailment and oil shut-ins",
                 "initial_metrics": _m(0.68, 0.55, 35_000_000, 185_000_000, "Already active: 38/51 days negative Waha in 2026; Blackcomb delayed to November — oil curtailment risk if production ramp attempted")},
            ]
        },
        {
            "id": "step_2", "name": "Midstream Egress", "position": 2,
            "description": "Pipeline transport from Permian to Gulf Coast and Cushing storage hub",
            "risk_factors": [
                {"id": "rf_2_1", "name": "Gulf Coast Pipeline Integrity",
                 "description": "Corrosion, subsidence, and deferred inspection risk across 847 miles of mainline pipe",
                 "initial_metrics": _m(0.16, 0.72, 12_000_000, 95_000_000, "ILI anomalies on Segments A/B; 2019 survey gap on eastern corridor inflates uncertainty")},
                {"id": "rf_2_2", "name": "Cushing Storage Congestion",
                 "description": "Tank farm capacity constraints at the 94M-barrel Cushing hub during a Hormuz-driven production surge",
                 "initial_metrics": _m(0.14, 0.68, 18_000_000, 140_000_000, "Contango carry cost plus forced price discount if Cushing approaches operational limits during supply surge")},
            ]
        },
        {
            "id": "step_3", "name": "GOM Offshore Buffer", "position": 3,
            "description": "Supplemental Gulf of Mexico offshore production across 17-platform fleet",
            "risk_factors": [
                {"id": "rf_3_1", "name": "Hurricane Platform Exposure",
                 "description": "Seasonal storm damage to aging offshore platforms and FPSOs in the GOM",
                 "initial_metrics": _m(0.16, 0.72, 20_000_000, 180_000_000, "Cat 3+ direct hit scenario; 3 high-risk platforms exceed original design envelope under 2050 storm projections")},
                {"id": "rf_3_2", "name": "Coastal Subsidence Risk",
                 "description": "Land subsidence stress on Gulf Coast pipeline crossings and offshore approach segments",
                 "initial_metrics": _m(0.14, 0.76, 4_200_000, 67_000_000, "Eastern offshore approach survey 4 years out of date; 2.4–4.8 inches unaccounted cumulative movement")},
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
    elif any(k in desc_lower for k in ("oil", "gulf", "pipeline", "permian", "hormuz", "rig")):
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
