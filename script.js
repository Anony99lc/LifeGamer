// CONFIGURAÇÃO
const xpPerCheck = 15;
const xpToNextLevel = 1000;

// Elementos Auth
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const playerDisplay = document.getElementById('player-name');

// Elementos Jogo
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const progressBar = document.querySelector('.progress-bar-fill');
const checks = document.querySelectorAll('.check');

// Estado
let currentUser = null;
let gameState = { xp: 0, level: 1, checked: {} };

// ==========================================
// 1. SISTEMA DE LOGIN E CADASTRO
// ==========================================

// Alternar entre telas
document.getElementById('link-to-register').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('link-to-login').addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Inicialização
function initAuth() {
    const sessionUser = localStorage.getItem('gamer_session_user');
    if (sessionUser) {
        currentUser = sessionUser;
        startGame(sessionUser);
    } else {
        authScreen.classList.remove('hidden');
    }
}

// CADASTRO
document.getElementById('btn-register').addEventListener('click', () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!user || !pass) return alert("Preencha todos os campos!");
    if (localStorage.getItem(`user_data_${user}`)) return alert("Usuário já existe!");

    const newUserData = {
        password: pass,
        xp: 0,
        level: 1,
        checked: {}
    };

    localStorage.setItem(`user_data_${user}`, JSON.stringify(newUserData));
    alert("Conta criada! Faça login.");
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// LOGIN
document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    const storedData = localStorage.getItem(`user_data_${user}`);
    if (!storedData) return alert("Usuário não encontrado!");

    const userData = JSON.parse(storedData);
    if (userData.password === pass) {
        localStorage.setItem('gamer_session_user', user);
        startGame(user);
    } else {
        alert("Senha incorreta!");
    }
});

// SAIR
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('gamer_session_user');
    location.reload();
});

// ==========================================
// 2. LÓGICA DO JOGO
// ==========================================

function startGame(username) {
    currentUser = username;
    playerDisplay.innerText = username;
    authScreen.style.opacity = '0';
    setTimeout(() => authScreen.classList.add('hidden'), 500);
    loadGameData();
}

function loadGameData() {
    const data = JSON.parse(localStorage.getItem(`user_data_${currentUser}`));
    if (data) {
        gameState = data;
        renderUI();
    }
}

function saveGameData() {
    const currentData = JSON.parse(localStorage.getItem(`user_data_${currentUser}`));
    currentData.xp = gameState.xp;
    currentData.level = gameState.level;
    currentData.checked = gameState.checked;
    localStorage.setItem(`user_data_${currentUser}`, JSON.stringify(currentData));
}

function renderUI() {
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;

    // --- LÓGICA DE DIA DA SEMANA ---
    const date = new Date();
    const jsDay = date.getDay(); // 0(Dom) a 6(Sáb)
    // Converte para nossa tabela (0=Seg ... 6=Dom)
    const todayIndex = (jsDay === 0) ? 6 : jsDay - 1;

    // Limpa estado anterior
    checks.forEach(check => check.classList.remove('active', 'locked'));
    
    // Recria listeners e aplica cadeados
    const newChecks = document.querySelectorAll('.check');
    newChecks.forEach((check, index) => {
        const newCheck = check.cloneNode(true);
        check.parentNode.replaceChild(newCheck, check);
        
        // Verifica a coluna (resto da divisão por 7)
        const colIndex = index % 7;

        // Se NÃO for hoje, trava!
        if (colIndex !== todayIndex) {
            newCheck.classList.add('locked');
            newCheck.title = "Apenas o dia de hoje está liberado!";
        }

        if (gameState.checked[index]) newCheck.classList.add('active');
        
        newCheck.addEventListener('click', () => toggleCheck(newCheck, index));
    });
}

function toggleCheck(element, index) {
    // Bloqueia clique no cadeado
    if (element.classList.contains('locked')) {
        alert("🔒 Hoje não é esse dia! Volte no dia certo.");
        return;
    }

    if (element.classList.contains('active')) {
        element.classList.remove('active');
        delete gameState.checked[index];
        updateXP(-xpPerCheck);
    } else {
        element.classList.add('active');
        gameState.checked[index] = true;
        updateXP(xpPerCheck);
    }
    saveGameData();
}

function updateXP(amount) {
    gameState.xp += amount;
    if (gameState.xp < 0) gameState.xp = 0;
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel;
        alert("🎉 LEVEL UP!");
    }
    renderUI();
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Começar nova semana?")) {
        gameState.checked = {};
        saveGameData();
        loadGameData();
    }
});

// PWA & Charts
if(document.getElementById('productivityChart')) {
    new Chart(document.getElementById('productivityChart'), {
        type: 'line',
        data: { labels: ['S','T','Q','Q','S','S','D'], datasets: [{ data: [3,5,2,6,4,7,5], borderColor: '#ff2e4d', backgroundColor: 'rgba(255,46,77,0.1)', fill: true, tension: 0.4 }] },
        options: { plugins:{legend:false}, scales:{x:{display:false}, y:{grid:{color:'#27272a'}}} }
    });
    new Chart(document.getElementById('moodChart'), {
        type: 'bar',
        data: { labels: ['S','T','Q','Q','S','S','D'], datasets: [{ data: [7,6,8,5,7,9,8], backgroundColor: '#27272a', hoverBackgroundColor: '#ff2e4d', borderRadius: 4 }] },
        options: { plugins:{legend:false}, scales:{x:{display:false}, y:{display:false}} }
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

// INICIAR
initAuth();