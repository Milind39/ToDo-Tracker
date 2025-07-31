import time
import win32gui
import win32process
import psutil
import requests
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
API_BACKEND_URL = os.getenv("API_BACKEND_URL")  # e.g., https://your-backend.onrender.com

INTERVAL_SECONDS = 60  # Poll every minute
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_active_window_app():
    try:
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        return process.name()
    except Exception:
        return None


def get_active_tasks():
    try:
        res = supabase.table("tasks").select("id, appname").eq("is_active", True).execute()
        return res.data or []
    except Exception as e:
        print("[ERROR] Failed to fetch active tasks:", e)
        return []


def send_usage(task_id, app_name, seconds):
    try:
        response = requests.post(
            f"{API_BACKEND_URL}/update-usage",
            json={
                "task_id": task_id,
                "app_name": app_name,
                "seconds": seconds
            }
        )
        print(f"[SUCCESS] Usage sent for {app_name} ({task_id}): {response.status_code}")
    except Exception as e:
        print("[ERROR] Failed to send usage:", e)


def run_tracker():
    print("[SUCCESS] Tracker Agent started.")
    while True:
        active_window = get_active_window_app()
        if not active_window:
            time.sleep(INTERVAL_SECONDS)
            continue

        tasks = get_active_tasks()
        for task in tasks:
            if task["appname"].lower() in active_window.lower():
                print(f"[MATCH] {task['appname']} is active in {active_window}")
                send_usage(task["id"], task["appname"], INTERVAL_SECONDS)
                break

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    run_tracker()
