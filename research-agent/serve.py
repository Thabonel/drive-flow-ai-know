from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCRIPT_PATH = Path(__file__).parent / "DeepResearchAgency" / "agency.py"

@app.post("/query")
async def run_query(payload: dict):
    query = payload.get("query", "")
    completed = subprocess.run(
        ["python", str(SCRIPT_PATH)],
        input=f"{query}\nquit\n",
        capture_output=True,
        text=True,
    )
    return {"input": query, "output": completed.stdout}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
