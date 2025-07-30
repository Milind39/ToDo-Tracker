from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware  # ✅ NEW
from supabase import create_client
import subprocess
import asyncio
import os
import uvicorn
from dotenv import load_dotenv
load_dotenv()

# ✅ FastAPI app instance
app = FastAPI()

# ✅ Enable CORS for all origins (you can restrict it to frontend domain later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔐 Change to ["http://localhost:3000"] if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Supabase client setup
supabase = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))

# ✅ Start Tracker
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

# ✅ Stop Tracker
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


# ✅ WebSocket: stream screen_time for active tasks
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

# ✅ Get screen time for a task by date
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

        # Check if today's date entry already exists
        today_logs = [log for log in all_logs if log.get("date") == date]

        if not today_logs:
            # Append today's default entry
            new_entry = {
                "date": date,
                "time": "00:00",
                "seconds": 0,
            }
            all_logs.append(new_entry)

            # Update the screen_time row
            update_resp = supabase.table("screen_time") \
                .update({"duration_minutes": all_logs}) \
                .eq("id", screen_time_id) \
                .execute()

            print("New date entry added:", new_entry)

            return {"duration_minutes": [new_entry]}

        return {"duration_minutes": today_logs}

    except Exception as e:
        print("Error in /screen-time:", e)
        return {"duration_minutes": [], "error": str(e)}


# ✅ Start server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
