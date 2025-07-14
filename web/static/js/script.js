// web/static/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    // This now points to the Flask UI app's API, which proxies requests to the bot's API.
    const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Changed to UI's API base URL

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

    // --- Reaction Roles Elements ---
    const rrGuildIdInput = document.getElementById('rr-guild-id');
    const rrChannelIdInput = document.getElementById('rr-channel-id');
    const rrMessageIdInput = document.getElementById('rr-message-id');
    const rrEmojiInput = document.getElementById('rr-emoji');
    const rrRoleIdInput = document.getElementById('rr-role-id');
    const addReactionRoleBtn = document.getElementById('add-reaction-role-btn');
    const reactionRoleStatusMessage = document.getElementById('reaction-role-status-message');
    const currentReactionRolesList = document.getElementById('current-reaction-roles-list');


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
    async function sendControlAction(action, actionName, messageElement) { // Changed parameter from endpoint to action
        showMessage(messageElement, `${actionName.toLowerCase()} 시도 중...`, 'info'); // Korean translation
        // Disable buttons during action
        restartBotBtn.disabled = true;
        reloadCogsBtn.disabled = true;
        updateGitBtn.disabled = true;
        sendAnnouncementBtn.disabled = true;
        addReactionRoleBtn.disabled = true; // Disable reaction role button during control actions

        try {
            const response = await fetch(`${API_BASE_URL}/control_bot`, { // Changed endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: action }) // Pass action in body
            });
            const data = await response.json();

            if (response.ok && data.success) { // Check data.success
                showMessage(messageElement, `${actionName} 성공! ${data.message || ''}`, 'success'); // Korean translation
                // Immediately refresh dashboard stats after a successful control action
                fetchBotStatus();
                fetchCommandUsageStats(); // Also refresh command stats
                fetchLogs(); // And logs, in case actions generate new log entries
                fetchReactionRoles(); // Refresh reaction roles after bot restart/reload
            } else {
                showMessage(messageElement, `${actionName} 실패: ${data.error || '알 수 없는 오류'}`, 'error'); // Korean translation
                console.error(`${actionName} API error:`, data.error);
            }
        } catch (error) {
            showMessage(messageElement, `${actionName.toLowerCase()} 중 네트워크 오류: ${error.message}`, 'error'); // Korean translation
            console.error(`Network error for ${actionName}:`, error);
        } finally {
            // Re-enable buttons
            restartBotBtn.disabled = false;
            reloadCogsBtn.disabled = false;
            updateGitBtn.disabled = false;
            sendAnnouncementBtn.disabled = false;
            addReactionRoleBtn.disabled = false; // Re-enable reaction role button
        }
    }

    /**
     * Sets up event listeners for bot control buttons.
     */
    function setupControlPanelListeners() {
        restartBotBtn.addEventListener('click', () => sendControlAction('restart', '봇 재시작', controlStatusMessage)); // Korean translation
        reloadCogsBtn.addEventListener('click', () => sendControlAction('reload_cogs', 'Cog 재로드', controlStatusMessage)); // Korean translation
        updateGitBtn.addEventListener('click', () => sendControlAction('update_git', 'Git에서 업데이트', controlStatusMessage)); // Korean translation
    }

    // --- Send Announcement Functions ---
    /**
     * Handles sending an announcement via the backend API.
     */
    async function handleSendAnnouncement() {
        const message = announcementMessageInput.value.trim();
        const channelId = announcementChannelInput.value.trim();

        if (!message) {
            showMessage(announcementStatusMessage, '공지 메시지를 입력해주세요.', 'error'); // Korean translation
            return;
        }
        if (!channelId || !/^\d{17,19}$/.test(channelId)) { // Basic Discord channel ID validation (17-19 digits)
            showMessage(announcementStatusMessage, '유효한 디스코드 채널 ID (17-19자리 숫자)를 입력해주세요.', 'error'); // Korean translation
            return;
        }

        showMessage(announcementStatusMessage, '공지 전송 중...', 'info'); // Korean translation
        sendAnnouncementBtn.disabled = true; // Disable button during sending

        try {
            const response = await fetch(`${API_BASE_URL}/send_announcement`, { // Changed endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId, message: message })
            });
            const data = await response.json();

            if (response.ok && data.success) { // Check data.success
                showMessage(announcementStatusMessage, `공지 전송 성공! ${data.message || ''}`, 'success'); // Korean translation
                announcementMessageInput.value = ''; // Clear message
                fetchLogs(); // Fetch logs again in case the announcement was logged
            } else {
                showMessage(announcementStatusMessage, `공지 전송 실패: ${data.error || '알 수 없는 오류'}`, 'error'); // Korean translation
                console.error('Announcement API error:', data.error);
            }
        } catch (error) {
            showMessage(announcementStatusMessage, `공지 전송 중 네트워크 오류: ${error.message}`, 'error'); // Korean translation
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
            const response = await fetch(`${API_BASE_URL}/command_stats`); // Changed endpoint
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
                commandsTodayElement.textContent = '오류'; // Korean translation
                // Clear chart and list or show error
                if (commandUsageChart) {
                    commandUsageChart.data.labels = [];
                    commandUsageChart.data.datasets[0].data = [];
                    commandUsageChart.update();
                }
                topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 오류가 발생했습니다.</li>'; // Korean translation
            }
        } catch (error) {
            console.error('Network error fetching command stats:', error);
            commandsTodayElement.textContent = 'N/A';
            if (commandUsageChart) {
                commandUsageChart.data.labels = [];
                commandUsageChart.data.datasets[0].data = [];
                commandUsageChart.update();
            }
            topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 네트워크 오류가 발생했습니다.</li>'; // Korean translation
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
                    label: '사용된 명령어', // Korean translation
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
            listItem.innerHTML = `<span>${stat.command_name}:</span> <span>${stat.usage_count}회 사용</span>`; // Korean translation
            topCommandsList.appendChild(listItem);
        });
    }

    // --- Logs Viewer Functions ---
    /**
     * Fetches log entries from the backend API and renders them.
     */
    async function fetchLogs() {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`); // Changed endpoint
            console.log(`Fetching logs from: ${API_BASE_URL}/logs`); // Debugging line
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                allLogEntries = data.logs.map(logLine => {
                    // First, check if the raw log line contains "werkzeug"
                    if (logLine.toLowerCase().includes('werkzeug')) {
                        // If it's a werkzeug log, we'll explicitly mark it as such
                        // and try to parse its timestamp and level if possible.
                        const simpleMatch = logLine.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(.*?)\s*\]/);
                        return {
                            timestamp: simpleMatch ? simpleMatch[1] : 'N/A',
                            level: simpleMatch ? simpleMatch[2].trim().toUpperCase() : 'INFO',
                            name: 'werkzeug', // Explicitly set name for filtering
                            message: logLine.trim()
                        };
                    }

                    // If not a werkzeug log, try the structured parsing
                    const structuredMatch = logLine.match(/.*?\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(.*?)\s*\] \[(.*?)(?:\])? (.*)$/);

                    if (structuredMatch) {
                        return {
                            timestamp: structuredMatch[1],
                            level: structuredMatch[2].trim().toUpperCase(),
                            name: structuredMatch[3] ? structuredMatch[3].trim() : 'UNKNOWN',
                            message: structuredMatch[4].trim()
                        };
                    }

                    // Generic fallback for any other unparsed lines
                    return { timestamp: 'N/A', level: 'UNKNOWN', name: 'UNKNOWN', message: logLine.trim() };
                });
                renderLogs();
            } else {
                console.error('Failed to fetch logs:', data.error);
                logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 오류가 발생했습니다.</p>'; // Korean translation
            }
        } catch (error) {
            console.error('Network error fetching logs:', error);
            logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 네트워크 오류가 발생했습니다.</p>'; // Korean translation
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
            // Filter out 'werkzeug' logs
            if (entry.name.toLowerCase() === 'werkzeug') {
                return false;
            }

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
            showMessage(controlStatusMessage, '로그 화면이 지워졌습니다.', 'info'); // Korean translation
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
            showMessage(controlStatusMessage, '로그가 성공적으로 다운로드되었습니다.', 'success'); // Korean translation
        });
    }

    // --- Configuration Viewer Functions ---
    /**
     * Fetches non-sensitive bot config from the backend and displays it.
     */
    async function fetchBotConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                configOutput.innerHTML = ''; // Clear loading message
                if (Object.keys(data.config).length === 0) {
                    configOutput.innerHTML = '<p>표시할 설정 변수가 없습니다.</p>'; // Korean translation
                    return;
                }
                const ul = document.createElement('ul');
                for (const [key, value] of Object.entries(data.config)) {
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${key}:</span> <span>${value}</span>`;
                    ul.appendChild(li);
                }
                configOutput.appendChild(ul);
            } else {
                console.error('Failed to fetch bot config:', data.error);
                configOutput.innerHTML = `<p class="error">설정을 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`; // Korean translation
            }
        } catch (error) {
            console.error('Network error fetching bot config:', error);
            configOutput.innerHTML = '<p class="error">설정을 가져오는 중 네트워크 오류가 발생했습니다.</p>'; // Korean translation
        }
    }

    // --- Reaction Roles Functions ---
    /**
     * Handles adding a new reaction role.
     */
    async function handleAddReactionRole() {
        const guildId = rrGuildIdInput.value.trim();
        const channelId = rrChannelIdInput.value.trim();
        const messageId = rrMessageIdInput.value.trim();
        const emoji = rrEmojiInput.value.trim();
        const roleId = rrRoleIdInput.value.trim();

        // Basic client-side validation
        if (!guildId || !channelId || !messageId || !emoji || !roleId) {
            showMessage(reactionRoleStatusMessage, '모든 리액션 역할 필드를 채워주세요.', 'error'); // Korean translation
            return;
        }
        if (!/^\d{17,19}$/.test(guildId) || !/^\d{17,19}$/.test(channelId) || !/^\d{17,19}$/.test(messageId) || !/^\d{17,19}$/.test(roleId)) {
            showMessage(reactionRoleStatusMessage, 'ID 필드는 유효한 디스코드 ID (17-19자리 숫자)여야 합니다.', 'error'); // Korean translation
            return;
        }

        showMessage(reactionRoleStatusMessage, '리액션 역할 추가 중...', 'info'); // Korean translation
        addReactionRoleBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/reaction_roles/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guild_id: guildId,
                    channel_id: channelId,
                    message_id: messageId,
                    emoji: emoji,
                    role_id: roleId
                })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                showMessage(reactionRoleStatusMessage, `리액션 역할 추가 성공! ${data.message || ''}`, 'success'); // Korean translation
                // Clear input fields on success
                rrGuildIdInput.value = '';
                rrChannelIdInput.value = '';
                rrMessageIdInput.value = '';
                rrEmojiInput.value = '';
                rrRoleIdInput.value = '';
                fetchReactionRoles(); // Refresh the list of reaction roles
            } else {
                showMessage(reactionRoleStatusMessage, `리액션 역할 추가 실패: ${data.error || '알 수 없는 오류'}`, 'error'); // Korean translation
                console.error('Add Reaction Role API error:', data.error);
            }
        } catch (error) {
            showMessage(reactionRoleStatusMessage, `리액션 역할 추가 중 네트워크 오류: ${error.message}`, 'error'); // Korean translation
            console.error('Network error adding reaction role:', error);
        } finally {
            addReactionRoleBtn.disabled = false;
        }
    }

    /**
     * Fetches and displays the current reaction roles.
     */
    async function fetchReactionRoles() {
        currentReactionRolesList.innerHTML = '<p>현재 리액션 역할 로딩 중...</p>'; // Korean translation
        try {
            const response = await fetch(`${API_BASE_URL}/reaction_roles`);
            const data = await response.json();

            if (response.ok) {
                currentReactionRolesList.innerHTML = ''; // Clear loading message
                if (data.length === 0) {
                    currentReactionRolesList.innerHTML = '<p>설정된 리액션 역할이 없습니다.</p>'; // Korean translation
                    return;
                }
                const ul = document.createElement('ul');
                data.forEach(role => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>길드 ID:</strong> ${role.guild_id} <br>
                        <strong>채널 ID:</strong> ${role.channel_id} <br>
                        <strong>메시지 ID:</strong> ${role.message_id} <br>
                        <strong>이모지:</strong> ${role.emoji} <br>
                        <strong>역할 ID:</strong> ${role.role_id}
                    `; // Korean translation
                    ul.appendChild(li);
                });
                currentReactionRolesList.appendChild(ul);
            } else {
                console.error('Failed to fetch reaction roles:', data.error);
                currentReactionRolesList.innerHTML = `<p class="error">리액션 역할을 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`; // Korean translation
            }
        } catch (error) {
            console.error('Network error fetching reaction roles:', error);
            currentReactionRolesList.innerHTML = '<p class="error">리액션 역할을 가져오는 중 네트워크 오류가 발생했습니다.</p>'; // Korean translation
        }
    }


    // --- Initialization ---
    // Initial fetches for live data
    fetchBotStatus();
    fetchCommandUsageStats();
    fetchLogs();
    fetchBotConfig();
    fetchReactionRoles(); // Fetch reaction roles on initial load

    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();
    addReactionRoleBtn.addEventListener('click', handleAddReactionRole); // Add event listener for reaction role button


    // Set intervals for dynamic updates
    setInterval(fetchBotStatus, 5000); // Fetch dashboard stats every 5 seconds
    setInterval(fetchCommandUsageStats, 10000); // Fetch command stats every 10 seconds
    setInterval(fetchLogs, 3000); // Fetch logs every 3 seconds for near real-time updates
    // setInterval(fetchReactionRoles, 30000); // Optional: Refresh reaction roles every 30 seconds
});
