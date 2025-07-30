import time
import win32gui
import win32process
import psutil
import sys
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()

# Supabase init
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

INTERVAL_SECONDS = 60


def get_active_window_app():
    try:
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        return process.name()
    except Exception:
        return None


def get_active_tasks():
    res = supabase.table("tasks").select("id, appname").eq("is_active", True).execute()
    print("Active task query result:", res.data)  # 👈 add this
    return res.data if res.data else []


def update_screen_time(task_id, app_name, interval_sec=0):
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    result = (
        supabase.table("screen_time")
        .select("id, duration_minutes")
        .eq("task_id", task_id)
        .maybe_single()
        .execute()
    )

    if result and result.data:
        existing = result.data
        minutes_list = existing["duration_minutes"] or []

        found_today = False
        for entry in minutes_list:
            if entry["date"] == date_str:
                entry["time"] = time_str
                entry["seconds"] += interval_sec
                found_today = True
                break

        if not found_today:
            minutes_list.append({
                "date": date_str,
                "time": time_str,
                "seconds": interval_sec
            })

        supabase.table("screen_time").update({
            "duration_minutes": minutes_list,
            "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }).eq("id", existing["id"]).execute()

    else:
        supabase.table("screen_time").insert({
            "task_id": task_id,
            "app_name": app_name,
            "date": date_str,
            "duration_minutes": [{
                "date": date_str,
                "time": time_str,
                "seconds": interval_sec
            }],
            "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }).execute()


def stop_flag_exists(task_id):
    return os.path.exists(f"stop_{task_id}.flag")


def track_specific_task(task_id, app_name):
    print(f"[START] Tracker started for task_id {task_id} ({app_name})")
    while True:
        if stop_flag_exists(task_id):
            print(f"[STOP] Stop flag found for task {task_id}, exiting...")
            break

        active_window = get_active_window_app()
        if active_window and app_name.lower() in active_window.lower():
            print(f"[MATCHED] {app_name} matched {active_window} — +{INTERVAL_SECONDS}s")
            update_screen_time(task_id, app_name, INTERVAL_SECONDS)

        time.sleep(INTERVAL_SECONDS)


def track_all_active_tasks():
    print("[START] Tracker started. Watching for ALL active tasks...")
    while True:
        active_tasks = get_active_tasks()
        if not active_tasks:
            print("[IDLE] No active tasks. Sleeping...")
            time.sleep(10)
            continue

        active_window = get_active_window_app()
        if active_window:
            for task in active_tasks:
                if task["appname"].lower() in active_window.lower():
                    print(f"Matched {task['appname']} — task_id {task['id']} — +{INTERVAL_SECONDS}s")
                    update_screen_time(task["id"], task["appname"], INTERVAL_SECONDS)
                    break

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    if len(sys.argv) == 3:
        # Track a single specific task
        task_id = int(sys.argv[1])
        app_name = sys.argv[2]
        track_specific_task(task_id, app_name)
    else:
        # Track all active tasks
        track_all_active_tasks()
