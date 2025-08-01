# tracker_agent.py
import time
from tracker_shared import load_credentials, get_active_window_app, get_active_tasks, send_usage

INTERVAL_SECONDS = 60

def run_tracker():
    user_id, access_token = load_credentials()
    if not user_id or not access_token:
        return

    while True:
        active_window = get_active_window_app()
        if not active_window:
            time.sleep(10)
            continue

        tasks = get_active_tasks(user_id)
        matched = False

        for task in tasks:
            if task["appname"].lower() in active_window.lower():
                send_usage(task["id"], task["appname"], INTERVAL_SECONDS, access_token)
                matched = True
                break

        time.sleep(INTERVAL_SECONDS if matched else 10)

if __name__ == "__main__":
    run_tracker()
