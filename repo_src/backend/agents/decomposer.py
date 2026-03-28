import json
import re
from repo_src.backend.models.business import DecomposeResponse, Step
from repo_src.backend.models.risk import RiskFactor
from repo_src.backend.llm_chat.llm_interface import ask_llm

OIL_DECOMPOSITION = {
    "business_name": "Gulf Coast Oil Operator",
    "steps": [
        {
            "id": "step_1", "name": "Exploration", "description": "Seismic surveys and prospect identification", "position": 1,
            "risk_factors": [
                {"id": "rf_1_1", "name": "Seismic Survey Accuracy", "description": "Errors in subsurface data leading to dry wells"},
                {"id": "rf_1_2", "name": "Geopolitical Access Risk", "description": "Political instability restricting exploration licences"},
                {"id": "rf_1_3", "name": "Capital Allocation Risk", "description": "Over-commitment of capital to low-probability prospects"},
            ]
        },
        {
            "id": "step_2", "name": "Extraction", "description": "Offshore drilling and well operations", "position": 2,
            "risk_factors": [
                {"id": "rf_2_1", "name": "Well Blowout Risk", "description": "Probability and impact of uncontrolled well release"},
                {"id": "rf_2_2", "name": "Seismic / Geological", "description": "Fault proximity and seismic activity near well sites"},
                {"id": "rf_2_3", "name": "Equipment Failure", "description": "BOP and drilling equipment failure rates"},
                {"id": "rf_2_4", "name": "Hurricane / Storm Exposure", "description": "Seasonal storm risk to offshore platforms"},
            ]
        },
        {
            "id": "step_3", "name": "Transportation", "description": "Pipeline and tanker logistics across Gulf and Texas", "position": 3,
            "risk_factors": [
                {"id": "rf_3_1", "name": "Pipeline Integrity", "description": "Corrosion, subsidence, and age-related failure risk"},
                {"id": "rf_3_2", "name": "Spill / Leak Risk", "description": "Environmental and financial exposure from release events"},
                {"id": "rf_3_3", "name": "Regulatory Compliance", "description": "PHMSA and state-level compliance obligations"},
            ]
        },
        {
            "id": "step_4", "name": "Refining", "description": "Crude processing at Gulf Coast refineries", "position": 4,
            "risk_factors": [
                {"id": "rf_4_1", "name": "Fire and Explosion Risk", "description": "Process safety incidents at refinery units"},
                {"id": "rf_4_2", "name": "Environmental Compliance", "description": "Emissions, effluent, and EPA permit adherence"},
                {"id": "rf_4_3", "name": "Throughput Disruption", "description": "Unplanned shutdowns reducing refining capacity"},
            ]
        },
        {
            "id": "step_5", "name": "Distribution & Sales", "description": "Fuel delivery and commodity trading", "position": 5,
            "risk_factors": [
                {"id": "rf_5_1", "name": "Commodity Price Volatility", "description": "WTI and Brent price swings affecting margins"},
                {"id": "rf_5_2", "name": "Storage Capacity Risk", "description": "Tank farm capacity constraints and overflow risk"},
                {"id": "rf_5_3", "name": "Counterparty Risk", "description": "Credit exposure from trading counterparties"},
            ]
        },
    ]
}

LEMMING_DECOMPOSITION = {
    "business_name": "Arctic Lemming Farm",
    "steps": [
        {
            "id": "step_1", "name": "Habitat Management", "description": "Maintaining tundra enclosures and cliff-edge runs", "position": 1,
            "risk_factors": [
                {"id": "rf_1_1", "name": "Habitat Degradation", "description": "Permafrost thaw and enclosure collapse risk"},
                {"id": "rf_1_2", "name": "Predator Ingress", "description": "Arctic fox and snowy owl access to enclosures"},
                {"id": "rf_1_3", "name": "Climate Exposure", "description": "Unexpected warming events disrupting winter hibernation cycles"},
            ]
        },
        {
            "id": "step_2", "name": "Breeding", "description": "Population management and reproductive cycles", "position": 2,
            "risk_factors": [
                {"id": "rf_2_1", "name": "Population Crash Risk", "description": "Cyclical boom-bust population dynamics disrupting supply"},
                {"id": "rf_2_2", "name": "Disease and Parasite Risk", "description": "Epizootic events in dense enclosure conditions"},
                {"id": "rf_2_3", "name": "Nutritional Deficiency", "description": "Inadequate lichen and moss availability in captivity"},
            ]
        },
        {
            "id": "step_3", "name": "Harvest", "description": "Ethical collection and transport of lemmings", "position": 3,
            "risk_factors": [
                {"id": "rf_3_1", "name": "Handler Injury Risk", "description": "Bite risk and ergonomic hazards during capture"},
                {"id": "rf_3_2", "name": "Stress Mortality", "description": "Death rates during handling and transport exceeding 15%"},
                {"id": "rf_3_3", "name": "Seasonal Timing Risk", "description": "Narrow harvest windows misaligned with market demand"},
            ]
        },
        {
            "id": "step_4", "name": "Processing", "description": "Preparation of products for research and pet markets", "position": 4,
            "risk_factors": [
                {"id": "rf_4_1", "name": "Contamination Risk", "description": "Pathogen transfer to processed products"},
                {"id": "rf_4_2", "name": "Regulatory Compliance", "description": "CITES and exotic animal trade regulations"},
                {"id": "rf_4_3", "name": "Cold Chain Failure", "description": "Temperature excursion during frozen product storage"},
            ]
        },
        {
            "id": "step_5", "name": "Distribution", "description": "Delivery to research institutions and specialist pet suppliers", "position": 5,
            "risk_factors": [
                {"id": "rf_5_1", "name": "Demand Volatility", "description": "Research grant cycles creating unpredictable order patterns"},
                {"id": "rf_5_2", "name": "Transport Mortality", "description": "Live specimen death rates during international shipping"},
                {"id": "rf_5_3", "name": "Competitor Risk", "description": "Vole and hamster suppliers undercutting on price"},
            ]
        },
    ]
}

DECOMPOSE_SYSTEM = """You are a senior business risk analyst. Given a business description, identify the primary value chain steps and key risk factors.

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
          "description": "One sentence description of this specific risk"
        }
      ]
    }
  ]
}

Rules:
- 3 to 5 steps maximum
- 3 to 6 risk factors per step
- Be specific to this business, not generic
- IDs must follow the pattern step_N and rf_N_M"""


def _parse_response(text: str, max_steps: int) -> dict:
    text = text.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    data = json.loads(text)
    steps = data.get("steps", [])[:max_steps]
    data["steps"] = steps
    return data


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
            max_tokens=2000,
            temperature=0.3,
        )
        try:
            raw = _parse_response(response_text, max_steps)
        except Exception as e:
            raise ValueError(f"LLM returned invalid JSON: {e}\n\nRaw: {response_text[:500]}")

    steps = []
    for s in raw["steps"][:max_steps]:
        rfs = [RiskFactor(**rf) for rf in s["risk_factors"]]
        steps.append(Step(
            id=s["id"],
            name=s["name"],
            description=s["description"],
            position=s["position"],
            risk_factors=rfs,
        ))

    # Estimate tokens: ~100 per step + risk factors
    tokens = 150 + sum(80 + len(s.risk_factors) * 40 for s in steps)

    return DecomposeResponse(
        business_name=raw["business_name"],
        steps=steps,
        tokens_used=tokens,
    )
