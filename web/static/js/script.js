document.addEventListener('DOMContentLoaded', () => {
    // --- Dashboard: Bot Status & Quick Stats ---
    const statusElement = document.getElementById('status');
    const uptimeElement = document.getElementById('uptime');
    const latencyElement = document.getElementById('latency');
    const commandsTodayElement = document.getElementById('commands-today');
    const activeUsersElement = document.getElementById('active-users');
    const serverCountElement = document.getElementById('server-count');

    async function fetchBotInfo() {
        try {
            const response = await fetch('/api/bot_info');
            const data = await response.json();

            statusElement.textContent = data.status;
            uptimeElement.textContent = data.uptime;
            latencyElement.textContent = data.latency_ms !== "N/A" ? `${data.latency_ms}ms` : data.latency_ms;
            commandsTodayElement.textContent = data.commands_used_today;
            activeUsersElement.textContent = data.user_count;
            serverCountElement.textContent = data.guild_count;

            // Update status color
            if (data.status === 'Online') {
                statusElement.classList.add('online');
                statusElement.classList.remove('offline');
            } else {
                statusElement.classList.add('offline');
                statusElement.classList.remove('online');
            }

            // Display any error message from the bot API (if provided by the backend)
            if (data.error) {
                console.warn("Bot API communication error:", data.error);
                // Optionally display this error to the user in a dedicated area
                // e.g., a small red text below the status
            }


        } catch (error) {
            console.error('Error fetching bot info from UI backend:', error);
            statusElement.textContent = 'Error';
            uptimeElement.textContent = 'Error';
            latencyElement.textContent = 'Error';
            commandsTodayElement.textContent = 'Error';
            activeUsersElement.textContent = 'Error';
            serverCountElement.textContent = 'Error';
            statusElement.classList.add('offline'); // Indicate error as offline
            statusElement.classList.remove('online');
        }
    }

    // Fetch bot info on page load
    fetchBotInfo();
    // Refresh bot info every 5 seconds
    setInterval(fetchBotInfo, 5000);

    // --- Send Announcement Section ---
    const sendAnnouncementBtn = document.getElementById('send-announcement-btn');
    const announcementMessageInput = document.getElementById('announcement-message');
    const announcementChannelInput = document.getElementById('announcement-channel');
    const announcementStatusMessage = document.getElementById('announcement-status-message');

    if (sendAnnouncementBtn) {
        sendAnnouncementBtn.addEventListener('click', async () => {
            const message = announcementMessageInput.value.trim();
            const channelId = announcementChannelInput.value.trim();

            // Clear previous messages
            announcementStatusMessage.textContent = '';
            announcementStatusMessage.className = 'message'; // Reset classes

            if (!message || !channelId) {
                announcementStatusMessage.textContent = 'Please enter both a message and a channel ID.';
                announcementStatusMessage.classList.add('error');
                return;
            }

            // Basic validation for channel ID (should be numeric)
            if (!/^\d+$/.test(channelId)) {
                announcementStatusMessage.textContent = 'Channel ID must be a number.';
                announcementStatusMessage.classList.add('error');
                return;
            }

            try {
                const response = await fetch('/api/send_announcement', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message, channel_id: parseInt(channelId) }), // Convert to int
                });

                const data = await response.json();

                if (data.success) {
                    announcementStatusMessage.textContent = data.message;
                    announcementStatusMessage.classList.add('success');
                    announcementMessageInput.value = ''; // Clear message
                    announcementChannelInput.value = ''; // Clear channel ID
                } else {
                    announcementStatusMessage.textContent = `Error: ${data.error}`;
                    announcementStatusMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Error sending announcement:', error);
                announcementStatusMessage.textContent = 'An error occurred while sending the announcement.';
                announcementStatusMessage.classList.add('error');
            }
        });
    }

    // --- Bot Control Panel ---
    const restartBotBtn = document.getElementById('restart-bot-btn');
    const reloadCogsBtn = document.getElementById('reload-cogs-btn');
    const updateGitBtn = document.getElementById('update-git-btn');
    const controlStatusMessage = document.getElementById('control-status-message');

    async function sendBotControlAction(action) {
        // Clear previous messages
        controlStatusMessage.textContent = '';
        controlStatusMessage.className = 'message'; // Reset classes

        // Show a confirmation modal (simple JS confirm for now, replace with custom UI)
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ')} the bot?`)) {
            controlStatusMessage.textContent = 'Action cancelled.';
            controlStatusMessage.classList.add('info');
            return;
        }

        try {
            const response = await fetch('/api/control_bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: action }),
            });

            const data = await response.json();

            if (data.success) {
                controlStatusMessage.textContent = data.message;
                controlStatusMessage.classList.add('success');
            } else {
                controlStatusMessage.textContent = `Error: ${data.error}`;
                controlStatusMessage.classList.add('error');
            }
        } catch (error) {
            console.error(`Error performing ${action} action:`, error);
            controlStatusMessage.textContent = `An error occurred while trying to ${action}.`;
            controlStatusMessage.classList.add('error');
        }
    }

    if (restartBotBtn) {
        restartBotBtn.addEventListener('click', () => sendBotControlAction('restart'));
    }
    if (reloadCogsBtn) {
        reloadCogsBtn.addEventListener('click', () => sendBotControlAction('reload_cogs'));
    }
    if (updateGitBtn) {
        updateGitBtn.addEventListener('click', () => sendBotControlAction('update_git'));
    }

    // --- Command Usage Stats Chart ---
    const ctx = document.getElementById('commandUsageChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['!hello', '!ping', '!help', '!info', '!moderation', '!roles'],
                datasets: [{
                    label: 'Commands Used',
                    data: [150, 120, 80, 50, 30, 25], // Simulated data
                    backgroundColor: [
                        'rgba(88, 101, 242, 0.7)', // Discord blue
                        'rgba(114, 137, 218, 0.7)', // Lighter Discord blue
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(88, 101, 242, 1)',
                        'rgba(114, 137, 218, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
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
                        title: {
                            display: true,
                            text: 'Number of Uses'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Command'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide legend for single dataset
                    },
                    title: {
                        display: true,
                        text: 'Top Command Usage (Simulated)'
                    }
                }
            }
        });
    }

    // --- Logs Viewer ---
    const logOutput = document.getElementById('log-output');
    const logFilterInput = document.getElementById('log-filter');
    const logLevelFilterSelect = document.getElementById('log-level-filter');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const downloadLogsBtn = document.getElementById('download-logs-btn');

    // Simulated live logs (in a real app, you'd fetch these from the bot's API,
    // potentially via WebSockets for real-time streaming)
    const simulatedLogs = [
        { text: "[INFO] 2025-07-13 15:00:01 Bot started successfully.", level: "info" },
        { text: "[WARN] 2025-07-13 15:00:05 Missing permissions for command 'kick' in channel #general.", level: "warn" },
        { text: "[INFO] 2025-07-13 15:00:10 User 'Alice' used command '!hello'.", level: "info" },
        { text: "[ERROR] 2025-07-13 15:00:15 Failed to connect to database: Connection refused.", level: "error" },
        { text: "[INFO] 2025-07-13 15:00:20 User 'Bob' used command '!ping'.", level: "info" },
        { text: "[INFO] 2025-07-13 15:00:25 Guild 'My Awesome Server' added.", level: "info" },
        { text: "[WARN] 2025-07-13 15:00:30 Command 'announce' failed: Channel not found.", level: "warn" },
        { text: "[INFO] 2025-07-13 15:00:35 User 'Charlie' used command '!help'.", level: "info" },
        { text: "[ERROR] 2025-07-13 15:00:40 Unhandled exception in cog 'ModerationCog'.", level: "error" },
        { text: "[INFO] 2025-07-13 15:00:45 Bot processed 100 messages.", level: "info" }
    ];

    let currentDisplayedLogs = [...simulatedLogs]; // Start with initial logs

    function renderLogs() {
        logOutput.innerHTML = ''; // Clear current view
        const filterText = logFilterInput.value.toLowerCase();
        const filterLevel = logLevelFilterSelect.value;

        currentDisplayedLogs.forEach(log => {
            const matchesText = log.text.toLowerCase().includes(filterText);
            const matchesLevel = (filterLevel === 'all' || log.level === filterLevel);

            if (matchesText && matchesLevel) {
                const p = document.createElement('p');
                p.classList.add('log-entry', log.level);
                p.textContent = log.text;
                logOutput.appendChild(p);
            }
        });
        logOutput.scrollTop = logOutput.scrollHeight; // Scroll to bottom
    }

    // Simulate appending new logs
    let logCounter = simulatedLogs.length;
    setInterval(() => {
        logCounter++;
        const newLog = {
            text: `[INFO] ${new Date().toISOString().slice(0, 19).replace('T', ' ')} Simulated log entry ${logCounter}.`,
            level: "info"
        };
        currentDisplayedLogs.push(newLog);
        renderLogs(); // Re-render to include new log
    }, 10000); // Add a new log every 10 seconds

    // Event listeners for log controls
    logFilterInput.addEventListener('input', renderLogs);
    logLevelFilterSelect.addEventListener('change', renderLogs);

    clearLogsBtn.addEventListener('click', () => {
        currentDisplayedLogs = []; // Clear data
        renderLogs(); // Render empty view
        logOutput.innerHTML = '<p class="log-entry info">Logs cleared.</p>';
    });

    downloadLogsBtn.addEventListener('click', () => {
        const logContent = currentDisplayedLogs.map(log => log.text).join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bot_logs_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial render of logs
    renderLogs();
});
