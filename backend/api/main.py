from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client
import uvicorn
import os
import subprocess
import asyncio
from datetime import datetime

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

@app.post("/tracker-installed")
def tracker_installed(payload: dict):
    user_id = payload["user_id"]
    supabase.table("profiles").update({"tracker_installed": True}).eq("id", user_id).execute()
    return {"status": "ok"}

@app.post("/start-tracker")
async def start_tracker(request: Request):
    data = await request.json()
    app_name = data.get("appname")
    task_id = data.get("task_id")
    if not app_name or not task_id:
        return {"error": "Missing appname or task_id"}
    subprocess.Popen(["python", "tracker.py", str(task_id), app_name])
    return {"message": f"Started tracking {app_name} for task {task_id}"}

@app.post("/stop-tracker")
async def stop_tracker(request: Request):
    data = await request.json()
    task_id = data.get("task_id")
    if not task_id:
        return {"error": "Missing task_id"}
    with open(f"stop_{task_id}.flag", "w") as f:
        f.write("stop")
    return {"message": f"Stop flag written for task {task_id}"}

@app.post("/update-usage")
async def update_usage(request: Request):
    data = await request.json()
    task_id = data.get("task_id")
    app_name = data.get("app_name")
    seconds = data.get("seconds", 60)
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    result = supabase.table("screen_time").select("id, duration_minutes").eq("task_id", task_id).maybe_single().execute()

    if result.data:
        screen_time_id = result.data["id"]
        minutes_list = result.data.get("duration_minutes") or []
        found = False
        for entry in minutes_list:
            if entry["date"] == date_str:
                entry["time"] = time_str
                entry["seconds"] += seconds
                found = True
                break
        if not found:
            minutes_list.append({"date": date_str, "time": time_str, "seconds": seconds})
        supabase.table("screen_time").update({
            "duration_minutes": minutes_list,
            "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }).eq("id", screen_time_id).execute()
    else:
        supabase.table("screen_time").insert({
            "task_id": task_id,
            "app_name": app_name,
            "date": date_str,
            "duration_minutes": [{
                "date": date_str,
                "time": time_str,
                "seconds": seconds
            }],
            "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }).execute()
    return {"message": f"Screen time updated for task {task_id}"}

@app.websocket("/ws/usage")
async def websocket_usage(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            result = supabase.table("screen_time") \
                .select("id, app_name, duration_minutes, updated_at, task_id, tasks!inner(is_active)") \
                .eq("tasks.is_active", True) \
                .execute()
            await websocket.send_json(result.data)
            await asyncio.sleep(10)
    except Exception as e:
        print("WebSocket disconnected:", e)

@app.get("/screen-time")
async def get_screen_time(task_id: int, date: str):
    result = supabase.table("screen_time").select("id, duration_minutes").eq("task_id", task_id).maybe_single().execute()
    if not result.data:
        return {"duration_minutes": []}
    today_logs = [log for log in result.data["duration_minutes"] if log["date"] == date]
    return {"duration_minutes": today_logs}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
