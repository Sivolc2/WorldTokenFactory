from threading import Lock
from typing import Optional

_DEPTH_ESTIMATE_RANGES = {
    1: (200, 800),
    2: (1500, 4000),
    3: (8000, 25000),
}
_FILES_PER_TOKEN_ESTIMATE = 300  # rough tokens per file at depth 2+


class TokenCounter:
    def __init__(self):
        self._lock = Lock()
        self._total = 0
        self._by_request: dict[str, int] = {}

    def record(self, request_id: str, tokens: int, depth: int = 1) -> None:
        with self._lock:
            self._total += tokens
            self._by_request[request_id] = self._by_request.get(request_id, 0) + tokens

    def get_total(self) -> int:
        return self._total

    def get_by_request(self, request_id: str) -> int:
        return self._by_request.get(request_id, 0)

    def estimate(self, depth: int, file_count: int = 0) -> tuple[int, int]:
        base_low, base_high = _DEPTH_ESTIMATE_RANGES.get(depth, (500, 2000))
        if depth >= 2 and file_count > 0:
            extra = file_count * _FILES_PER_TOKEN_ESTIMATE
            return base_low + extra, base_high + extra * 2
        return base_low, base_high


# Module-level singleton
counter = TokenCounter()
