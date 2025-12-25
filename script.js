// --- CONFIGURAÇÃO ---
const xpPerCheck = 15;
const xpToNextLevel = 1000;

// Elementos
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const playerDisplay = document.getElementById('player-name');
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const progressBar = document.querySelector('.progress-bar-fill');
const checks = document.querySelectorAll('.check');

// Modal de Conquistas
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsListEl = document.getElementById('achievements-list');
const toastContainer = document.getElementById('toast-container');

// --- LISTA DE CONQUISTAS ---
const achievementsList = [
    { id: 'first_step', icon: 'ph-footprints', title: 'Primeiro Passo', desc: 'Marque seu primeiro hábito.' },
    { id: 'gym_rat', icon: 'ph-barbell', title: 'Rato de Academia', desc: 'Complete um treino.' },
    { id: 'bookworm', icon: 'ph-book-open', title: 'Leitor Voraz', desc: 'Leia algumas páginas.' },
    { id: 'hydrated', icon: 'ph-drop', title: 'Hidratado', desc: 'Beba seus 4L de água.' },
    { id: 'early_bird', icon: 'ph-sun', title: 'Madrugador', desc: 'Acorde às 06h.' },
    { id: 'dedicated', icon: 'ph-star', title: 'Dedicado', desc: 'Marque 10 tarefas no total.' },
    { id: 'level_2', icon: 'ph-arrow-fat-up', title: 'Level Up', desc: 'Chegue ao Nível 2.' }
];

// Estado Inicial
let currentUser = null;
let gameState = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };

// --- SISTEMA DE LOGIN/AUTH ---
document.getElementById('link-to-register').addEventListener('click', () => { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
document.getElementById('link-to-login').addEventListener('click', () => { registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

function initAuth() {
    const sessionUser = localStorage.getItem('gamer_session_user');
    if (sessionUser) { currentUser = sessionUser; startGame(sessionUser); }
    else { authScreen.classList.remove('hidden'); }
}

document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const storedData = localStorage.getItem(`user_data_${user}`);
    if (!storedData) return alert("Usuário não encontrado!");
    if (JSON.parse(storedData).password === pass) { localStorage.setItem('gamer_session_user', user); startGame(user); }
    else { alert("Senha incorreta!"); }
});

document.getElementById('btn-register').addEventListener('click', () => {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    if (!user || !pass) return alert("Preencha tudo!");
    if (localStorage.getItem(`user_data_${user}`)) return alert("Usuário já existe!");
    
    const newUser = { password: pass, xp: 0, level: 1, checked: {}, unlockedAchievements: [] };
    localStorage.setItem(`user_data_${user}`, JSON.stringify(newUser));
    alert("Criado! Faça login.");
    registerForm.classList.add('hidden'); loginForm.classList.remove('hidden');
});

document.getElementById('logout-btn').addEventListener('click', () => { localStorage.removeItem('gamer_session_user'); location.reload(); });

// --- LÓGICA DO JOGO ---
function startGame(user) {
    currentUser = user;
    playerDisplay.innerText = user;
    authScreen.style.opacity = '0';
    setTimeout(() => authScreen.classList.add('hidden'), 500);
    loadGameData();
}

function loadGameData() {
    const data = JSON.parse(localStorage.getItem(`user_data_${currentUser}`));
    if (data) { 
        gameState = { ...gameState, ...data }; // Merge para garantir que novos campos existam
        if(!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
        renderUI();
    }
}

function saveGameData() {
    const currentData = JSON.parse(localStorage.getItem(`user_data_${currentUser}`));
    currentData.xp = gameState.xp;
    currentData.level = gameState.level;
    currentData.checked = gameState.checked;
    currentData.unlockedAchievements = gameState.unlockedAchievements;
    localStorage.setItem(`user_data_${currentUser}`, JSON.stringify(currentData));
}

function renderUI() {
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;

    const date = new Date();
    const todayIndex = (date.getDay() === 0) ? 6 : date.getDay() - 1;

    checks.forEach((check, index) => {
        const newCheck = check.cloneNode(true);
        check.parentNode.replaceChild(newCheck, check);
        
        const colIndex = index % 7;
        if (colIndex !== todayIndex) { newCheck.classList.add('locked'); newCheck.title = "Apenas hoje!"; }
        if (gameState.checked[index]) newCheck.classList.add('active');
        
        newCheck.addEventListener('click', () => toggleCheck(newCheck, index));
    });
}

function toggleCheck(el, index) {
    if (el.classList.contains('locked')) return alert("🔒 Dia bloqueado!");
    
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        delete gameState.checked[index];
        updateXP(-xpPerCheck);
    } else {
        el.classList.add('active');
        gameState.checked[index] = true;
        updateXP(xpPerCheck);
        checkAchievements(index); // Verifica conquistas ao marcar
    }
    saveGameData();
}

function updateXP(amount) {
    gameState.xp += amount;
    if (gameState.xp < 0) gameState.xp = 0;
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel;
        showToast('ph-arrow-fat-up', 'LEVEL UP!', `Você chegou ao nível ${gameState.level}!`);
        unlockAchievement('level_2'); // Tenta desbloquear conquista de nível
    }
    renderUI();
}

// --- SISTEMA DE CONQUISTAS ATUALIZADO ---

function checkAchievements(lastIndex) {
    // Garante que a lista de desbloqueados existe
    if (!gameState.unlockedAchievements) {
        gameState.unlockedAchievements = [];
    }

    // 1. Conquista: Primeiro Passo (Qualquer clique)
    unlockAchievement('first_step');

    // 2. Conquista: Dedicado (10 checks totais)
    // Conta quantos 'true' existem no objeto checked
    const totalChecks = Object.keys(gameState.checked).length;
    if (totalChecks >= 10) unlockAchievement('dedicated');

    // 3. Conquistas por Linha (Baseado no índice clicado)
    // Linha 1 (Índices 0 a 6) -> Treino
    if (lastIndex >= 0 && lastIndex <= 6) unlockAchievement('gym_rat');
    
    // Linha 2 (Índices 7 a 13) -> Dieta
    if (lastIndex >= 7 && lastIndex <= 13) unlockAchievement('dieta_focada'); // Verifique se o ID bate com sua lista

    // ... Adicione as outras linhas conforme sua lista
}

function unlockAchievement(id) {
    // Se já tem essa conquista, para aqui (não mostra de novo)
    if (gameState.unlockedAchievements.includes(id)) return;

    // Procura os dados da conquista na lista
    const achievement = achievementsList.find(a => a.id === id);
    
    // Se achou, desbloqueia e mostra
    if (achievement) {
        gameState.unlockedAchievements.push(id);
        saveGameData(); // Salva imediatamente para não perder
        
        // Toca um som (Opcional - Browser pode bloquear se não houver interação antes)
        // const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        // audio.play().catch(e => console.log("Som bloqueado pelo navegador"));

        showToast(achievement.icon, 'Conquista Desbloqueada!', achievement.title);
        
        // Se a tela de troféus estiver aberta, redesenha ela
        if (achievementsScreen.classList.contains('active')) {
            renderAchievements();
        }
    }
}

function showToast(icon, title, msg) {
    const container = document.getElementById('toast-container');
    
    // Segurança: Se não achar o container, cria um na hora
    if (!container) {
        console.error("ERRO: <div id='toast-container'> não encontrado no HTML!");
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="ph ${icon}" style="font-size: 24px; color: gold;"></i>
        <div class="toast-content">
            <h4 style="margin:0; font-size: 14px;">${title}</h4>
            <p style="margin:0; font-size: 12px; color: #ccc;">${msg}</p>
        </div>
    `;

    container.appendChild(toast);

    // Animação de entrada
    requestAnimationFrame(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
    });

    // Remove depois de 4 segundos
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- EVENTOS DO MENU (CORRIGIDO) ---

document.getElementById('menu-achievements').addEventListener('click', (e) => {
    e.preventDefault();
    renderAchievements(); // Desenha as conquistas
    
    // 1. Remove o "display: none"
    achievementsScreen.classList.remove('hidden');
    
    // 2. Espera 10ms para adicionar o efeito visual (Fade In)
    setTimeout(() => {
        achievementsScreen.classList.add('active');
    }, 10);
});

document.getElementById('close-achievements').addEventListener('click', () => {
    // 1. Remove o efeito visual (Fade Out)
    achievementsScreen.classList.remove('active');
    
    // 2. Espera a animação acabar (300ms) para esconder de vez
    setTimeout(() => {
        achievementsScreen.classList.add('hidden');
    }, 300);
});

document.getElementById('menu-dashboard').addEventListener('click', () => {
    achievementsScreen.classList.remove('active');
    setTimeout(() => achievementsScreen.classList.add('hidden'), 300);
});