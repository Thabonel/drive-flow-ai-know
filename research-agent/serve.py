from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import os
from DeepResearchAgency.agency import agency

app = FastAPI()

# Secure CORS configuration with specific origins only
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000", 
    "https://fskwutnoxbbflzqrphro.supabase.co",
    "https://id-preview--e9679863-45e8-4512-afee-c00b1a012e4a.lovable.app",
    "https://drive-flow-ai-know.lovable.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # Disable credentials for security
    allow_methods=["POST"],   # Only allow POST requests
    allow_headers=["authorization", "content-type"],
    max_age=600,  # Cache preflight for 10 minutes
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
    # Input validation and sanitization
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload format")
    
    query = payload.get("query", "")
    if not query or not isinstance(query, str):
        raise HTTPException(status_code=400, detail="Query is required and must be a string")
    
    # Limit query length for security
    if len(query) > 10000:
        raise HTTPException(status_code=400, detail="Query too long (max 10000 characters)")
    
    # Basic content filtering - prevent potential injection attempts
    if any(keyword in query.lower() for keyword in ['<script', 'javascript:', 'data:', 'vbscript:']):
        raise HTTPException(status_code=400, detail="Invalid query content")
    
    try:
        # Enhanced timeout and error handling
        output = await asyncio.wait_for(
            app.state.agency.get_response(query.strip()), timeout=30
        )
        
        # Validate output before returning
        if not output or not isinstance(output, str):
            raise HTTPException(status_code=500, detail="Invalid response from research agent")
            
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Query timed out - please try a shorter query")
    except Exception as exc:
        # Log error securely without exposing internal details
        print(f"Research agent error: {type(exc).__name__}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    return {"input": query, "output": output}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
