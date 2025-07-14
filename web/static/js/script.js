// web/static/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    // This now points to the Flask UI app's API, which proxies requests to the bot's API.
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

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

    // --- Configuration Viewer Elements ---
    const configOutput = document.getElementById('config-output');

    // --- Guilds Viewer Elements ---
    const guildsOutput = document.getElementById('guilds-output'); // New element for Guilds Overview

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
            const response = await fetch(`${API_BASE_URL}/bot_info`); // Changed endpoint
            const data = await response.json();

            if (response.ok) { // Check response.ok for HTTP status 200-299
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
     * @param {string} action - The specific action (e.g., 'restart', 'reload_cogs', 'update_git').
     * @param {string} actionName - A user-friendly name for the action (e.g., "Restart Bot").
     * @param {HTMLElement} messageElement - The element to display status messages.
     */
    async function sendControlAction(action, actionName, messageElement) {
        showMessage(messageElement, `${actionName.toLowerCase()} 시도 중...`, 'info');
        // Disable buttons during action
        restartBotBtn.disabled = true;
        reloadCogsBtn.disabled = true;
        updateGitBtn.disabled = true;
        sendAnnouncementBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/control_bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: action })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                showMessage(messageElement, `${actionName} 성공! ${data.message || ''}`, 'success');
                // Immediately refresh dashboard stats after a successful control action
                fetchBotStatus();
                fetchCommandUsageStats(); // Also refresh command stats
                fetchLogs(); // And logs, in case actions generate new log entries
                fetchGuilds(); // Refresh guild info after bot restart/reload
            } else {
                showMessage(messageElement, `${actionName} 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error(`${actionName} API error:`, data.error);
            }
        } catch (error) {
            showMessage(messageElement, `${actionName.toLowerCase()} 중 네트워크 오류: ${error.message}`, 'error');
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
        restartBotBtn.addEventListener('click', () => sendControlAction('restart', '봇 재시작', controlStatusMessage));
        reloadCogsBtn.addEventListener('click', () => sendControlAction('reload_cogs', 'Cog 재로드', controlStatusMessage));
        updateGitBtn.addEventListener('click', () => sendControlAction('update_git', 'Git에서 업데이트', controlStatusMessage));
    }

    // --- Send Announcement Functions ---
    /**
     * Handles sending an announcement via the backend API.
     */
    async function handleSendAnnouncement() {
        const message = announcementMessageInput.value.trim();
        const channelId = announcementChannelInput.value.trim();
        if (!message) {
            showMessage(announcementStatusMessage, '공지 메시지를 입력해주세요.', 'error');
            return;
        }
        if (!channelId || !/^\d{17,19}$/.test(channelId)) { // Basic Discord channel ID validation (17-19 digits)
            showMessage(announcementStatusMessage, '유효한 디스코드 채널 ID (17-19자리 숫자)를 입력해주세요.', 'error');
            return;
        }
        showMessage(announcementStatusMessage, '공지 전송 중...', 'info');
        sendAnnouncementBtn.disabled = true; // Disable button during sending
        try {
            const response = await fetch(`${API_BASE_URL}/send_announcement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId, message: message })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showMessage(announcementStatusMessage, `공지 전송 성공! ${data.message || ''}`, 'success');
                announcementMessageInput.value = ''; // Clear message
                fetchLogs(); // Fetch logs again in case the announcement was logged
            } else {
                showMessage(announcementStatusMessage, `공지 전송 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('Announcement API error:', data.error);
            }
        } catch (error) {
            showMessage(announcementStatusMessage, `공지 전송 중 네트워크 오류: ${error.message}`, 'error');
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
     * Fetches command usage statistics and updates the chart and top commands list.
     */
    async function fetchCommandUsageStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/command_stats`);
            const data = await response.json();

            if (response.ok) {
                // Update commands today in dashboard
                commandsTodayElement.textContent = data.total_commands_today || '0';

                const commandNames = data.command_counts.map(item => item.command_name);
                const usageCounts = data.command_counts.map(item => item.count);

                if (commandUsageChart) {
                    commandUsageChart.destroy(); // Destroy existing chart before creating a new one
                }

                commandUsageChart = new Chart(commandUsageChartCtx, {
                    type: 'bar',
                    data: {
                        labels: commandNames,
                        datasets: [{
                            label: '명령어 사용 횟수',
                            data: usageCounts,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
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
                                    text: '사용 횟수'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: '명령어'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false // Hide dataset legend
                            }
                        }
                    }
                });

                // Update top commands list
                topCommandsList.innerHTML = ''; // Clear previous list
                if (data.command_counts.length > 0) {
                    data.command_counts.slice(0, 5).forEach(item => { // Show top 5
                        const li = document.createElement('li');
                        li.textContent = `${item.command_name}: ${item.count} 회`;
                        topCommandsList.appendChild(li);
                    });
                } else {
                    topCommandsList.innerHTML = '<li>사용된 명령어가 없습니다.</li>';
                }
            } else {
                console.error('Failed to fetch command stats:', data.error);
                topCommandsList.innerHTML = '<li class="error">명령어 통계를 가져오는 중 오류 발생</li>';
            }
        } catch (error) {
            console.error('Network error fetching command stats:', error);
            topCommandsList.innerHTML = '<li class="error">명령어 통계를 가져오는 중 네트워크 오류 발생</li>';
        }
    }

    // --- Logs Viewer Functions ---
    /**
     * Fetches logs from the backend API and updates the log viewer.
     */
    async function fetchLogs() {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`);
            const data = await response.json();

            if (response.ok) {
                allLogEntries = data.logs; // Store all fetched logs
                displayLogs(); // Display filtered logs
            } else {
                console.error('Failed to fetch logs:', data.error);
                logOutput.innerHTML = `<p class="error">로그를 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching logs:', error);
            logOutput.innerHTML = '<p class="error">로그를 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }

    /**
     * Filters and displays log entries.
     */
    function displayLogs() {
        const filterText = logFilterInput.value.toLowerCase();
        const logLevel = logLevelFilterSelect.value.toLowerCase();
        logOutput.innerHTML = ''; // Clear current logs

        const filteredLogs = allLogEntries.filter(log => {
            const matchesFilterText = log.toLowerCase().includes(filterText);
            const matchesLogLevel = logLevel === 'all' || log.toLowerCase().includes(`[${logLevel}]`);
            return matchesFilterText && matchesLogLevel;
        });

        // Display logs, limiting to prevent performance issues with too many lines
        const maxLines = 500;
        const startIndex = Math.max(0, filteredLogs.length - maxLines);

        for (let i = startIndex; i < filteredLogs.length; i++) {
            const p = document.createElement('p');
            p.textContent = filteredLogs[i];

            // Add class for log level for styling
            if (filteredLogs[i].toLowerCase().includes('[error]')) {
                p.classList.add('log-error');
            } else if (filteredLogs[i].toLowerCase().includes('[warn]')) {
                p.classList.add('log-warn');
            } else if (filteredLogs[i].toLowerCase().includes('[info]')) {
                p.classList.add('log-info');
            }
            logOutput.appendChild(p);
        }
        logOutput.scrollTop = logOutput.scrollHeight; // Scroll to bottom
    }

    /**
     * Handles downloading logs.
     */
    function handleDownloadLogs() {
        const logContent = allLogEntries.join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bot_logs_${new Date().toISOString().slice(0, 10)}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Sets up event listeners for the logs viewer.
     */
    function setupLogsViewerListeners() {
        logFilterInput.addEventListener('input', displayLogs);
        logLevelFilterSelect.addEventListener('change', displayLogs);
        clearLogsBtn.addEventListener('click', () => {
            logOutput.innerHTML = '';
            allLogEntries = []; // Clear stored logs as well
        });
        downloadLogsBtn.addEventListener('click', handleDownloadLogs);
    }

    // --- Configuration Viewer Functions ---
    /**
     * Fetches bot configuration from the backend API and displays it.
     */
    async function fetchBotConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            const data = await response.json();

            if (response.ok && data.config) {
                configOutput.innerHTML = ''; // Clear loading message
                for (const key in data.config) {
                    if (Object.hasOwnProperty.call(data.config, key)) {
                        const p = document.createElement('p');
                        p.innerHTML = `<strong>${key}:</strong> ${data.config[key]}`;
                        configOutput.appendChild(p);
                    }
                }
            } else {
                console.error('Failed to fetch bot config:', data.error);
                configOutput.innerHTML = `<p class="error">설정을 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching bot config:', error);
            configOutput.innerHTML = '<p class="error">설정을 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }

    // --- Guilds Viewer Functions ---
    /**
     * Fetches guild information from the backend API and displays it.
     */
    async function fetchGuilds() {
        try {
            const response = await fetch(`${API_BASE_URL}/guilds`); // New endpoint
            const data = await response.json();

            if (response.ok && data.guilds) {
                guildsOutput.innerHTML = ''; // Clear loading message
                if (data.guilds.length === 0) {
                    guildsOutput.innerHTML = '<p>봇이 참여하고 있는 서버가 없습니다.</p>';
                    return;
                }
                const ul = document.createElement('ul');
                data.guilds.forEach(guild => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${guild.name}</strong> (ID: ${guild.id}, 멤버: ${guild.member_count})`;
                    ul.appendChild(li);
                });
                guildsOutput.appendChild(ul);
            } else {
                console.error('Failed to fetch guilds:', data.error);
                guildsOutput.innerHTML = `<p class="error">서버 정보를 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching guilds:', error);
            guildsOutput.innerHTML = '<p class="error">서버 정보를 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }

    // --- Initialization ---
    // Initial fetches for live data
    fetchBotStatus();
    fetchCommandUsageStats();
    fetchLogs();
    fetchBotConfig();
    fetchGuilds(); // Fetch guild information on initial load

    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();


    // Set intervals for dynamic updates
    setInterval(fetchBotStatus, 5000); // Fetch dashboard stats every 5 seconds
    setInterval(fetchCommandUsageStats, 10000); // Fetch command stats every 10 seconds
    setInterval(fetchLogs, 3000); // Fetch logs every 3 seconds for near real-time updates
    setInterval(fetchGuilds, 30000); // Fetch guild information every 30 seconds (optional: adjust as needed)
});