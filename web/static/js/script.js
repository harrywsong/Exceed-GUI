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

    // --- Configuration Editor Elements ---
    const configDisplay = document.getElementById('config-display');
    const configStatusMessage = document.getElementById('config-status-message');

    // --- Reaction Roles Editor Elements ---
    const rrMessageIdInput = document.getElementById('rr-message-id');
    const rrChannelIdInput = document.getElementById('rr-channel-id');
    const rrEmojiInput = document.getElementById('rr-emoji');
    const rrRoleIdInput = document.getElementById('rr-role-id');
    const addReactionRoleBtn = document.getElementById('add-reaction-role-btn');
    const addRrStatusMessage = document.getElementById('add-rr-status-message');
    const reactionRolesTableBody = document.querySelector('#reaction-roles-table tbody');
    const listRrStatusMessage = document.getElementById('list-rr-status-message');


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
            const response = await fetch(`${API_BASE_URL}/bot_info`);
            const data = await response.json();

            if (response.ok) {
                statusIndicator.textContent = data.status;
                statusIndicator.className = `status-indicator ${data.status.toLowerCase()}`;
                uptimeElement.textContent = data.uptime;
                latencyElement.textContent = `${data.latency_ms} ms`;
                activeUsersElement.textContent = data.user_count;
                serverCountElement.textContent = data.guild_count;
            } else {
                console.error('봇 상태를 가져오는 데 실패했습니다:', data.error);
                statusIndicator.textContent = '오류';
                statusIndicator.className = 'status-indicator error';
                uptimeElement.textContent = 'N/A';
                latencyElement.textContent = 'N/A';
                commandsTodayElement.textContent = 'N/A';
                activeUsersElement.textContent = 'N/A';
                serverCountElement.textContent = 'N/A';
            }
        } catch (error) {
            console.error('봇 상태를 가져오는 중 네트워크 오류:', error);
            statusIndicator.textContent = '오프라인 (API 오류)';
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
        addReactionRoleBtn.disabled = true; // Disable RR buttons too

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
                fetchCommandUsageStats();
                fetchLogs();
                fetchReactionRoles(); // Also refresh reaction roles
            } else {
                showMessage(messageElement, `${actionName} 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error(`${actionName} API 오류:`, data.error);
            }
        } catch (error) {
            showMessage(messageElement, `${actionName.toLowerCase()} 중 네트워크 오류: ${error.message}`, 'error');
            console.error(`${actionName} 중 네트워크 오류:`, error);
        } finally {
            // Re-enable buttons
            restartBotBtn.disabled = false;
            reloadCogsBtn.disabled = false;
            updateGitBtn.disabled = false;
            sendAnnouncementBtn.disabled = false;
            addReactionRoleBtn.disabled = false;
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
                fetchLogs();
            } else {
                showMessage(announcementStatusMessage, `공지 전송 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('공지 API 오류:', data.error);
            }
        } catch (error) {
            showMessage(announcementStatusMessage, `공지 전송 중 네트워크 오류: ${error.message}`, 'error');
            console.error('공지 전송 중 네트워크 오류:', error);
        } finally {
            sendAnnouncementBtn.disabled = false;
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
                const totalCommands = data.total_commands_today || 0; // Use total_commands_today from bot API
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
                console.error('명령어 통계를 가져오는 데 실패했습니다:', data.error);
                commandsTodayElement.textContent = '오류';
                if (commandUsageChart) {
                    commandUsageChart.data.labels = [];
                    commandUsageChart.data.datasets[0].data = [];
                    commandUsageChart.update();
                }
                topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 오류가 발생했습니다.</li>';
            }
        } catch (error) {
            console.error('명령어 통계를 가져오는 중 네트워크 오류:', error);
            commandsTodayElement.textContent = 'N/A';
            if (commandUsageChart) {
                commandUsageChart.data.labels = [];
                commandUsageChart.data.datasets[0].data = [];
                commandUsageChart.update();
            }
            topCommandsList.innerHTML = '<li>명령어 통계를 가져오는 중 네트워크 오류가 발생했습니다.</li>';
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
                    label: '사용된 명령어',
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
            listItem.innerHTML = `<span>/${stat.command_name}:</span> <span>${stat.usage_count}회 사용</span>`;
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
                    // First, check if the raw log line contains "werkzeug"
                    if (logLine.toLowerCase().includes('werkzeug')) {
                        const simpleMatch = logLine.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(.*?)\s*\]/);
                        return {
                            timestamp: simpleMatch ? simpleMatch[1] : 'N/A',
                            level: simpleMatch ? simpleMatch[2].trim().toUpperCase() : 'INFO',
                            name: 'werkzeug',
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
                console.error('로그를 가져오는 데 실패했습니다:', data.error);
                logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 오류가 발생했습니다.</p>';
            }
        } catch (error) {
            console.error('로그를 가져오는 중 네트워크 오류:', error);
            logOutput.innerHTML = '<p class="log-entry error">로그를 가져오는 중 네트워크 오류가 발생했습니다.</p>';
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
                                entry.name.toLowerCase().includes(filterText);
            const matchesLevel = filterLevel === 'all' || entry.level.toLowerCase() === filterLevel.toLowerCase();
            return matchesText && matchesLevel;
        });

        filteredLogs.forEach(entry => {
            const p = document.createElement('p');
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
            logOutput.innerHTML = '';
            showMessage(controlStatusMessage, '로그 뷰가 지워졌습니다.', 'info');
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
            URL.revokeObjectURL(url);
            showMessage(controlStatusMessage, '로그가 성공적으로 다운로드되었습니다.', 'success');
        });
    }

    // --- Configuration Editor Functions ---
    async function fetchConfig() {
        configDisplay.innerHTML = '<p>설정 로딩 중...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/config_proxy`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                let html = '<h3>현재 봇 설정:</h3>';
                html += '<ul>';
                for (const key in data.config) {
                    if (Object.hasOwnProperty.call(data.config, key)) {
                        let value = data.config[key];
                        // Format array values nicely
                        if (Array.isArray(value)) {
                            value = `[${value.join(', ')}]`;
                        }
                        html += `<li><strong>${key}:</strong> ${value}</li>`;
                    }
                }
                html += '</ul>';
                configDisplay.innerHTML = html;
                showMessage(configStatusMessage, '봇 설정을 성공적으로 가져왔습니다.', 'success');
            } else {
                configDisplay.innerHTML = '<p class="error">설정을 가져오는 데 실패했습니다.</p>';
                showMessage(configStatusMessage, `설정을 가져오는 데 실패했습니다: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('설정 API 오류:', data.error);
            }
        } catch (error) {
            configDisplay.innerHTML = '<p class="error">설정을 가져오는 중 네트워크 오류.</p>';
            showMessage(configStatusMessage, `설정을 가져오는 중 네트워크 오류: ${error.message}`, 'error');
            console.error('설정 가져오기 중 네트워크 오류:', error);
        }
    }


    // --- Reaction Roles Editor Functions ---

    async function fetchReactionRoles() {
        reactionRolesTableBody.innerHTML = '<tr><td colspan="5">리액션 역할 로딩 중...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/reaction_roles_proxy`);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                renderReactionRolesTable(data.reaction_roles);
                showMessage(listRrStatusMessage, '리액션 역할을 성공적으로 가져왔습니다.', 'success');
            } else {
                reactionRolesTableBody.innerHTML = '<tr><td colspan="5" class="error">리액션 역할을 가져오는 데 실패했습니다.</td></tr>';
                showMessage(listRrStatusMessage, `리액션 역할을 가져오는 데 실패했습니다: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('리액션 역할 API 오류:', data.error);
            }
        } catch (error) {
            reactionRolesTableBody.innerHTML = '<tr><td colspan="5" class="error">리액션 역할을 가져오는 중 네트워크 오류.</td></tr>';
            showMessage(listRrStatusMessage, `리액션 역할을 가져오는 중 네트워크 오류: ${error.message}`, 'error');
            console.error('리액션 역할 가져오기 중 네트워크 오류:', error);
        }
    }

    function renderReactionRolesTable(reactionRoles) {
        reactionRolesTableBody.innerHTML = ''; // Clear existing rows
        if (reactionRoles.length === 0) {
            reactionRolesTableBody.innerHTML = '<tr><td colspan="5">등록된 리액션 역할이 없습니다.</td></tr>';
            return;
        }

        reactionRoles.forEach(rr => {
            const row = reactionRolesTableBody.insertRow();
            row.insertCell(0).textContent = rr.message_id;
            row.insertCell(1).textContent = rr.channel_id;
            row.insertCell(2).textContent = rr.emoji;
            row.insertCell(3).textContent = rr.role_id;

            const actionCell = row.insertCell(4);
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i> 제거';
            deleteButton.onclick = () => removeReactionRole(rr.message_id, rr.emoji);
            actionCell.appendChild(deleteButton);
        });
    }

    async function addReactionRole() {
        const message_id = rrMessageIdInput.value.trim();
        const channel_id = rrChannelIdInput.value.trim();
        const emoji = rrEmojiInput.value.trim();
        const role_id = rrRoleIdInput.value.trim();

        if (!message_id || !channel_id || !emoji || !role_id) {
            showMessage(addRrStatusMessage, '모든 필드를 채워주세요.', 'error');
            return;
        }

        if (isNaN(message_id) || isNaN(channel_id) || isNaN(role_id)) {
            showMessage(addRrStatusMessage, '메시지 ID, 채널 ID, 역할 ID는 숫자여야 합니다.', 'error');
            return;
        }

        showMessage(addRrStatusMessage, '리액션 역할 추가 중...', 'info');
        addReactionRoleBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/reaction_roles_proxy/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message_id: parseInt(message_id),
                    channel_id: parseInt(channel_id),
                    emoji: emoji,
                    role_id: parseInt(role_id)
                })
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showMessage(addRrStatusMessage, `리액션 역할 추가 성공! ${data.message || ''}`, 'success');
                rrMessageIdInput.value = '';
                rrChannelIdInput.value = '';
                rrEmojiInput.value = '';
                rrRoleIdInput.value = '';
                fetchReactionRoles(); // Refresh the list
            } else {
                showMessage(addRrStatusMessage, `리액션 역할 추가 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('리액션 역할 추가 API 오류:', data.error);
            }
        } catch (error) {
            showMessage(addRrStatusMessage, `리액션 역할 추가 중 네트워크 오류: ${error.message}`, 'error');
            console.error('리액션 역할 추가 중 네트워크 오류:', error);
        } finally {
            addReactionRoleBtn.disabled = false;
        }
    }

    async function removeReactionRole(message_id, emoji) {
        if (!confirm(`메시지 ID ${message_id}에서 이모지 "${emoji}"에 대한 리액션 역할을 정말 제거하시겠습니까?`)) {
            return;
        }

        showMessage(listRrStatusMessage, '리액션 역할 제거 중...', 'info');
        // Disable all delete buttons temporarily to prevent multiple clicks
        document.querySelectorAll('.delete-btn').forEach(btn => btn.disabled = true);


        try {
            const response = await fetch(`${API_BASE_URL}/reaction_roles_proxy/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message_id: message_id, emoji: emoji })
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showMessage(listRrStatusMessage, `리액션 역할 제거 성공! ${data.message || ''}`, 'success');
                fetchReactionRoles(); // Refresh the list
            } else {
                showMessage(listRrStatusMessage, `리액션 역할 제거 실패: ${data.error || '알 수 없는 오류'}`, 'error');
                console.error('리액션 역할 제거 API 오류:', data.error);
            }
        } catch (error) {
            showMessage(listRrStatusMessage, `리액션 역할 제거 중 네트워크 오류: ${error.message}`, 'error');
            console.error('리액션 역할 제거 중 네트워크 오류:', error);
        } finally {
            // Re-enable all delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => btn.disabled = false);
        }
    }

    // --- Initialization ---
    // Initial fetches for live data
    fetchBotStatus();
    fetchCommandUsageStats();
    fetchLogs();
    fetchConfig(); // Fetch configuration on load
    fetchReactionRoles(); // Fetch reaction roles on load

    // Set up all event listeners
    setupControlPanelListeners();
    setupAnnouncementSenderListeners();
    setupLogsViewerListeners();
    addReactionRoleBtn.addEventListener('click', addReactionRole); // Add listener for new RR button


    // Set intervals for dynamic updates
    setInterval(fetchBotStatus, 5000); // Fetch dashboard stats every 5 seconds
    setInterval(fetchCommandUsageStats, 10000); // Fetch command stats every 10 seconds
    setInterval(fetchLogs, 3000); // Fetch logs every 3 seconds for near real-time updates
    // setInterval(fetchConfig, 30000); // Config doesn't change often, less frequent update
    // setInterval(fetchReactionRoles, 15000); // Reaction roles might change, update more frequently than config
});
