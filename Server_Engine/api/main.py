"""
Thin FastAPI wrapper around the Engine. Streams progress via SSE and
returns the final EngineResponse as JSON. Intentionally minimal — this
is the seam the frontend team builds against; everything past this
contract (map rendering, chat UI) is out of scope for the model backend.
"""

import asyncio
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse

from core.schemas import EngineRequest
from core.orchestrator import Engine

app = FastAPI()

# Wire up real trained adapters before serving:
# from models.base import load_base_model, load_trained_adapter
# base_model, processor = load_base_model()
# adapter_a = load_trained_adapter(base_model, "models/adapter_a")
# adapter_b = load_trained_adapter(base_model, "models/adapter_b")
# engine = Engine(adapter_a=adapter_a, adapter_b=adapter_b)
engine: Engine | None = None


@app.post("/query/stream")
async def query_stream(request: EngineRequest):
    async def event_generator():
        yield {"event": "progress", "data": "Validating spatial metadata & CRS..."}
        await asyncio.sleep(0)
        yield {"event": "progress", "data": "Classifying query intent..."}
        await asyncio.sleep(0)
        yield {"event": "progress", "data": "Dispatching specialist model..."}
        await asyncio.sleep(0)

        if engine is None:
            yield {"event": "error", "data": "Engine not configured — wire up trained adapters."}
            return

        # Blocking model inference runs in a thread so this event loop
        # stays free to keep the SSE connection alive.
        response = await asyncio.to_thread(engine.run, request)

        yield {"event": "progress", "data": "Vectorizing evidence..."}
        yield {"event": "result", "data": response.model_dump_json()}

    return EventSourceResponse(event_generator())
