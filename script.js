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

// Alternar entre Login e Cadastro visualmente
function toggleAuthMode() {
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
}

// Inicialização: Verifica se já tem alguém logado
function initAuth() {
    const sessionUser = localStorage.getItem('gamer_session_user');
    if (sessionUser) {
        currentUser = sessionUser;
        startGame(sessionUser);
    } else {
        authScreen.classList.remove('hidden');
    }
}

// Lógica de CADASTRO
document.getElementById('btn-register').addEventListener('click', () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!user || !pass) return alert("Preencha todos os campos!");

    // Verifica se usuário já existe
    if (localStorage.getItem(`user_data_${user}`)) {
        return alert("Este usuário já existe! Tente fazer login.");
    }

    // Cria "Banco de dados" do usuário
    const newUserData = {
        password: pass, // Nota: Num site real, nunca salvamos senha pura assim!
        xp: 0,
        level: 1,
        checked: {}
    };

    localStorage.setItem(`user_data_${user}`, JSON.stringify(newUserData));
    alert("Conta criada com sucesso! Faça login.");
    toggleAuthMode(); // Volta pra tela de login
});

// Lógica de LOGIN
document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    const storedData = localStorage.getItem(`user_data_${user}`);
    
    if (!storedData) {
        return alert("Usuário não encontrado!");
    }

    const userData = JSON.parse(storedData);

    if (userData.password === pass) {
        // Login Sucesso
        localStorage.setItem('gamer_session_user', user); // Mantém sessão
        startGame(user);
    } else {
        alert("Senha incorreta!");
    }
});

// LOGOUT
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('gamer_session_user');
    location.reload();
});

// ==========================================
// 2. LÓGICA DO JOGO (RPG)
// ==========================================

function startGame(username) {
    currentUser = username;
    playerDisplay.innerText = username;
    
    // Esconder tela de login
    authScreen.style.opacity = '0';
    setTimeout(() => authScreen.classList.add('hidden'), 500);

    // Carregar dados
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
    // Atualiza o objeto do usuário no "Banco de dados"
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

    checks.forEach(check => check.classList.remove('active'));
    checks.forEach((check, index) => {
        if (gameState.checked[index]) check.classList.add('active');
        
        // Remove listeners antigos para não duplicar
        check.replaceWith(check.cloneNode(true));
    });
    
    // Re-adiciona listeners nos novos elementos
    const newChecks = document.querySelectorAll('.check');
    newChecks.forEach((check, index) => {
        if (gameState.checked[index]) check.classList.add('active');
        check.addEventListener('click', () => toggleCheck(check, index));
    });
}

function toggleCheck(element, index) {
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
    if(confirm("Iniciar nova semana?")) {
        gameState.checked = {};
        saveGameData();
        renderUI();
    }
});

// Gráficos (Visuais)
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

// INICIAR
initAuth();