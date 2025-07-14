// web/static/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const API_BASE_URL = '/api';

    // --- Dashboard Elements ---
    const statusIndicator = document.getElementById('status');
    const uptimeElement = document.getElementById('uptime');
    const latencyElement = document.getElementById('latency');
    const commandsTodayElement = document.getElementById('commands-today');
    const activeUsersElement = document.getElementById('active-users');
    const serverCountElement = document.getElementById('server-count');

    // --- Server Info Elements ---
    const serverInfoList = document.getElementById('server-info-list');

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
    const commandUsageChartElement = document.getElementById('commandUsageChart');
    const commandUsageChartCtx = commandUsageChartElement ? commandUsageChartElement.getContext('2d') : null;
    const topCommandsList = document.getElementById('top-commands-list');
    let commandUsageChart;

    // --- Logs Viewer Elements ---
    const logOutput = document.getElementById('log-output');
    const logFilterInput = document.getElementById('log-filter');
    const logLevelFilterSelect = document.getElementById('log-level-filter');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const downloadLogsBtn = document.getElementById('download-logs-btn');

    // Global variable to hold all currently displayed log entries
    // This will now only contain logs added after a clear or initial fetch
    let allLogEntries = [];
    // Variable to hold the log fetching interval ID
    let logFetchIntervalId;
    let lastClearedTimestamp = null;

    // Interval IDs for other dashboard components (optional, but good practice for cleanup)
    let botStatusIntervalId;
    let commandStatsIntervalId;
    let serverInfoIntervalId;

    // --- Configuration Viewer Elements ---
    const configOutput = document.getElementById('config-output');

    // --- Tab Navigation Elements ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    /**
     * Displays a message in a specified element with a given type (success, error, info).
     * The message will fade out after a few seconds.
     * @param {HTMLElement} messageElement - The HTML element to display the message in.
     * @param {string} message - The message text.
     * @param {'success'|'error'|'info'} type - The type of message for styling.
     */
    function showMessage(messageElement, message, type) {
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `message show ${type}`;
            setTimeout(() => {
                messageElement.classList.remove('show');
                setTimeout(() => messageElement.textContent = '', 300);
            }, 3000);
        } else {
            console.warn(`Attempted to show message "${message}" but message element was null.`);
        }
    }

    // --- Dashboard Functions ---
    async function fetchBotStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/bot_info`);
            const data = await response.json();

            if (response.ok) {
                if (statusIndicator) statusIndicator.textContent = data.status;
                if (statusIndicator) statusIndicator.className = `status-indicator ${data.status.toLowerCase()}`;
                if (uptimeElement) uptimeElement.textContent = data.uptime;
                if (latencyElement) latencyElement.textContent = `${data.latency_ms} ms`;
                if (activeUsersElement) activeUsersElement.textContent = data.user_count;
                if (serverCountElement) serverCountElement.textContent = data.guild_count;
            } else {
                console.error('Failed to fetch bot status:', data.error);
                if (statusIndicator) statusIndicator.textContent = 'Error';
                if (statusIndicator) statusIndicator.className = 'status-indicator error';
                if (uptimeElement) uptimeElement.textContent = 'N/A';
                if (latencyElement) latencyElement.textContent = 'N/A';
                if (commandsTodayElement) commandsTodayElement.textContent = 'N/A';
                if (activeUsersElement) activeUsersElement.textContent = 'N/A';
                if (serverCountElement) serverCountElement.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Network error fetching bot status:', error);
            if (statusIndicator) statusIndicator.textContent = 'Offline (API Error)';
            if (statusIndicator) statusIndicator.className = 'status-indicator offline';
            if (uptimeElement) uptimeElement.textContent = 'N/A';
            if (latencyElement) latencyElement.textContent = 'N/A';
            if (commandsTodayElement) commandsTodayElement.textContent = 'N/A';
            if (activeUsersElement) activeUsersElement.textContent = 'N/A';
            if (serverCountElement) serverCountElement.textContent = 'N/A';
        }
    }

    // --- Server Info Functions ---
    async function fetchServerInfo() {
        try {
            const response = await fetch(`${API_BASE_URL}/guilds`);
            const data = await response.json();

            if (response.ok) {
                serverInfoList.innerHTML = '';

                if (data.length === 0) {
                    serverInfoList.innerHTML = '<p>봇이 참여하고 있는 서버가 없습니다.</p>';
                    return;
                }

                data.forEach(guild => {
                    const guildCard = document.createElement('div');
                    guildCard.className = 'guild-card';

                    let iconHtml = '';
                    if (guild.icon_url) {
                        iconHtml = `<img src="${guild.icon_url}" alt="${guild.name} Icon" class="guild-icon">`;
                    } else {
                        iconHtml = `<div class="guild-icon-placeholder">${guild.name.charAt(0).toUpperCase()}</div>`;
                    }

                    guildCard.innerHTML = `
                        ${iconHtml}
                        <div class="guild-details">
                            <h3>${guild.name} <span class="guild-id">(ID: ${guild.id})</span></h3>
                            <p>멤버 수: ${guild.member_count}</p>
                            <p>채널 수: ${guild.channel_count}</p>
                            <p>소유자: ${guild.owner_name} <span class="owner-id">(ID: ${guild.owner_id})</span></p>
                        </div>
                    `;
                    serverInfoList.appendChild(guildCard);
                });

            } else {
                console.error('Failed to fetch server info:', data.error);
                serverInfoList.innerHTML = `<p class="error">서버 정보를 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching server info:', error);
            serverInfoList.innerHTML = '<p class="error">서버 정보를 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }

    // --- Bot Control Panel Functions ---
    async function sendControlAction(action, actionName, messageElement) {
        showMessage(messageElement, `${actionName.toLowerCase()} 시도 중...`, 'info');
        if (restartBotBtn) restartBotBtn.disabled = true;
        if (reloadCogsBtn) reloadCogsBtn.disabled = true;
        if (updateGitBtn) updateGitBtn.disabled = true;
        if (sendAnnouncementBtn) sendAnnouncementBtn.disabled = true;

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
                fetchBotStatus();
                fetchCommandUsageStats();
                // When bot is controlled, fetch ALL logs to update state
                fetchAllHistoricalLogs();
                fetchServerInfo();
            } else {
                showMessage(messageElement, `${actionName} 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error(`${actionName} API error:`, data.error);
            }
        } catch (error) {
            showMessage(messageElement, `Network error during ${actionName.toLowerCase()}: ${error.message}`, 'error');
            console.error(`Network error for ${actionName}:`, error);
        } finally {
            if (restartBotBtn) restartBotBtn.disabled = false;
            if (reloadCogsBtn) reloadCogsBtn.disabled = false;
            if (updateGitBtn) updateGitBtn.disabled = false;
            if (sendAnnouncementBtn) sendAnnouncementBtn.disabled = false;
        }
    }

    function setupControlPanelListeners() {
        if (restartBotBtn) restartBotBtn.addEventListener('click', () => sendControlAction('restart', '봇 재시작', controlStatusMessage));
        if (reloadCogsBtn) reloadCogsBtn.addEventListener('click', () => sendControlAction('reload_cogs', 'Cog 재로드', controlStatusMessage));
        if (updateGitBtn) updateGitBtn.addEventListener('click', () => sendControlAction('update_git', 'Git에서 업데이트', controlStatusMessage));
    }

    // --- Send Announcement Functions ---
    async function handleSendAnnouncement() {
        if (!announcementMessageInput || !announcementChannelInput || !sendAnnouncementBtn || !announcementStatusMessage) {
            console.warn("Missing announcement elements. Cannot send announcement.");
            return;
        }

        const message = announcementMessageInput.value.trim();
        const channelId = announcementChannelInput.value.trim();

        if (!message) {
            showMessage(announcementStatusMessage, '공지 메시지를 입력해주세요.', 'error');
            return;
        }
        if (!channelId || !/^\d{17,19}$/.test(channelId)) {
            showMessage(announcementStatusMessage, '유효한 디스코드 채널 ID (17-19자리 숫자)를 입력해주세요.', 'error');
            return;
        }

        showMessage(announcementStatusMessage, '공지 전송 중...', 'info');
        sendAnnouncementBtn.disabled = true;

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
                announcementMessageInput.value = '';
                // When announcement is sent, fetch ALL logs to update state
                fetchAllHistoricalLogs();
            } else {
                showMessage(announcementStatusMessage, `공지 전송 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('Announcement API error:', data.error);
            }
        } catch (error) {
            showMessage(announcementStatusMessage, `공지 전송 중 네트워크 오류: ${error.message}`, 'error');
            console.error('Network error for announcement:', error);
        } finally {
            if (sendAnnouncementBtn) sendAnnouncementBtn.disabled = false;
        }
    }

    function setupAnnouncementSenderListeners() {
        if (sendAnnouncementBtn) sendAnnouncementBtn.addEventListener('click', handleSendAnnouncement);
    }

    // --- Command Usage Stats Functions ---
    async function fetchCommandUsageStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/command_stats`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                const commandStats = data.command_stats;
                const labels = commandStats.map(stat => stat.command_name);
                const dataValues = commandStats.map(stat => stat.usage_count);

                const totalCommands = dataValues.reduce((sum, count) => sum + count, 0);
                if (commandsTodayElement) commandsTodayElement.textContent = totalCommands;

                if (commandUsageChartElement && commandUsageChartCtx) {
                    if (commandUsageChart) {
                        commandUsageChart.data.labels = labels;
                        commandUsageChart.data.datasets[0].data = dataValues;
                        commandUsageChart.update();
                    } else {
                        initCommandUsageChart(labels, dataValues);
                    }
                } else {
                    console.warn("Chart elements not found. Cannot display command usage chart.");
                }
                updateTopCommandsList(commandStats);
            } else {
                console.error('Failed to fetch command stats:', data.error);
                if (commandsTodayElement) commandsTodayElement.textContent = '오류';
                if (commandUsageChart) {
                    commandUsageChart.data.labels = [];
                    commandUsageChart.data.datasets[0].data = [];
                    commandUsageChart.update();
                }
                if (topCommandsList) topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 오류가 발생했습니다.</li>';
            }
        } catch (error) {
            console.error('Network error fetching command stats:', error);
            if (commandsTodayElement) commandsTodayElement.textContent = 'N/A';
            if (commandUsageChart) {
                commandUsageChart.data.labels = [];
                commandUsageChart.data.datasets[0].data = [];
                commandUsageChart.update();
            }
            if (topCommandsList) topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 네트워크 오류가 발생했습니다.</li>';
        }
    }

    function initCommandUsageChart(labels, dataValues) {
        if (!commandUsageChartCtx) {
            console.error("Chart context not found. Cannot initialize command usage chart.");
            return;
        }
        commandUsageChart = new Chart(commandUsageChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '사용된 명령어',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(88, 101, 242, 0.8)',
                        'rgba(114, 137, 218, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(201, 203, 207, 0.8)'
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

    function updateTopCommandsList(commandStats) {
        if (!topCommandsList) {
            console.warn("Top commands list element not found. Cannot update list.");
            return;
        }
        topCommandsList.innerHTML = '';

        commandStats.forEach(stat => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${stat.command_name}:</span> <span>${stat.usage_count}회 사용</span>`;
            topCommandsList.appendChild(listItem);
        });
    }

    // --- Logs Viewer Functions ---

    // New function to fetch all historical logs (used on initial load or full refresh)
    async function fetchAllHistoricalLogs() {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                allLogEntries = data.logs; // Overwrite with all historical logs
                renderLogs();
            } else {
                console.error('Failed to fetch logs:', data.error);
                if (logOutput) logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 오류가 발생했습니다.</p>';
            }
        } catch (error) {
            console.error('Network error fetching logs:', error);
            if (logOutput) logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }

async function fetchNewLogsOnly() {
    let url = `${API_BASE_URL}/logs`;
    // It's good practice to still send since_timestamp for backend efficiency
    if (lastClearedTimestamp) {
        url += `?since_timestamp=${encodeURIComponent(lastClearedTimestamp)}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            let fetchedLogs = data.logs;

            // --- START OF NEW CLIENT-SIDE FILTERING LOGIC ---
            // If a last cleared timestamp exists, filter logs that are older than it
            if (lastClearedTimestamp) {
                // Parse the clear timestamp into a Date object
                // The format YYYY-MM-DD HH:MM:SS is generally parsable by Date()
                const clearTime = new Date(lastClearedTimestamp);

                // Filter out any logs from the fetched data that occurred BEFORE the clear time
                fetchedLogs = fetchedLogs.filter(log => {
                    const logTime = new Date(log.timestamp); // Assuming log.timestamp from backend is parsable
                    return logTime > clearTime; // Only keep logs that are strictly newer than the clear time
                });
            }
            // --- END OF NEW CLIENT-SIDE FILTERING LOGIC ---

            // Existing filter to prevent duplicates (still useful if logs are simulated or somehow duplicated)
            const trulyNewLogs = fetchedLogs.filter(newEntry =>
                !allLogEntries.some(existingEntry =>
                    existingEntry.timestamp === newEntry.timestamp &&
                    existingEntry.level === newEntry.level &&
                    existingEntry.message === newEntry.message
                )
            );

            if (trulyNewLogs.length > 0) {
                allLogEntries.push(...trulyNewLogs); // Add new logs to the array
                renderLogs(); // Re-render the entire list to include new logs
            }
        } else if (response.status === 400 && data.message.includes("Invalid since_timestamp format")) {
            console.warn("Backend reported invalid timestamp format. Resetting lastClearedTimestamp.");
            lastClearedTimestamp = null; // Reset to fetch all next time if format was bad
        } else {
            console.error('Failed to fetch new logs:', data.error);
        }
    } catch (error) {
        console.error('Network error fetching new logs:', error);
    }
}
    // New function to add a single log entry to the display and array
function addLogEntry(entry) {
        allLogEntries.push(entry);
    renderLogs();
}
    function renderLogs() {
        if (!logOutput) {
            console.warn("Log output element not found. Cannot render logs.");
            return;
        }
        logOutput.innerHTML = '';

        const filterText = (logFilterInput ? logFilterInput.value.toLowerCase() : '');
        const filterLevel = (logLevelFilterSelect ? logLevelFilterSelect.value.toLowerCase() : 'all');

        const filteredLogs = allLogEntries.filter(entry => {
            if (entry.logger_name && entry.logger_name.toLowerCase() === 'werkzeug') {
                 return false;
            }
            if (entry.level && entry.level.toLowerCase() === 'raw') {
                if (filterLevel === 'all' || filterLevel === 'raw') {
                    return entry.message.toLowerCase().includes(filterText);
                }
                return false;
            }

            const matchesText = (entry.message && entry.message.toLowerCase().includes(filterText)) ||
                                (entry.timestamp && entry.timestamp.toLowerCase().includes(filterText)) ||
                                (entry.level && entry.level.toLowerCase().includes(filterText)) ||
                                (entry.logger_name && entry.logger_name.toLowerCase().includes(filterText));

            const matchesLevel = filterLevel === 'all' || (entry.level && entry.level.toLowerCase() === filterLevel);
            return matchesText && matchesLevel;
        });

        filteredLogs.forEach(entry => {
            const p = document.createElement('p');
            const logSourceName = entry.logger_name || 'UNKNOWN';
            const logLevel = entry.level || 'UNKNOWN';
            const logTimestamp = entry.timestamp || 'N/A';
            const logMessage = entry.message || '';

            p.className = `log-entry ${logLevel.toLowerCase()}`;
            p.textContent = `[${logLevel}] ${logTimestamp} [${logSourceName}] ${logMessage}`;
            logOutput.appendChild(p);
        });

        logOutput.scrollTop = logOutput.scrollHeight;
    }

    function setupLogsViewerListeners() {
        if (logFilterInput) logFilterInput.addEventListener('input', renderLogs);
        if (logLevelFilterSelect) logLevelFilterSelect.addEventListener('change', renderLogs);

        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                if (logOutput) logOutput.innerHTML = '';
                allLogEntries = []; // Clear the in-memory array

                // NEW: Set lastClearedTimestamp to the current time for subsequent fetches
                const now = new Date();
                lastClearedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                // Stop any existing interval and start a new one to fetch only new logs
                if (logFetchIntervalId) {
                    clearInterval(logFetchIntervalId);
                }
                // Start fetching only new logs immediately after clear
                logFetchIntervalId = setInterval(fetchNewLogsOnly, 3000);

                if (controlStatusMessage) showMessage(controlStatusMessage, '로그 화면이 지워졌습니다.', 'info');
                renderLogs(); // Render empty logs to confirm visual clear
            });
        }

        if (downloadLogsBtn) {
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
                URL.revokeObjectURL(url);
                if (controlStatusMessage) showMessage(controlStatusMessage, '로그가 성공적으로 다운로드되었습니다.', 'success');
            });
        }
    }

    // --- Configuration Viewer Functions ---
    async function fetchBotConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                if (configOutput) configOutput.innerHTML = '';
                if (configOutput && Object.keys(data.config).length === 0) {
                    configOutput.innerHTML = '<p>표시할 설정 변수가 없습니다.</p>';
                    return;
                }
                if (configOutput) {
                    const ul = document.createElement('ul');
                    for (const [key, value] of Object.entries(data.config)) {
                        const li = document.createElement('li');
                        li.innerHTML = `<span>${key}:</span> <span>${value}</span>`;
                        ul.appendChild(li);
                    }
                    configOutput.appendChild(ul);
                }
            } else {
                console.error('Failed to fetch bot config:', data.error);
                if (configOutput) configOutput.innerHTML = `<p class="error">설정을 가져오는 중 오류 발생: ${data.error || '알 수 없는 오류'}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching bot config:', error);
            if (configOutput) configOutput.innerHTML = '<p class="error">설정을 가져오는 중 네트워크 오류가 발생했습니다.</p>';
        }
    }


    // --- Tab Navigation Functions ---
    function showTab(tabId) {
        // Remove 'active' class from all buttons and panes
        tabButtons.forEach(button => button.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Add 'active' class to the clicked button and its corresponding pane
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        const activePane = document.getElementById(tabId);

        if (activeButton) {
            activeButton.classList.add('active');
        }
        if (activePane) {
            activePane.classList.add('active');
        }
    }

    // Helper function to start the log fetching interval
    function startLogFetchingInterval() {
        if (!logFetchIntervalId) { // Only start if not already running
            logFetchIntervalId = setInterval(fetchNewLogsOnly, 3000);
        }
    }

    // Helper function to stop all intervals
    function stopAllIntervals() {
        if (logFetchIntervalId) clearInterval(logFetchIntervalId);
        if (botStatusIntervalId) clearInterval(botStatusIntervalId);
        if (commandStatsIntervalId) clearInterval(commandStatsIntervalId);
        if (serverInfoIntervalId) clearInterval(serverInfoIntervalId);

        logFetchIntervalId = null;
        botStatusIntervalId = null;
        commandStatsIntervalId = null;
        serverInfoIntervalId = null;
    }

    // --- Initialization ---
    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();

    // Add event listeners for tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            showTab(tabId);

            stopAllIntervals(); // Stop all intervals first

            if (tabId === 'dashboard-tab') {
                fetchBotStatus();
                botStatusIntervalId = setInterval(fetchBotStatus, 5000);
            } else if (tabId === 'server-info-tab') {
                fetchServerInfo();
                serverInfoIntervalId = setInterval(fetchServerInfo, 15000);
            } else if (tabId === 'command-stats-tab') {
                fetchCommandUsageStats();
                commandStatsIntervalId = setInterval(fetchCommandUsageStats, 10000);
            } else if (tabId === 'logs-viewer-tab') {
                // When navigating to logs tab, always fetch ALL historical logs initially
                // and reset the 'since_timestamp' filter
                lastClearedTimestamp = null;
                fetchNewLogsOnly(); // This call will now fetch all history if lastClearedTimestamp is null
                startLogFetchingInterval(); // Then start interval to append new logs
            } else if (tabId === 'config-viewer-tab') {
                fetchBotConfig();
            }
        });
    });

    // Initial load: Set dashboard as active and fetch its data
    showTab('dashboard-tab');
    fetchBotStatus();
    botStatusIntervalId = setInterval(fetchBotStatus, 5000);
    fetchCommandUsageStats();
    commandStatsIntervalId = setInterval(fetchCommandUsageStats, 10000);
    // Do NOT fetch all historical logs or start their interval on initial load unless on logs tab
    // The logs tab will handle its own initial fetch when clicked.


    const simulateButtons = document.querySelectorAll('.simulate-log-btn');

    simulateButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const logLevel = button.dataset.logLevel;
            const defaultMessage = `이것은 ${logLevel} 수준의 테스트 로그 메시지입니다.`;

            try {
                const response = await fetch(`${API_BASE_URL}/simulate_log`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ level: logLevel, message: defaultMessage })
                });

                const data = await response.json();
                if (data.status === 'success' || data.status === 'warning') {
                    console.log(`Simulated log: ${data.message}`);

                    if (document.getElementById('logs-viewer-tab').classList.contains('active')) {
                        const now = new Date();
                        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                        const simulatedEntry = {
                            level: logLevel.toUpperCase(),
                            timestamp: timestamp,
                            logger_name: 'Simulated',
                            message: defaultMessage
                        };
                        addLogEntry(simulatedEntry);
                    }
                } else {
                    console.error('Error simulating log:', data.error);
                }
            } catch (error) {
                console.error('Network error during log simulation:', error);
            }
        });
    });

// In script.js
const logOutputElement = document.getElementById('log-output');

async function fetchAndDisplayLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/logs`); // New endpoint to be created
        const data = await response.json();
        logOutputElement.innerHTML = ''; // Clear existing logs
        if (data.status === 'success' && data.logs) {
            data.logs.forEach(log => {
                addLogEntry(log); // Reuse addLogEntry or create a new one
            });
        } else {
            logOutputElement.innerHTML = '<p class="error-message">로그를 불러오는 데 실패했습니다.</p>';
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        logOutputElement.innerHTML = '<p class="error-message">네트워크 오류로 로그를 불러올 수 없습니다.</p>';
    }
}

// Call this when the logs viewer tab is activated
document.querySelector('.tab-navigation').addEventListener('click', (event) => {
    if (event.target.dataset.tab === 'logs-viewer-tab') {
        fetchAndDisplayLogs();
    }
});

});