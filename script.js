/**
 * 方程式金字塔 Equation Pyramid
 * 遊戲核心邏輯
 */

// ===== 遊戲狀態 =====
const GameState = {
    IDLE: 'idle',       // 等待開始
    PLAYING: 'playing', // 遊戲進行中
    ENDED: 'ended'      // 回合結束
};

// ===== 遊戲資料 =====
let gameData = {
    state: GameState.IDLE,
    cells: [],              // 10個格子的資料 [{operator, number}, ...]
    targetNumber: null,     // 目標數字
    selectedCells: [],      // 已選擇的格子索引
    usedFormulas: [],       // 本回合已使用的算式
    timer: null,            // 計時器
    timeRemaining: 180      // 剩餘時間（秒）
};

// ===== 運算符號 =====
const OPERATORS = ['+', '-', '×', '÷'];
const OPERATOR_DISPLAY = {
    '+': '+',
    '-': '-',
    '×': '×',
    '÷': '÷'
};

// ===== DOM 元素 =====
let elements = {};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    loadTeamsFromStorage();
    updateScoreboardUI();
});

function initElements() {
    elements = {
        startBtn: document.getElementById('startBtn'),
        timer: document.getElementById('timer'),
        hexagons: document.querySelectorAll('.hexagon'),
        targetNumber: document.getElementById('targetNumber'),
        formulaDisplay: document.getElementById('formulaDisplay'),
        clearSelectionBtn: document.getElementById('clearSelectionBtn'),
        usedFormulasList: document.getElementById('usedFormulasList'),
        scoreboardContainer: document.getElementById('scoreboardContainer'),
        scoreboardToggle: document.getElementById('scoreboardToggle'),
        scoreboard: document.getElementById('scoreboard'),
        teamNameInput: document.getElementById('teamNameInput'),
        addTeamBtn: document.getElementById('addTeamBtn'),
        teamList: document.getElementById('teamList'),
        correctSound: document.getElementById('correctSound'),
        incorrectSound: document.getElementById('incorrectSound')
    };
}

function initEventListeners() {
    // 開始按鈕
    elements.startBtn.addEventListener('click', handleStartButton);
    
    // 六邊形點擊
    elements.hexagons.forEach(hex => {
        hex.addEventListener('click', () => handleHexagonClick(hex));
    });
    
    // 清除選擇按鈕
    elements.clearSelectionBtn.addEventListener('click', clearSelection);
    
    // 計分板切換
    elements.scoreboardToggle.addEventListener('click', toggleScoreboard);
    
    // 新增隊伍
    elements.addTeamBtn.addEventListener('click', addTeam);
    elements.teamNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTeam();
    });
}

// ===== 遊戲流程控制 =====
function handleStartButton() {
    if (gameData.state === GameState.IDLE || gameData.state === GameState.ENDED) {
        startNewRound();
    }
}

function startNewRound() {
    // 重置遊戲資料
    gameData.state = GameState.PLAYING;
    gameData.selectedCells = [];
    gameData.usedFormulas = [];
    gameData.timeRemaining = 180;
    
    // 生成新的格子資料
    generateCells();
    
    // 計算目標數字
    calculateTargetNumber();
    
    // 更新 UI
    updateCellsUI();
    updateTargetUI();
    clearSelection();
    clearUsedFormulas();
    
    // 啟動計時器
    startTimer();
    
    // 更新按鈕文字
    elements.startBtn.textContent = '進行中...';
    elements.startBtn.disabled = true;
}

function endRound() {
    gameData.state = GameState.ENDED;
    
    // 停止計時器
    if (gameData.timer) {
        clearInterval(gameData.timer);
        gameData.timer = null;
    }
    
    // 更新按鈕
    elements.startBtn.textContent = '下一回合';
    elements.startBtn.disabled = false;
}

// ===== 格子生成 =====
function generateCells() {
    gameData.cells = [];
    for (let i = 0; i < 10; i++) {
        const operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
        const number = Math.floor(Math.random() * 11) + 1; // 1-11
        gameData.cells.push({ operator, number });
    }
}

function updateCellsUI() {
    elements.hexagons.forEach((hex, index) => {
        const cell = gameData.cells[index];
        const content = hex.querySelector('.hex-content');
        
        if (gameData.state === GameState.PLAYING || gameData.state === GameState.ENDED) {
            content.textContent = `${OPERATOR_DISPLAY[cell.operator]}${cell.number}`;
        } else {
            content.textContent = '';
        }
        
        // 移除選中狀態
        hex.classList.remove('selected');
        
        // 移除選擇順序指示器
        const orderIndicator = hex.querySelector('.selection-order');
        if (orderIndicator) {
            orderIndicator.remove();
        }
    });
}

// ===== 目標數字計算 =====
function calculateTargetNumber() {
    const results = {};
    const cells = gameData.cells;
    
    // 遍歷所有可能的組合 (10 × 10 × 10 = 1000)
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            for (let k = 0; k < 10; k++) {
                const result = calculateFormula(i, j, k);
                
                // 只計算正整數結果
                if (result !== null && Number.isInteger(result) && result > 0) {
                    results[result] = (results[result] || 0) + 1;
                }
            }
        }
    }
    
    // 找出出現頻率最高的數字（排除太常見或太罕見的）
    const sortedResults = Object.entries(results)
        .filter(([num, count]) => count >= 3 && count <= 50) // 過濾極端值
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedResults.length > 0) {
        // 從前10個高頻數字中隨機選一個
        const topResults = sortedResults.slice(0, Math.min(10, sortedResults.length));
        const randomIndex = Math.floor(Math.random() * topResults.length);
        gameData.targetNumber = parseInt(topResults[randomIndex][0]);
    } else {
        // 備用方案：隨機選擇一個有效結果
        const allResults = Object.keys(results).map(Number);
        if (allResults.length > 0) {
            gameData.targetNumber = allResults[Math.floor(Math.random() * allResults.length)];
        } else {
            gameData.targetNumber = 10; // 預設值
        }
    }
}

function updateTargetUI() {
    if (gameData.state === GameState.PLAYING || gameData.state === GameState.ENDED) {
        elements.targetNumber.textContent = gameData.targetNumber;
    } else {
        elements.targetNumber.textContent = '?';
    }
}

// ===== 算式計算引擎 =====
function calculateFormula(idx1, idx2, idx3) {
    const cell1 = gameData.cells[idx1];
    const cell2 = gameData.cells[idx2];
    const cell3 = gameData.cells[idx3];
    
    // 第一個格子只取數字（首位符號失效）
    const num1 = cell1.number;
    const op2 = cell2.operator;
    const num2 = cell2.number;
    const op3 = cell3.operator;
    const num3 = cell3.number;
    
    // 構建算式並按先乘除後加減計算
    // 算式: num1 op2 num2 op3 num3
    
    try {
        // 使用 JavaScript 的運算優先順序
        // 需要將 × 和 ÷ 轉換為 * 和 /
        let result;
        
        // 分析運算符優先順序
        const isOp2MulDiv = (op2 === '×' || op2 === '÷');
        const isOp3MulDiv = (op3 === '×' || op3 === '÷');
        
        if (isOp2MulDiv && isOp3MulDiv) {
            // 兩個都是乘除，從左到右
            let temp = applyOperator(num1, op2, num2);
            if (temp === null) return null;
            result = applyOperator(temp, op3, num3);
        } else if (isOp2MulDiv) {
            // 只有 op2 是乘除，先算 num1 op2 num2
            let temp = applyOperator(num1, op2, num2);
            if (temp === null) return null;
            result = applyOperator(temp, op3, num3);
        } else if (isOp3MulDiv) {
            // 只有 op3 是乘除，先算 num2 op3 num3
            let temp = applyOperator(num2, op3, num3);
            if (temp === null) return null;
            result = applyOperator(num1, op2, temp);
        } else {
            // 兩個都是加減，從左到右
            let temp = applyOperator(num1, op2, num2);
            if (temp === null) return null;
            result = applyOperator(temp, op3, num3);
        }
        
        return result;
    } catch (e) {
        return null;
    }
}

function applyOperator(a, op, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '×': return a * b;
        case '÷': 
            if (b === 0) return null;
            return a / b;
        default: return null;
    }
}

// ===== 格子選擇處理 =====
function handleHexagonClick(hex) {
    if (gameData.state !== GameState.PLAYING) return;
    
    const index = parseInt(hex.dataset.index);
    
    // 如果已經選擇了3個，不能再選
    if (gameData.selectedCells.length >= 3) return;
    
    // 檢查是否已經選擇過這個方塊（同一個方塊不可重複點擊）
    if (gameData.selectedCells.includes(index)) return;
    
    // 加入選擇
    gameData.selectedCells.push(index);
    
    // 更新 UI
    hex.classList.add('selected');
    
    // 添加選擇順序指示器
    const orderIndicator = document.createElement('span');
    orderIndicator.className = 'selection-order';
    orderIndicator.textContent = gameData.selectedCells.length;
    hex.appendChild(orderIndicator);
    
    // 更新公式顯示
    updateFormulaDisplay();
    
    // 如果選滿3個，自動計算結果
    if (gameData.selectedCells.length === 3) {
        checkAnswer();
    }
}

function clearSelection() {
    gameData.selectedCells = [];
    
    elements.hexagons.forEach(hex => {
        hex.classList.remove('selected');
        const orderIndicator = hex.querySelector('.selection-order');
        if (orderIndicator) {
            orderIndicator.remove();
        }
    });
    
    elements.formulaDisplay.innerHTML = '<span class="formula-placeholder">選擇三個格子組成算式</span>';
}

function updateFormulaDisplay() {
    if (gameData.selectedCells.length === 0) {
        elements.formulaDisplay.innerHTML = '<span class="formula-placeholder">選擇三個格子組成算式</span>';
        return;
    }
    
    let formulaHTML = '';
    
    gameData.selectedCells.forEach((cellIndex, i) => {
        const cell = gameData.cells[cellIndex];
        const letter = String.fromCharCode(65 + cellIndex); // A-J
        
        if (i === 0) {
            // 第一個格子只顯示數字
            formulaHTML += `<span>${cell.number}</span>`;
        } else {
            // 後續格子顯示運算符和數字
            formulaHTML += `<span> ${OPERATOR_DISPLAY[cell.operator]} ${cell.number}</span>`;
        }
    });
    
    elements.formulaDisplay.innerHTML = formulaHTML;
}

// ===== 答案驗證 =====
function checkAnswer() {
    const [idx1, idx2, idx3] = gameData.selectedCells;
    
    // 檢查是否已使用過這個組合
    const formulaKey = `${idx1}-${idx2}-${idx3}`;
    if (gameData.usedFormulas.includes(formulaKey)) {
        showFormulaResult(null, '已使用');
        playSound('incorrect');
        setTimeout(clearSelection, 1500);
        return;
    }
    
    // 計算結果
    const result = calculateFormula(idx1, idx2, idx3);
    
    // 驗證結果
    const isCorrect = result !== null && 
                      Number.isInteger(result) && 
                      result === gameData.targetNumber;
    
    if (isCorrect) {
        // 正確
        showFormulaResult(result, '正確');
        playSound('correct');
        
        // 記錄已使用的算式
        gameData.usedFormulas.push(formulaKey);
        addUsedFormulaToUI(idx1, idx2, idx3, result);
        
        // 動畫效果
        elements.formulaDisplay.classList.add('correct-animation');
        setTimeout(() => {
            elements.formulaDisplay.classList.remove('correct-animation');
            clearSelection();
        }, 1500);
    } else {
        // 錯誤
        const displayResult = result === null ? '無效' : 
                              (Number.isInteger(result) ? result : result.toFixed(2));
        showFormulaResult(displayResult, '錯誤');
        playSound('incorrect');
        
        // 動畫效果
        elements.formulaDisplay.classList.add('incorrect-animation');
        setTimeout(() => {
            elements.formulaDisplay.classList.remove('incorrect-animation');
            clearSelection();
        }, 1500);
    }
}

function showFormulaResult(result, status) {
    const resultClass = status === '正確' ? 'correct' : 'incorrect';
    const resultText = result !== null ? ` = ${result}` : '';
    
    elements.formulaDisplay.innerHTML += 
        `<span>${resultText}</span>
         <span class="formula-result ${resultClass}">${status}</span>`;
}

// ===== 已使用算式列表 =====
function addUsedFormulaToUI(idx1, idx2, idx3, result) {
    const cell1 = gameData.cells[idx1];
    const cell2 = gameData.cells[idx2];
    const cell3 = gameData.cells[idx3];
    
    const letter1 = String.fromCharCode(65 + idx1);
    const letter2 = String.fromCharCode(65 + idx2);
    const letter3 = String.fromCharCode(65 + idx3);
    
    const formulaText = `${letter1}${letter2}${letter3}: ${cell1.number} ${OPERATOR_DISPLAY[cell2.operator]} ${cell2.number} ${OPERATOR_DISPLAY[cell3.operator]} ${cell3.number} = ${result}`;
    
    const item = document.createElement('div');
    item.className = 'used-formula-item';
    item.textContent = formulaText;
    
    elements.usedFormulasList.appendChild(item);
}

function clearUsedFormulas() {
    elements.usedFormulasList.innerHTML = '';
}

// ===== 計時器 =====
function startTimer() {
    updateTimerDisplay();
    
    gameData.timer = setInterval(() => {
        gameData.timeRemaining--;
        updateTimerDisplay();
        
        if (gameData.timeRemaining <= 0) {
            endRound();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameData.timeRemaining / 60);
    const seconds = gameData.timeRemaining % 60;
    elements.timer.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ===== 音效 =====
function playSound(type) {
    const sound = type === 'correct' ? elements.correctSound : elements.incorrectSound;
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// ===== 計分板功能 =====
let teams = [];

function toggleScoreboard() {
    elements.scoreboardContainer.classList.toggle('collapsed');
}

function loadTeamsFromStorage() {
    const stored = localStorage.getItem('equationPyramidTeams');
    if (stored) {
        teams = JSON.parse(stored);
    }
}

function saveTeamsToStorage() {
    localStorage.setItem('equationPyramidTeams', JSON.stringify(teams));
}

function addTeam() {
    const name = elements.teamNameInput.value.trim();
    if (!name) return;
    
    teams.push({ name, score: 0 });
    saveTeamsToStorage();
    updateScoreboardUI();
    
    elements.teamNameInput.value = '';
}

function deleteTeam(index) {
    if (confirm(`確定要刪除隊伍「${teams[index].name}」嗎？`)) {
        teams.splice(index, 1);
        saveTeamsToStorage();
        updateScoreboardUI();
    }
}

function updateTeamScore(index, delta) {
    teams[index].score += delta;
    saveTeamsToStorage();
    updateScoreboardUI();
}

function updateScoreboardUI() {
    elements.teamList.innerHTML = '';
    
    teams.forEach((team, index) => {
        const li = document.createElement('li');
        li.className = 'team-item';
        li.innerHTML = `
            <span class="team-name">${escapeHtml(team.name)}</span>
            <span class="team-score">${team.score}</span>
            <div class="team-controls">
                <button class="score-btn plus" onclick="updateTeamScore(${index}, 1)">+</button>
                <button class="score-btn minus" onclick="updateTeamScore(${index}, -1)">-</button>
                <button class="delete-team-btn" onclick="deleteTeam(${index})">✕</button>
            </div>
        `;
        elements.teamList.appendChild(li);
    });
}

// ===== 工具函數 =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
