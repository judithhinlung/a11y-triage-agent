from fastapi import FastAPI
import uvicorn
import os

app = FastAPI(title="ml-service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8004))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
