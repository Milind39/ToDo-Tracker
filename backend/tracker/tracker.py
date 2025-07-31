import time
import win32gui
import win32process
import psutil
import requests
from dotenv import load_dotenv
import os
import json
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
API_BACKEND_URL = os.getenv("API_BACKEND_URL")
INTERVAL_SECONDS = 60
CONFIG_FILE = "user_config.json"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def save_credentials(user_id, access_token):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"user_id": user_id, "access_token": access_token}, f)

def login_prompt():
    print("🔐 Login to Dr. Nest Tracker")
    email = input("Email: ")
    password = input("Password: ")
    try:
        result = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        user = result.user
        access_token = result.session.access_token
        save_credentials(user.id, access_token)
        print(f"✅ Logged in as {user.email}")

        # Notify backend
        requests.post(f"{API_BACKEND_URL}/tracker-installed", json={"user_id": user.id})
        return user.id, access_token
    except Exception as e:
        print("[ERROR] Login failed:", e)
        return None, None

def get_user_id():
    with open(CONFIG_FILE, "r") as f:
        return json.load(f).get("user_id")

def get_active_window_app():
    try:
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        return process.name()
    except Exception:
        return None

def get_active_tasks():
    user_id = get_user_id()
    try:
        res = supabase.table("tasks") \
            .select("id, appname") \
            .eq("is_active", True) \
            .eq("user_id", user_id) \
            .execute()
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
    if not os.path.exists(CONFIG_FILE):
        login_prompt()

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
