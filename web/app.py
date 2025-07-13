# web/app.py
import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests # For making HTTP requests to the external bot API

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'a_fallback_secret_key_if_not_set')

# Get the URL for the existing bot's API from environment variables
EXISTING_BOT_API_URL = os.getenv("EXISTING_BOT_API_URL", "http://127.0.0.1:5001")

# --- API Endpoints for the UI ---

@app.route('/')
def index():
    """Renders the main management UI page."""
    return render_template('index.html')

@app.route('/api/bot_info')
# Changed from async def to def, as requests.get is synchronous
def get_bot_info():
    """
    Fetches live bot information from the external bot's API.
    Expected Bot API Endpoint: GET /status
    Expected Bot API Response: JSON object with keys:
        - "status": "Online" or "Offline"
        - "uptime": string (e.g., "1d 5h 30m")
        - "latency_ms": int (e.g., 65)
        - "guild_count": int
        - "user_count": int
        - "commands_used_today": int
    """
    try:
        # Removed 'await' as requests.get is synchronous
        response = requests.get(f"{EXISTING_BOT_API_URL}/status", timeout=5)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        bot_data = response.json()

        # Ensure all expected keys are present, providing defaults if missing
        bot_status = {
            "status": bot_data.get("status", "Offline"),
            "uptime": bot_data.get("uptime", "N/A"),
            "latency_ms": bot_data.get("latency_ms", "N/A"),
            "guild_count": bot_data.get("guild_count", 0),
            "user_count": bot_data.get("user_count", 0),
            "commands_used_today": bot_data.get("commands_used_today", 0)
        }
        return jsonify(bot_status)

    except requests.exceptions.ConnectionError:
        # Bot API is not reachable (e.g., bot is offline or API port is wrong)
        print(f"ConnectionError: Bot API not reachable at {EXISTING_BOT_API_URL}. Is your bot running and its API exposed?")
        return jsonify({
            "status": "Offline",
            "uptime": "N/A",
            "latency_ms": "N/A",
            "guild_count": 0,
            "user_count": 0,
            "commands_used_today": 0,
            "error": "Bot API not reachable. Is your bot running and its API exposed?"
        }), 200 # Return 200 OK, but indicate offline status in JSON

    except requests.exceptions.Timeout:
        # Request to bot API timed out
        print(f"Timeout: Bot API request timed out for {EXISTING_BOT_API_URL}/status.")
        return jsonify({
            "status": "Offline",
            "uptime": "N/A",
            "latency_ms": "N/A",
            "guild_count": 0,
            "user_count": 0,
            "commands_used_today": 0,
            "error": "Bot API request timed out."
        }), 200

    except requests.exceptions.RequestException as e:
        # Other request errors (e.g., HTTP 404, 500 from bot API, bad JSON)
        print(f"Error fetching bot info from external API: {e}")
        return jsonify({
            "status": "Offline",
            "uptime": "N/A",
            "latency_ms": "N/A",
            "guild_count": 0,
            "user_count": 0,
            "commands_used_today": 0,
            "error": f"Error from bot API: {e}. Check bot logs."
        }), 200
    except Exception as e:
        print(f"An unexpected error occurred in get_bot_info: {e}")
        return jsonify({
            "status": "Offline",
            "uptime": "N/A",
            "latency_ms": "N/A",
            "guild_count": 0,
            "user_count": 0,
            "commands_used_today": 0,
            "error": f"An unexpected error occurred: {e}"
        }), 500 # Return 500 for unexpected internal errors


@app.route('/api/send_announcement', methods=['POST'])
# Changed from async def to def
def send_announcement():
    """
    Sends an announcement request to the external bot's API.
    Expected Bot API Endpoint: POST /command/announce
    Expected Bot API Request Body: JSON {"channel_id": int, "message": string}
    Expected Bot API Response: JSON {"status": "success", "message": string} or {"status": "error", "error": string}
    """
    message = request.json.get('message')
    channel_id = request.json.get('channel_id')

    if not message or not channel_id:
        return jsonify({"success": False, "error": "Message and channel ID are required."}), 400

    try:
        # Removed 'await' as requests.post is synchronous
        response = requests.post(
            f"{EXISTING_BOT_API_URL}/command/announce",
            json={'channel_id': channel_id, 'message': message},
            timeout=10
        )
        response.raise_for_status()
        bot_response = response.json()

        if bot_response.get("status") == "success":
            return jsonify({"success": True, "message": bot_response.get("message", "Announcement request sent.")}), 200
        else:
            return jsonify({"success": False, "error": bot_response.get("error", "Bot command failed.")}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error sending announcement to external bot API: {e}")
        return jsonify({"success": False, "error": f"Failed to communicate with bot API: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred in send_announcement: {e}")
        return jsonify({"success": False, "error": f"An unexpected error occurred: {e}"}), 500


@app.route('/api/control_bot', methods=['POST'])
# Changed from async def to def
def control_bot():
    """
    Sends bot control actions (restart, reload cogs, update git) to the external bot's API.
    Expected Bot API Endpoint: POST /control/{action} (where action is restart, reload_cogs, or update_git)
    Expected Bot API Request Body: Empty JSON {}
    Expected Bot API Response: JSON {"status": "success", "message": string} or {"status": "error", "error": string}
    """
    action = request.json.get('action')

    if action not in ['restart', 'reload_cogs', 'update_git']:
        return jsonify({"success": False, "error": "Invalid action."}), 400

    try:
        # Removed 'await' as requests.post is synchronous
        response = requests.post(
            f"{EXISTING_BOT_API_URL}/control/{action}",
            json={}, # Send empty JSON body
            timeout=10
        )
        response.raise_for_status()
        bot_response = response.json()

        if bot_response.get("status") == "success":
            return jsonify({"success": True, "message": bot_response.get("message", f"Bot {action} initiated successfully.")}), 200
        else:
            return jsonify({"success": False, "error": bot_response.get("error", f"Bot {action} failed.")}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error sending control action to external bot API: {e}")
        return jsonify({"success": False, "error": f"Failed to communicate with bot API: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred in control_bot: {e}")
        return jsonify({"success": False, "error": f"An unexpected error occurred: {e}"}), 500


def run_flask_app():
    """
    Starts the Flask web server for the UI.
    """
    app.run(debug=True, port=5000)

if __name__ == '__main__':
    print(f"Starting Flask UI app on http://127.0.0.1:5000/")
    print(f"This UI will attempt to connect to your existing bot's API at: {EXISTING_BOT_API_URL}")
    run_flask_app()
