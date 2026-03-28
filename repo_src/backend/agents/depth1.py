import re
from typing import AsyncGenerator
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics, StreamEvent
from repo_src.backend.services.data_source import list_files, list_domains, read_file


def _keywords(text: str) -> set[str]:
    words = re.findall(r"[a-z]+", text.lower())
    stopwords = {"and", "or", "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by", "from", "is", "are", "was"}
    return {w for w in words if len(w) > 2 and w not in stopwords}


def _match_score(risk_keywords: set[str], filename: str) -> int:
    fname_keywords = _keywords(filename)
    return len(risk_keywords & fname_keywords)


async def analyse_depth1(
    risk_factor_id: str,
    risk_factor_name: str,
    business_context: str,
    step_context: str,
    data_domains: list[str],
) -> AsyncGenerator[dict, None]:
    yield {"event": "step", "text": f"Scanning {len(data_domains)} domain(s) for filename matches"}

    risk_keywords = _keywords(risk_factor_name + " " + business_context)

    # Use provided domains, fall back to all available
    available = set(list_domains())
    domains_to_scan = [d for d in data_domains if d in available] or list(available)

    matched: list[tuple[int, str, str]] = []  # (score, domain, filename)
    for domain in domains_to_scan:
        files = list_files(domain)
        for f in files:
            score = _match_score(risk_keywords, f.filename)
            if score > 0:
                matched.append((score, domain, f.filename))
                yield {"event": "file_found", "filename": f.filename, "domain": domain}

    matched.sort(key=lambda x: -x[0])
    top_matches = matched[:8]

    yield {"event": "step", "text": f"Found {len(top_matches)} candidate files via filename analysis"}

    artifacts = []
    for score, domain, filename in top_matches:
        files = list_files(domain)
        ftype = next((f.type for f in files if f.filename == filename), "document")
        url = None
        if ftype == "youtube":
            try:
                url = read_file(domain, filename)
                if isinstance(url, bytes):
                    url = url.decode("utf-8", errors="replace")
                url = url.strip()
            except Exception:
                url = None
        artifacts.append(Artifact(
            filename=filename,
            domain=domain,
            type=ftype,
            relevance=f"Filename keyword match (score {score}) for '{risk_factor_name}'",
            url=url,
        ))

    file_count = len(top_matches)
    # Depth-1 metrics: wide uncertainty, rough estimates
    base_loss_low = 500_000 * (1 + len(risk_keywords) % 5)
    base_loss_high = base_loss_low * 15

    metrics = RiskMetrics(
        failure_rate=0.05 + (len(risk_keywords) % 7) * 0.04,
        uncertainty=0.80,
        loss_range_low=base_loss_low,
        loss_range_high=base_loss_high,
        loss_range_note="Wide range — depth-1 filename scan only. Run depth-2 for content-based estimates.",
    )

    gaps = [
        "No file content read at this depth — filenames only",
        "Risk quantification requires depth-2 content analysis",
        f"Found {file_count} potentially relevant files; relevance unverified",
    ]

    summary = (
        f"Depth-1 scan for '{risk_factor_name}' identified {file_count} potentially relevant files "
        f"across {len(domains_to_scan)} domain(s) by filename keyword matching. "
        f"Context: {business_context[:120]}. "
        "No file content was read at this depth. Upgrade to depth-2 for a detailed brief."
    )

    tokens_used = 150 + file_count * 20
    result = AnalysisResult(
        risk_factor_id=risk_factor_id,
        summary=summary,
        gaps=gaps,
        metrics=metrics,
        artifacts=artifacts,
        tokens_used=tokens_used,
        depth=1,
    )

    yield {"event": "complete", "result": result.model_dump()}
