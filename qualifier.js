const CONFIG = {
    minTermsOfNumber: 4,
    maxTermsOfNumber: 6,
    minNumber: 1,
    maxNumber: 15,
    operators: ['+', '-', '×', '÷'],
    maxAttempts: 2000,
    allowNegative: false
};

let currentQuestion = null;

const elements = {
    equationText: document.getElementById('equationText'),
    answerInput: document.getElementById('answerInput'),
    checkBtn: document.getElementById('checkBtn'),
    nextBtn: document.getElementById('nextBtn'),
    statusMessage: document.getElementById('statusMessage')
};

function init() {
    generateNewQuestion();
    elements.checkBtn.addEventListener('click', checkAnswer);
    elements.nextBtn.addEventListener('click', handleNextQuestion);
    elements.answerInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            checkAnswer();
        }
    });
}

function handleNextQuestion() {
    elements.answerInput.value = '';
    elements.answerInput.focus();
    elements.nextBtn.disabled = true;
    setStatus('請輸入答案並送出', '');
    generateNewQuestion();
}

function generateNewQuestion() {
    let attempts = 0;

    while (attempts < CONFIG.maxAttempts) {
        const termCount = randomInt(CONFIG.minTermsOfNumber, CONFIG.maxTermsOfNumber);
        const termsOfNumber = Array.from({ length: termCount }, () => randomInt(CONFIG.minNumber, CONFIG.maxNumber));
        const operators = Array.from({ length: termCount - 1 }, () => randomOperator());

        const result = evaluateExpression(termsOfNumber, operators);

        if (result !== null && Number.isInteger(result) && result < 100) {
            if (CONFIG.allowNegative || result >= 0) {
                currentQuestion = { termsOfNumber, operators, result };
                updateEquationText();
                return;
            }
        }

        attempts++;
    }

    currentQuestion = {
        termsOfNumber: [2, 3, 4, 5],
        operators: ['+', '×', '+'],
        result: 2 + 3 * 4 + 5
    };
    updateEquationText();
}

function updateEquationText() {
    const { termsOfNumber, operators } = currentQuestion;
    let text = `${termsOfNumber[0]}`;

    for (let i = 0; i < operators.length; i++) {
        text += ` ${operators[i]} ${termsOfNumber[i + 1]}`;
    }

    elements.equationText.textContent = text;
}

function checkAnswer() {
    if (!currentQuestion) return;

    const rawValue = elements.answerInput.value.trim();

    if (!/^-?\d+$/.test(rawValue)) {
        setStatus('請輸入整數答案', 'error');
        return;
    }

    const answer = Number(rawValue);
    if (!Number.isInteger(answer)) {
        setStatus('只接受整數答案', 'error');
        return;
    }

    if (!CONFIG.allowNegative && answer < 0) {
        setStatus('答案不可為負數', 'error');
        return;
    }

    if (answer === currentQuestion.result) {
        setStatus('正確！可以前往下一題', 'success');
        elements.nextBtn.disabled = false;
    } else {
        setStatus('錯誤，再試一次', 'error');
    }
}

function setStatus(message, type) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.classList.remove('success', 'error');
    if (type) {
        elements.statusMessage.classList.add(type);
    }
}

function evaluateExpression(termsOfNumber, operators) {
    const values = [...termsOfNumber];
    const ops = [...operators];

    for (let i = 0; i < ops.length; ) {
        const op = ops[i];
        if (op === '×' || op === '÷') {
            const a = values[i];
            const b = values[i + 1];
            if (op === '÷') {
                if (b === 0 || a % b !== 0) return null;
                values[i] = a / b;
            } else {
                values[i] = a * b;
            }
            values.splice(i + 1, 1);
            ops.splice(i, 1);
        } else {
            i++;
        }
    }

    let result = values[0];
    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const nextValue = values[i + 1];
        result = op === '+' ? result + nextValue : result - nextValue;
    }

    return result;
}

function randomOperator() {
    const index = randomInt(0, CONFIG.operators.length - 1);
    return CONFIG.operators[index];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

init();
