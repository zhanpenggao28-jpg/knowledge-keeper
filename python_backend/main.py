import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from database.engine import init_db
from routers import items, search, tags, processing, collections
from workers.processor import run_processor
import config
import os

stop_event = asyncio.Event()
worker_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_task
    init_db(config.DB_PATH)
    worker_task = asyncio.create_task(run_processor(stop_event))
    yield
    stop_event.set()
    if worker_task:
        worker_task.cancel()


app = FastAPI(
    title="知识管家 API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(search.router)
app.include_router(tags.router)
app.include_router(processing.router)
app.include_router(collections.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/files/{file_path:path}")
def serve_file(file_path: str):
    full_path = os.path.join(config.FILES_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(full_path)
