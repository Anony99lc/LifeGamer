// ==========================================
// CONFIGURAÇÃO GERAL
// ==========================================
const xpPerCheck = 15;
const xpToNextLevel = 1000;

// Elementos da Interface
const authScreen = document.getElementById('auth-screen');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const playerNameDisplay = document.getElementById('player-name');

const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const progressBar = document.querySelector('.progress-bar-fill');
const checks = document.querySelectorAll('.check');
const resetBtn = document.getElementById('reset-btn');
const logoutBtn = document.getElementById('logout-btn');

// Estado do Jogo (Dados)
let gameState = {
    xp: 0,
    level: 1,
    checked: {} 
};

// ==========================================
// 1. SISTEMA DE LOGIN / AUTENTICAÇÃO
// ==========================================

function checkLoginStatus() {
    const savedUser = localStorage.getItem('gamer_username');
    
    if (savedUser) {
        // Se tem usuário salvo, esconde login e inicia
        authScreen.classList.add('hidden');
        playerNameDisplay.innerText = savedUser;
        loadGameData(); // Carrega o save do jogo
    } else {
        // Se não tem, mostra o login
        authScreen.classList.remove('hidden');
    }
}

loginBtn.addEventListener('click', () => {
    const username = usernameInput.value;
    if (username.trim() !== "") {
        localStorage.setItem('gamer_username', username);
        playerNameDisplay.innerText = username;
        
        // Efeito visual de saída
        authScreen.style.opacity = '0';
        setTimeout(() => {
            authScreen.classList.add('hidden');
            loadGameData(); // Inicia o jogo
        }, 500);
    } else {
        alert("Digite um nome para começar!");
    }
});

logoutBtn.addEventListener('click', () => {
    // Apaga apenas o usuário, mantém o progresso do jogo? 
    // Vamos apagar apenas o login para testar.
    localStorage.removeItem('gamer_username');
    location.reload(); // Recarrega a página
});

// ==========================================
// 2. LÓGICA DO JOGO (RPG)
// ==========================================

function loadGameData() {
    const savedGame = localStorage.getItem('gamer_dashboard_save');
    if (savedGame) {
        gameState = JSON.parse(savedGame);
    }
    renderUI(); // Atualiza a tela com os dados
}

function saveGameData() {
    localStorage.setItem('gamer_dashboard_save', JSON.stringify(gameState));
}

function renderUI() {
    // Atualiza Textos
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    
    // Atualiza Barra
    const percentage = (gameState.xp / xpToNextLevel) * 100;
    progressBar.style.width = `${percentage}%`;

    // Atualiza Checkboxes
    checks.forEach(check => check.classList.remove('active')); // Limpa tudo
    
    checks.forEach((check, index) => {
        // Se este índice estiver salvo como true
        if (gameState.checked[index]) {
            check.classList.add('active');
        }
        
        // Garante que o evento de clique não seja duplicado
        check.onclick = () => toggleCheck(check, index);
    });
}

function toggleCheck(element, index) {
    if (element.classList.contains('active')) {
        // Desmarcar (Perde XP)
        element.classList.remove('active');
        delete gameState.checked[index];
        updateXP(-xpPerCheck);
    } else {
        // Marcar (Ganha XP)
        element.classList.add('active');
        gameState.checked[index] = true;
        updateXP(xpPerCheck);
    }
    saveGameData();
}

function updateXP(amount) {
    gameState.xp += amount;
    
    // Evita XP negativo
    if (gameState.xp < 0) gameState.xp = 0;
    
    // Level Up
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel; // Resto vai pro próximo nível
        alert(`🎉 LEVEL UP! Bem-vindo ao nível ${gameState.level}!`);
    }
    
    renderUI();
}

// Botão de Nova Semana
resetBtn.addEventListener('click', () => {
    if(confirm("Começar nova semana? Isso limpará os hábitos, mas manterá seu Nível.")) {
        gameState.checked = {}; // Zera os checks
        saveGameData();
        renderUI();
    }
});

// ==========================================
// 3. GRÁFICOS (VISUAL)
// ==========================================
const ctx1 = document.getElementById('productivityChart').getContext('2d');
new Chart(ctx1, {
    type: 'line',
    data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        datasets: [{
            label: 'XP Ganho',
            data: [150, 200, 100, 300, 250, 400, 150],
            borderColor: '#ff2e4d',
            backgroundColor: 'rgba(255, 46, 77, 0.1)',
            tension: 0.4, fill: true
        }]
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#27272a' } } } }
});

const ctx2 = document.getElementById('moodChart').getContext('2d');
new Chart(ctx2, {
    type: 'bar',
    data: {
        labels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
        datasets: [{
            label: 'Humor',
            data: [7, 6, 8, 5, 7, 9, 8],
            backgroundColor: '#27272a',
            hoverBackgroundColor: '#ff2e4d',
            borderRadius: 4
        }]
    },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false } } }
});

// INICIAR SISTEMA
checkLoginStatus();