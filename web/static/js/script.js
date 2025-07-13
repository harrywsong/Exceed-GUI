document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    // Ensure your Flask API is running on this URL and port (e.g., in bot.py)
    const API_BASE_URL = 'http://127.0.0.1:5001';

    // --- Dashboard Elements ---
    const statusIndicator = document.getElementById('status');
    const uptimeElement = document.getElementById('uptime');
    const latencyElement = document.getElementById('latency');
    const commandsTodayElement = document.getElementById('commands-today');
    const activeUsersElement = document.getElementById('active-users');
    const serverCountElement = document.getElementById('server-count');

    // --- Bot Control Panel Elements ---
    const restartBotBtn = document.getElementById('restart-bot-btn');
    const reloadCogsBtn = document.getElementById('reload-cogs-btn');
    const updateGitBtn = document.getElementById('update-git-btn');
    const controlStatusMessage = document.getElementById('control-status-message');

    // --- Send Announcement Elements ---
    const announcementMessageInput = document.getElementById('announcement-message');
    const announcementChannelInput = document.getElementById('announcement-channel');
    const sendAnnouncementBtn = document.getElementById('send-announcement-btn');
    const announcementStatusMessage = document.getElementById('announcement-status-message');

    // --- Command Usage Stats Elements ---
    const commandUsageChartCtx = document.getElementById('commandUsageChart').getContext('2d');
    const topCommandsList = document.getElementById('top-commands-list');
    let commandUsageChart; // To hold the Chart.js instance

    // --- Logs Viewer Elements ---
    const logOutput = document.getElementById('log-output');
    const logFilterInput = document.getElementById('log-filter');
    const logLevelFilterSelect = document.getElementById('log-level-filter');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const downloadLogsBtn = document.getElementById('download-logs-btn');

    let allLogEntries = []; // Will store fetched log entries


    /**
     * Displays a message in a specified element with a given type (success, error, info).
     * The message will fade out after a few seconds.
     * @param {HTMLElement} messageElement - The HTML element to display the message in.
     * @param {string} message - The message text.
     * @param {'success'|'error'|'info'} type - The type of message for styling.
     */
    function showMessage(messageElement, message, type) {
        messageElement.textContent = message;
        messageElement.className = `message show ${type}`; // Apply classes
        setTimeout(() => {
            messageElement.classList.remove('show'); // Fade out
            // Optionally clear text after fade out for cleaner re-display
            setTimeout(() => messageElement.textContent = '', 300);
        }, 3000); // Message visible for 3 seconds
    }

    // --- Dashboard Functions ---
    /**
     * Fetches bot status from the backend API and updates the dashboard.
     */
    async function fetchBotStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            const data = await response.json();

            if (response.ok) {
                statusIndicator.textContent = data.status;
                statusIndicator.className = `status-indicator ${data.status.toLowerCase()}`;
                uptimeElement.textContent = data.uptime;
                latencyElement.textContent = `${data.latency_ms} ms`;
                // commandsTodayElement.textContent is now updated by fetchCommandUsageStats
                activeUsersElement.textContent = data.user_count;
                serverCountElement.textContent = data.guild_count;
            } else {
                console.error('Failed to fetch bot status:', data.error);
                statusIndicator.textContent = 'Error';
                statusIndicator.className = 'status-indicator error';
                // Clear other fields or set to error state
                uptimeElement.textContent = 'N/A';
                latencyElement.textContent = 'N/A';
                commandsTodayElement.textContent = 'N/A';
                activeUsersElement.textContent = 'N/A';
                serverCountElement.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Network error fetching bot status:', error);
            statusIndicator.textContent = 'Offline (API Error)';
            statusIndicator.className = 'status-indicator offline';
            uptimeElement.textContent = 'N/A';
            latencyElement.textContent = 'N/A';
            commandsTodayElement.textContent = 'N/A';
            activeUsersElement.textContent = 'N/A';
            serverCountElement.textContent = 'N/A';
        }
    }

    // --- Bot Control Panel Functions ---
    /**
     * Sends a control action request to the backend API.
     * @param {string} endpoint - The API endpoint for the action (e.g., '/control/restart').
     * @param {string} actionName - A user-friendly name for the action (e.g., "Restart Bot").
     * @param {HTMLElement} messageElement - The element to display status messages.
     */
    async function sendControlAction(endpoint, actionName, messageElement) {
        showMessage(messageElement, `Attempting to ${actionName.toLowerCase()}...`, 'info');
        // Disable buttons during action
        restartBotBtn.disabled = true;
        reloadCogsBtn.disabled = true;
        updateGitBtn.disabled = true;
        sendAnnouncementBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showMessage(messageElement, `${actionName} successful! ${data.message || ''}`, 'success');
                // Immediately refresh dashboard stats after a successful control action
                fetchBotStatus();
                fetchCommandUsageStats(); // Also refresh command stats
                fetchLogs(); // And logs, in case actions generate new log entries
            } else {
                showMessage(messageElement, `${actionName} failed: ${data.error || 'Unknown error'}`, 'error');
                console.error(`${actionName} API error:`, data.error);
            }
        } catch (error) {
            showMessage(messageElement, `Network error during ${actionName.toLowerCase()}: ${error.message}`, 'error');
            console.error(`Network error for ${actionName}:`, error);
        } finally {
            // Re-enable buttons
            restartBotBtn.disabled = false;
            reloadCogsBtn.disabled = false;
            updateGitBtn.disabled = false;
            sendAnnouncementBtn.disabled = false;
        }
    }

    /**
     * Sets up event listeners for bot control buttons.
     */
    function setupControlPanelListeners() {
        restartBotBtn.addEventListener('click', () => sendControlAction('/control/restart', 'Restart Bot', controlStatusMessage));
        reloadCogsBtn.addEventListener('click', () => sendControlAction('/control/reload_cogs', 'Reload Cogs', controlStatusMessage));
        updateGitBtn.addEventListener('click', () => sendControlAction('/control/update_git', 'Update from Git', controlStatusMessage));
    }

    // --- Send Announcement Functions ---
    /**
     * Handles sending an announcement via the backend API.
     */
    async function handleSendAnnouncement() {
        const message = announcementMessageInput.value.trim();
        const channelId = announcementChannelInput.value.trim();

        if (!message) {
            showMessage(announcementStatusMessage, 'Please enter an announcement message.', 'error');
            return;
        }
        if (!channelId || !/^\d{17,19}$/.test(channelId)) { // Basic Discord channel ID validation (17-19 digits)
            showMessage(announcementStatusMessage, 'Please enter a valid Discord channel ID (17-19 digits).', 'error');
            return;
        }

        showMessage(announcementStatusMessage, 'Sending announcement...', 'info');
        sendAnnouncementBtn.disabled = true; // Disable button during sending

        try {
            const response = await fetch(`${API_BASE_URL}/command/announce`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId, message: message })
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showMessage(announcementStatusMessage, `Announcement sent! ${data.message || ''}`, 'success');
                announcementMessageInput.value = ''; // Clear message
                fetchLogs(); // Fetch logs again in case the announcement was logged
            } else {
                showMessage(announcementStatusMessage, `Failed to send announcement: ${data.error || 'Unknown error'}`, 'error');
                console.error('Announcement API error:', data.error);
            }
        } catch (error) {
            showMessage(announcementStatusMessage, `Network error sending announcement: ${error.message}`, 'error');
            console.error('Network error for announcement:', error);
        } finally {
            sendAnnouncementBtn.disabled = false; // Re-enable button
        }
    }

    /**
     * Sets up event listeners for the announcement sender.
     */
    function setupAnnouncementSenderListeners() {
        sendAnnouncementBtn.addEventListener('click', handleSendAnnouncement);
    }

    // --- Command Usage Stats Functions ---
    /**
     * Fetches command usage statistics from the backend API and updates the chart and list.
     */
    async function fetchCommandUsageStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/command_stats`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                const commandStats = data.command_stats;
                const labels = commandStats.map(stat => stat.command_name);
                const dataValues = commandStats.map(stat => stat.usage_count);

                // Update the "Commands Used Today" in the dashboard overview
                const totalCommands = dataValues.reduce((sum, count) => sum + count, 0);
                commandsTodayElement.textContent = totalCommands;

                if (commandUsageChart) {
                    commandUsageChart.data.labels = labels;
                    commandUsageChart.data.datasets[0].data = dataValues;
                    commandUsageChart.update();
                } else {
                    initCommandUsageChart(labels, dataValues);
                }
                updateTopCommandsList(commandStats);
            } else {
                console.error('Failed to fetch command stats:', data.error);
                commandsTodayElement.textContent = 'Error';
                // Clear chart and list or show error
                if (commandUsageChart) {
                    commandUsageChart.data.labels = [];
                    commandUsageChart.data.datasets[0].data = [];
                    commandUsageChart.update();
                }
                topCommandsList.innerHTML = '<li>Error fetching command stats.</li>';
            }
        } catch (error) {
            console.error('Network error fetching command stats:', error);
            commandsTodayElement.textContent = 'N/A';
            if (commandUsageChart) {
                commandUsageChart.data.labels = [];
                commandUsageChart.data.datasets[0].data = [];
                commandUsageChart.update();
            }
            topCommandsList.innerHTML = '<li>Network error fetching command stats.</li>';
        }
    }

    /**
     * Initializes the Chart.js graph for command usage.
     * @param {string[]} labels - Array of command names.
     * @param {number[]} dataValues - Array of usage counts.
     */
    function initCommandUsageChart(labels, dataValues) {
        commandUsageChart = new Chart(commandUsageChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Commands Used',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(88, 101, 242, 0.8)', // Discord blue
                        'rgba(114, 137, 218, 0.8)', // Lighter Discord blue
                        'rgba(255, 159, 64, 0.8)', // Orange
                        'rgba(75, 192, 192, 0.8)', // Teal
                        'rgba(255, 99, 132, 0.8)', // Red
                        'rgba(153, 102, 255, 0.8)', // Violet
                        'rgba(201, 203, 207, 0.8)' // Grey
                    ],
                    borderColor: [
                        'rgba(88, 101, 242, 1)',
                        'rgba(114, 137, 218, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(201, 203, 207, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#333'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                }
            }
        });
    }

    /**
     * Updates the "Top Commands" list based on current command usage data.
     * @param {Array<Object>} commandStats - Array of command stat objects {command_name: string, usage_count: number}.
     */
    function updateTopCommandsList(commandStats) {
        topCommandsList.innerHTML = ''; // Clear existing list

        commandStats.forEach(stat => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>!${stat.command_name}:</span> <span>${stat.usage_count} uses</span>`;
            topCommandsList.appendChild(listItem);
        });
    }

    // --- Logs Viewer Functions ---
    /**
     * Fetches log entries from the backend API and renders them.
     */
    async function fetchLogs() {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                allLogEntries = data.logs.map(logLine => {
                    // Attempt to parse log line into structured object
                    // Example log format: "[{asctime}] [{levelname:.<8}] [{name}] {message}"
                    const match = logLine.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(.*?)\s*\] \[(.*?)\] (.*)$/);
                    if (match) {
                        return {
                            timestamp: match[1],
                            level: match[2].trim().toUpperCase(),
                            name: match[3].trim(),
                            message: match[4].trim()
                        };
                    }
                    // Fallback for unparsed lines
                    return { timestamp: 'N/A', level: 'UNKNOWN', message: logLine.trim() };
                });
                renderLogs();
            } else {
                console.error('Failed to fetch logs:', data.error);
                logOutput.innerHTML = '<p class="log-entry error">Error fetching logs.</p>';
            }
        } catch (error) {
            console.error('Network error fetching logs:', error);
            logOutput.innerHTML = '<p class="log-entry error">Network error fetching logs.</p>';
        }
    }

    /**
     * Renders log entries to the log output area based on current filters.
     */
    function renderLogs() {
        logOutput.innerHTML = ''; // Clear current logs

        const filterText = logFilterInput.value.toLowerCase();
        const filterLevel = logLevelFilterSelect.value;

        const filteredLogs = allLogEntries.filter(entry => {
            const matchesText = entry.message.toLowerCase().includes(filterText) ||
                                entry.timestamp.toLowerCase().includes(filterText) ||
                                entry.level.toLowerCase().includes(filterText) ||
                                entry.name.toLowerCase().includes(filterText); // Include logger name in filter
            const matchesLevel = filterLevel === 'all' || entry.level.toLowerCase() === filterLevel;
            return matchesText && matchesLevel;
        });

        filteredLogs.forEach(entry => {
            const p = document.createElement('p');
            // Add a class for the log level for styling
            p.className = `log-entry ${entry.level.toLowerCase()}`;
            p.textContent = `[${entry.level}] ${entry.timestamp} [${entry.name}] ${entry.message}`;
            logOutput.appendChild(p);
        });

        // Scroll to the bottom of the log output
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    /**
     * Sets up event listeners for the logs viewer controls.
     */
    function setupLogsViewerListeners() {
        logFilterInput.addEventListener('input', renderLogs);
        logLevelFilterSelect.addEventListener('change', renderLogs);

        clearLogsBtn.addEventListener('click', () => {
            logOutput.innerHTML = ''; // Clear display
            // Note: This only clears the view, not the `allLogEntries` array
            // If you want to clear all data, you'd need a backend endpoint to truncate the log file.
            showMessage(controlStatusMessage, 'Log view cleared.', 'info');
        });

        downloadLogsBtn.addEventListener('click', () => {
            const logContent = allLogEntries.map(entry => `[${entry.level}] ${entry.timestamp} [${entry.name}] ${entry.message}`).join('\n');
            const blob = new Blob([logContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `discord_bot_logs_${new Date().toISOString().slice(0,10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up
            showMessage(controlStatusMessage, 'Logs downloaded successfully.', 'success');
        });
    }

    // --- Initialization ---
    // Initial fetches for live data
    fetchBotStatus();
    fetchCommandUsageStats();
    fetchLogs();

    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();

    // Set intervals for dynamic updates
    setInterval(fetchBotStatus, 5000); // Fetch dashboard stats every 5 seconds
    setInterval(fetchCommandUsageStats, 10000); // Fetch command stats every 10 seconds
    setInterval(fetchLogs, 3000); // Fetch logs every 3 seconds for near real-time updates
});
