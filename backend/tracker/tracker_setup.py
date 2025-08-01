import os
import sys
from tracker_shared import login_prompt, add_to_startup

if __name__ == "__main__":
    user_id, access_token = login_prompt()
    if user_id and access_token:
        # Dynamically resolve tracker_agent.exe path (assumes same folder)
        current_dir = os.path.dirname(sys.executable)  # Works for .exe
        tracker_path = os.path.join(current_dir, "tracker_agent.exe")
        add_to_startup(tracker_path)
        print("🎉 Setup complete. Agent will now run in background on startup.")
