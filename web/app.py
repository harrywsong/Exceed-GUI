# web/app.py
import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests # For making HTTP requests to the external bot API
import logging # Import logging module

# Load environment variables from .env file
load_dotenv()

# Configure Flask for the web UI
# These paths are relative to the location of app.py (i.e., 'web/')
app = Flask(__name__,
            static_folder='static',    # Points to web/static
            template_folder='templates') # Points to web/templates
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'a_fallback_secret_key_if_not_set')

# Configure logging for the Flask UI app
logging.basicConfig(level=logging.INFO,
                    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')
ui_logger = logging.getLogger(__name__)

# Add this line to suppress werkzeug INFO level messages in the Flask UI's console
logging.getLogger('werkzeug').setLevel(logging.ERROR)


# Get the URL for the existing bot's API from environment variables
EXISTING_BOT_API_URL = os.getenv("EXISTING_BOT_API_URL", "http://127.0.0.1:5001")
ui_logger.info(f"UI configured to connect to bot API at: {EXISTING_BOT_API_URL}")

# --- API Endpoints for the UI ---

@app.route('/')
def index():
    """Renders the main management UI page."""
    return render_template('index.html')

@app.route('/api/bot_info')
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
        ui_logger.warning(f"ConnectionError: Bot API not reachable at {EXISTING_BOT_API_URL}. Is your bot running and its API exposed?")
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
        ui_logger.warning(f"Timeout: Bot API request timed out for {EXISTING_BOT_API_URL}/status.")
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
        ui_logger.error(f"Error fetching bot info from external API: {e}")
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
        ui_logger.critical(f"An unexpected error occurred in get_bot_info: {e}", exc_info=True)
        return jsonify({
            "status": "Offline",
            "uptime": "N/A",
            "latency_ms": "N/A",
            "guild_count": 0,
            "user_count": 0,
            "commands_used_today": 0,
            "error": f"An unexpected error occurred: {e}"
        }), 500


@app.route('/api/send_announcement', methods=['POST'])
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
        ui_logger.error(f"Error sending announcement to external bot API: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to communicate with bot API: {e}"}), 500
    except Exception as e:
        ui_logger.critical(f"An unexpected error occurred in send_announcement: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"An unexpected error occurred: {e}"}), 500


@app.route('/api/control_bot', methods=['POST'])
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
        ui_logger.error(f"Error sending control action to external bot API: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to communicate with bot API: {e}"}), 500
    except Exception as e:
        ui_logger.critical(f"An unexpected error occurred in control_bot: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"An unexpected error occurred: {e}"}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs_proxy():
    """
    Proxies the request to the bot's /logs endpoint to fetch log data.
    """
    try:
        response = requests.get(f"{EXISTING_BOT_API_URL}/logs", timeout=15)
        response.raise_for_status()
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        ui_logger.error(f"Error proxying logs request to bot API: {e}", exc_info=True)
        return jsonify({"status": "error", "error": f"Failed to fetch logs from bot API: {e}"}), 500
    except Exception as e:
        ui_logger.critical(f"An unexpected error occurred in get_logs_proxy: {e}", exc_info=True)
        return jsonify({"status": "error", "error": f"An unexpected error occurred: {e}"}), 500


@app.route('/api/command_stats', methods=['GET'])
def get_command_stats_proxy():
    """
    Proxies the request to the bot's /command_stats endpoint to fetch command usage data.
    """
    try:
        response = requests.get(f"{EXISTING_BOT_API_URL}/command_stats", timeout=15)
        response.raise_for_status()
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        ui_logger.error(f"Error proxying command stats request to bot API: {e}", exc_info=True)
        return jsonify({"status": "error", "error": f"Failed to fetch command stats from bot API: {e}"}), 500
    except Exception as e:
        ui_logger.critical(f"An unexpected error occurred in get_command_stats_proxy: {e}", exc_info=True)
        return jsonify({"status": "error", "error": f"An unexpected error occurred: {e}"}), 500


def run_flask_app():
    """
    Starts the Flask web server for the UI.
    """
    app.run(host='127.0.0.1', port=5000, debug=True)

if __name__ == '__main__':
    # The bot's API server is assumed to be started by bot.py itself.
    # We no longer attempt to start it from app.py.
    # You must run bot.py and app.py in separate processes/terminals.

    ui_logger.info(f"Starting Flask UI app on http://127.0.0.1:5000/")
    ui_logger.info(f"Ensure your bot's API is running separately on {EXISTING_BOT_API_URL}")
    run_flask_app()
