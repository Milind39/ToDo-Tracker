from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import subprocess
import asyncio
import os
import uvicorn
from datetime import datetime

load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

# POST: Start tracker for specific task
@app.post("/start-tracker")
async def start_tracker(request: Request):
    data = await request.json()
    app_name = data.get("appname")
    task_id = data.get("task_id")

    if not app_name or not task_id:
        return {"error": "Missing appname or task_id"}

    with open(f"tracker_log_{task_id}.txt", "w") as f:
        subprocess.Popen(
            ["python", "tracker.py", str(task_id), app_name],
            stdout=f,
            stderr=f
        )

    return {"message": f"Started tracking {app_name} for task {task_id}"}

# POST: Stop tracker
@app.post("/stop-tracker")
async def stop_tracker(request: Request):
    data = await request.json()
    task_id = data.get("task_id")

    if not task_id:
        return {"error": "Missing task_id"}

    flag_path = f"stop_{task_id}.flag"
    with open(flag_path, "w") as f:
        f.write("stop")

    return {"message": f"Stop flag written for task {task_id}"}

# WebSocket: Live screen time updates
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

# GET: Fetch screen time for a task by date
@app.get("/screen-time")
async def get_screen_time(task_id: int, date: str):
    try:
        result = supabase.table("screen_time") \
            .select("id, duration_minutes") \
            .eq("task_id", task_id) \
            .maybe_single() \
            .execute()

        if result.data is None:
            print("No screen_time entry for task_id:", task_id)
            return {"duration_minutes": []}

        screen_time_id = result.data.get("id")
        all_logs = result.data.get("duration_minutes", [])

        today_logs = [log for log in all_logs if log.get("date") == date]

        if not today_logs:
            new_entry = {
                "date": date,
                "time": "00:00",
                "seconds": 0,
            }
            all_logs.append(new_entry)

            supabase.table("screen_time") \
                .update({"duration_minutes": all_logs}) \
                .eq("id", screen_time_id) \
                .execute()

            print("New date entry added:", new_entry)
            return {"duration_minutes": [new_entry]}

        return {"duration_minutes": today_logs}

    except Exception as e:
        print("Error in /screen-time:", e)
        return {"duration_minutes": [], "error": str(e)}

# POST: Update screen time from tracker agent
@app.post("/update-usage")
async def update_usage(request: Request):
    data = await request.json()
    task_id = data.get("task_id")
    app_name = data.get("app_name")
    seconds = data.get("seconds", 60)

    if not task_id or not app_name:
        return {"error": "Missing task_id or app_name"}

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    try:
        result = (
            supabase.table("screen_time")
            .select("id, duration_minutes")
            .eq("task_id", task_id)
            .maybe_single()
            .execute()
        )

        if result.data:
            screen_time_id = result.data["id"]
            minutes_list = result.data.get("duration_minutes") or []

            found_today = False
            for entry in minutes_list:
                if entry["date"] == date_str:
                    entry["time"] = time_str
                    entry["seconds"] += seconds
                    found_today = True
                    break

            if not found_today:
                minutes_list.append({
                    "date": date_str,
                    "time": time_str,
                    "seconds": seconds
                })

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

    except Exception as e:
        print("Error in /update-usage:", e)
        return {"error": str(e)}


# Run server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
