# tracker_shared.py
import os
import json
import time
import sys
from pathlib import Path
import winreg
import requests
import win32gui
import win32process
import psutil
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
API_BACKEND_URL = os.getenv("API_BACKEND_URL")
INTERVAL_SECONDS = 60
CONFIG_FILE = Path.home() / ".todo_tracker_config.json"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def save_credentials(user_id, access_token):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"user_id": user_id, "access_token": access_token}, f)


def load_credentials():
    try:
        with open(CONFIG_FILE, "r") as f:
            data = json.load(f)
            return data.get("user_id"), data.get("access_token")
    except Exception:
        return None, None


def add_to_startup(agent_path=None):
    exe_path = agent_path or sys.executable
    reg_key = r"Software\Microsoft\Windows\CurrentVersion\Run"
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_key, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, "ToDoTracker", 0, winreg.REG_SZ, exe_path)
        print("✅ Tracker added to Windows startup.")
    except Exception as e:
        print("⚠️ Failed to add tracker to startup:", e)


def login_prompt():
    print("🔐 Login to ToDo-Tracker")
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
        requests.post(
            f"{API_BACKEND_URL}/tracker-installed",
            json={"user_id": user.id},
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return user.id, access_token
    except Exception as e:
        print("[ERROR] Login failed:", e)
        return None, None


def get_active_window_app():
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd == 0:
            return None
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        process = psutil.Process(pid)
        return process.name()
    except Exception as e:
        print("[WARN] Could not get active window:", e)
        return None


def get_active_tasks(user_id):
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


def send_usage(task_id, app_name, seconds, token):
    try:
        response = requests.post(
            f"{API_BACKEND_URL}/update-usage",
            json={
                "task_id": task_id,
                "app_name": app_name,
                "seconds": seconds
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        if response.status_code == 401:
            print("[ERROR] Unauthorized - token may be expired. Please re-login.")
            return False
        print(f"[SUCCESS] Usage sent for {app_name} ({task_id}): {response.status_code}")
        return True
    except Exception as e:
        print("[ERROR] Failed to send usage:", e)
        return True
