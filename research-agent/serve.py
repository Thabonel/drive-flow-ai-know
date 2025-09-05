from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from DeepResearchAgency.agency import agency

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    app.state.agency = agency

@app.post("/query")
async def run_query(payload: dict):
    query = payload.get("query", "")
    try:
        output = await asyncio.wait_for(
            app.state.agency.get_response(query), timeout=30
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Query timed out")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"input": query, "output": output}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
