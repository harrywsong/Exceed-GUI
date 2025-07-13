document.addEventListener('DOMContentLoaded', () => {
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

    // --- Simulated Data ---
    let currentUptimeSeconds = 0;
    let botOnline = true; // Initial bot status
    let simulatedCommandsToday = 0;
    let simulatedActiveUsers = 0;
    let simulatedServerCount = 0;

    // Simulated log data
    let allLogEntries = [
        { timestamp: '2025-07-13 15:00:01', level: 'INFO', message: 'Bot started successfully.' },
        { timestamp: '2025-07-13 15:00:05', level: 'WARN', message: 'Missing permissions for command \'kick\' in channel #general.' },
        { timestamp: '2025-07-13 15:00:10', level: 'INFO', message: 'User \'Alice\' used command \'!hello\'.' },
        { timestamp: '2025-07-13 15:00:15', level: 'ERROR', message: 'Failed to connect to database: Connection refused.' },
        { timestamp: '2025-07-13 15:00:20', level: 'INFO', message: 'User \'Bob\' used command \'!ping\'.' },
        { timestamp: '2025-07-13 15:00:25', level: 'INFO', message: 'New guild joined: "Awesome Server".' },
        { timestamp: '2025-07-13 15:00:30', level: 'WARN', message: 'API rate limit exceeded for user \'Charlie\'.' },
        { timestamp: '2025-07-13 15:00:35', level: 'INFO', message: 'Command \'!help\' executed by \'Dave\'.' },
        { timestamp: '2025-07-13 15:00:40', level: 'ERROR', message: 'Unhandled promise rejection in event handler.' },
        { timestamp: '2025-07-13 15:00:45', level: 'INFO', message: 'User \'Eve\' used command \'!info\'.' },
    ];

    // Simulated command usage data for the chart
    let commandUsageData = {
        '!hello': 150,
        '!ping': 120,
        '!help': 80,
        '!info': 50,
        '!stats': 30,
        '!moderation': 25,
        '!music': 40
    };

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
     * Formats seconds into HH:MM:SS string.
     * @param {number} totalSeconds - The total number of seconds.
     * @returns {string} Formatted time string.
     */
    function formatUptime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    /**
     * Updates the dashboard statistics with simulated data.
     */
    function updateDashboardStats() {
        // Bot Status
        statusIndicator.textContent = botOnline ? 'Online' : 'Offline';
        statusIndicator.className = `status-indicator ${botOnline ? 'online' : 'offline'}`;

        // Uptime
        currentUptimeSeconds++;
        uptimeElement.textContent = formatUptime(currentUptimeSeconds);

        // Latency (simulated)
        latencyElement.textContent = `${(Math.random() * (100 - 20) + 20).toFixed(2)} ms`;

        // Quick Stats (simulated and incremented)
        simulatedCommandsToday += Math.floor(Math.random() * 3); // 0-2 new commands
        simulatedActiveUsers = Math.floor(Math.random() * (500 - 100) + 100); // 100-500 active users
        simulatedServerCount = Math.floor(Math.random() * (100 - 20) + 20); // 20-100 servers

        commandsTodayElement.textContent = simulatedCommandsToday;
        activeUsersElement.textContent = simulatedActiveUsers;
        serverCountElement.textContent = simulatedServerCount;
    }

    // --- Bot Control Panel Functions ---
    /**
     * Simulates a bot control action (restart, reload, update).
     * @param {string} actionName - The name of the action (e.g., "Restart Bot").
     * @param {HTMLElement} messageElement - The element to display status messages.
     */
    function simulateBotAction(actionName, messageElement) {
        showMessage(messageElement, `Attempting to ${actionName.toLowerCase()}...`, 'info');
        // Disable buttons during action
        restartBotBtn.disabled = true;
        reloadCogsBtn.disabled = true;
        updateGitBtn.disabled = true;
        sendAnnouncementBtn.disabled = true; // Also disable announcement during bot restart/reload

        // Simulate network delay
        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% chance of success
            if (success) {
                showMessage(messageElement, `${actionName} successful!`, 'success');
                if (actionName === "Restart Bot") {
                    botOnline = true; // Ensure bot is online after restart
                    currentUptimeSeconds = 0; // Reset uptime
                    updateDashboardStats(); // Update dashboard immediately
                }
            } else {
                showMessage(messageElement, `${actionName} failed. Please check logs.`, 'error');
            }
            // Re-enable buttons
            restartBotBtn.disabled = false;
            reloadCogsBtn.disabled = false;
            updateGitBtn.disabled = false;
            sendAnnouncementBtn.disabled = false;
        }, 1500); // Simulate 1.5 seconds delay
    }

    /**
     * Sets up event listeners for bot control buttons.
     */
    function setupControlPanelListeners() {
        restartBotBtn.addEventListener('click', () => simulateBotAction('Restart Bot', controlStatusMessage));
        reloadCogsBtn.addEventListener('click', () => simulateBotAction('Reload Cogs', controlStatusMessage));
        updateGitBtn.addEventListener('click', () => simulateBotAction('Update from Git', controlStatusMessage));
    }

    // --- Send Announcement Functions ---
    /**
     * Handles sending an announcement.
     */
    function handleSendAnnouncement() {
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

        setTimeout(() => {
            const success = Math.random() > 0.1; // 90% chance of success
            if (success) {
                showMessage(announcementStatusMessage, `Announcement sent to channel ${channelId}!`, 'success');
                announcementMessageInput.value = ''; // Clear message
                // announcementChannelInput.value = ''; // Keep channel ID for convenience
            } else {
                showMessage(announcementStatusMessage, 'Failed to send announcement. Bot might be offline or channel invalid.', 'error');
            }
            sendAnnouncementBtn.disabled = false; // Re-enable button
        }, 1200); // Simulate 1.2 seconds delay
    }

    /**
     * Sets up event listeners for the announcement sender.
     */
    function setupAnnouncementSenderListeners() {
        sendAnnouncementBtn.addEventListener('click', handleSendAnnouncement);
    }

    // --- Command Usage Stats Functions ---
    /**
     * Initializes the Chart.js graph for command usage.
     */
    function initCommandUsageChart() {
        const labels = Object.keys(commandUsageData);
        const dataValues = Object.values(commandUsageData);

        commandUsageChart = new Chart(commandUsageChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Commands Used',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(139, 92, 246, 0.8)', // Purple
                        'rgba(255, 159, 64, 0.8)', // Orange
                        'rgba(75, 192, 192, 0.8)', // Teal
                        'rgba(255, 99, 132, 0.8)', // Red
                        'rgba(54, 162, 235, 0.8)', // Blue
                        'rgba(153, 102, 255, 0.8)', // Violet
                        'rgba(201, 203, 207, 0.8)' // Grey
                    ],
                    borderColor: [
                        'rgba(139, 92, 246, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
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
                            color: '#e0e0e0' // White ticks
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Light grid lines
                        }
                    },
                    x: {
                        ticks: {
                            color: '#e0e0e0' // White ticks
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Light grid lines
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0' // White legend text
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
        updateTopCommandsList();
    }

    /**
     * Updates the "Top Commands" list based on current command usage data.
     */
    function updateTopCommandsList() {
        topCommandsList.innerHTML = ''; // Clear existing list

        // Sort commands by usage count in descending order
        const sortedCommands = Object.entries(commandUsageData).sort(([, a], [, b]) => b - a);

        sortedCommands.forEach(([command, count]) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${command}:</span> <span>${count} uses</span>`;
            topCommandsList.appendChild(listItem);
        });
    }

    // --- Logs Viewer Functions ---
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
                                entry.level.toLowerCase().includes(filterText);
            const matchesLevel = filterLevel === 'all' || entry.level.toLowerCase() === filterLevel;
            return matchesText && matchesLevel;
        });

        filteredLogs.forEach(entry => {
            const p = document.createElement('p');
            p.className = `log-entry ${entry.level.toLowerCase()}`;
            p.textContent = `[${entry.level}] ${entry.timestamp} ${entry.message}`;
            logOutput.appendChild(p);
        });

        // Scroll to the bottom of the log output
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    /**
     * Simulates adding a new log entry.
     */
    function simulateNewLogEntry() {
        const levels = ['INFO', 'WARN', 'ERROR'];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const messages = {
            'INFO': [
                'User \'Alice\' executed command \'!status\'.',
                'Bot connected to Discord API.',
                'Successfully loaded cog \'Moderation\'.',
                'Message sent to #general.',
                'Database backup completed.'
            ],
            'WARN': [
                'Guild cache inconsistency detected.',
                'Command \'!ban\' used without reason.',
                'Slow response from external API.',
                'Missing environment variable: DISCORD_TOKEN_ALT.'
            ],
            'ERROR': [
                'Failed to send message: Channel not found.',
                'Database query failed: Syntax error.',
                'Uncaught exception in event loop.',
                'Discord API connection lost.'
            ]
        };
        const randomMessage = messages[randomLevel][Math.floor(Math.random() * messages[randomLevel].length)];

        const newEntry = { timestamp, level: randomLevel, message: randomMessage };
        allLogEntries.push(newEntry);
        renderLogs(); // Re-render logs with new entry
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
            // If you want to clear all data, uncomment: allLogEntries = [];
            showMessage(controlStatusMessage, 'Log view cleared.', 'info');
        });

        downloadLogsBtn.addEventListener('click', () => {
            const logContent = allLogEntries.map(entry => `[${entry.level}] ${entry.timestamp} ${entry.message}`).join('\n');
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
    // Initial update for dashboard and logs
    updateDashboardStats();
    renderLogs();
    initCommandUsageChart();

    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();

    // Set intervals for dynamic updates
    setInterval(updateDashboardStats, 1000); // Update dashboard every second
    setInterval(simulateNewLogEntry, 5000); // Add a new simulated log entry every 5 seconds
});
