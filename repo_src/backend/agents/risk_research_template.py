"""
Modifiable research strategy — analogous to autoresearch's train.py.
The loop agent rewrites STRATEGY between iterations to improve uncertainty_score.
"""

# The loop agent is allowed to modify the values in this dict.
# Keys are stable; values evolve across iterations.
STRATEGY: dict = {
    # Which analytical threads to run (3-5 names)
    "threads": [
        "Historical incident record",
        "Regulatory compliance status",
        "Geospatial / physical exposure",
        "Financial loss modelling",
        "Operational controls assessment",
    ],

    # Keywords to bias document retrieval within each thread
    # (list of strings; agent appends/removes based on what proved useful)
    "doc_focus_keywords": [
        "inspection", "incident", "seismic", "regulatory", "financial",
    ],

    # Free-text instruction appended to the synthesis prompt
    # Agent can rewrite this to emphasise different aspects
    "synthesis_emphasis": (
        "Focus on quantifying the loss range. "
        "If data is sparse, widen the range and explain why."
    ),

    # How many docs to read per thread (agent may increase if score is still high)
    "max_docs_per_thread": 3,

    # Reasoning memo written by the agent — explains why it chose this strategy
    # (not used by code; purely for transparency / tsv logging)
    "agent_reasoning": "Initial default strategy — no iterations completed yet.",
}
