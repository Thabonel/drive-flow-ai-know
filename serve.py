import logging

from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)

app = FastAPI()


@app.get("/ping")
async def ping():
    return {"status": "ok"}

