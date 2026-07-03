"""Simple in-memory sliding-window rate limiter.

Single-process, in-memory — fine for a demo/hackathon deployment where
there's one backend process. A deployment running multiple workers or
instances behind a load balancer would need a shared store (e.g. Redis)
instead, since this dict only lives in one process's memory.
"""

import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

RATE_LIMITED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "30"))
WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))

_hits: Dict[str, Deque[float]] = defaultdict(deque)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Limits write requests (POST/PATCH/PUT/DELETE) per client IP.
    Read requests (GET) are never limited, since the frontend polls
    several endpoints every few seconds."""

    async def dispatch(self, request: Request, call_next):
        if request.method not in RATE_LIMITED_METHODS:
            return await call_next(request)

        client_id = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window = _hits[client_id]

        while window and now - window[0] > WINDOW_SECONDS:
            window.popleft()

        if len(window) >= MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Rate limit exceeded: max {MAX_REQUESTS} write requests "
                        f"per {WINDOW_SECONDS}s. Please slow down and try again shortly."
                    )
                },
            )

        window.append(now)
        return await call_next(request)
