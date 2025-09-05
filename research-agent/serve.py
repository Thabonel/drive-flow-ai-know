from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import os
from DeepResearchAgency.agency import agency

app = FastAPI()

# Only allow specific origins in production
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://fskwutnoxbbflzqrphro.supabase.co",
    "https://*.lovableproject.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["authorization", "content-type"],
)

security = HTTPBearer()

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key or workspace token"""
    expected_key = os.getenv('RESEARCH_AGENT_API_KEY')
    if not expected_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    if credentials.credentials != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return credentials.credentials


@app.on_event("startup")
async def startup_event():
    app.state.agency = agency

@app.post("/query")
async def run_query(payload: dict, api_key: str = Depends(verify_api_key)):
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
