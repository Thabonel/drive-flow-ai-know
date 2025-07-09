import logging
import os

from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)

OPENAI_API_KEY = <OPENAI_API_KEY>
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = <SUPABASE_ANON_KEY>

app = FastAPI()


@app.get("/ping")
async def ping():
    return {"status": "ok"}

