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

// Conquistas & Toast
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsListEl = document.getElementById('achievements-list');
const toastContainer = document.getElementById('toast-container');

// LISTA DE CONQUISTAS
const achievementsList = [
    { id: 'first_step', icon: 'ph-footprints', title: 'Primeiro Passo', desc: 'Marque seu primeiro hábito.' },
    { id: 'gym_rat', icon: 'ph-barbell', title: 'Rato de Academia', desc: 'Complete um treino.' },
    { id: 'diet_master', icon: 'ph-apple', title: 'Mestre da Dieta', desc: 'Fez a dieta corretamente.' },
    { id: 'bookworm', icon: 'ph-book-open', title: 'Leitor Voraz', desc: 'Leu algumas páginas.' },
    { id: 'early_bird', icon: 'ph-sun', title: 'Madrugador', desc: 'Acordou cedo.' },
    { id: 'hydrated', icon: 'ph-drop', title: 'Hidratado', desc: 'Bebeu 4L de água.' },
    { id: 'dedicated', icon: 'ph-star', title: 'Dedicado', desc: 'Marcou 10 tarefas no total.' },
    { id: 'level_2', icon: 'ph-arrow-fat-up', title: 'Level Up', desc: 'Chegou ao Nível 2.' }
];

// Estado Inicial
let currentUser = null;
let gameState = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };

// ==========================================
// 1. SISTEMA DE LOGIN E CADASTRO
// ==========================================
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

// ==========================================
// 2. LÓGICA DO JOGO
// ==========================================
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
        gameState = { ...gameState, ...data };
        // AUTO-REPARO: Se não existir lista de conquistas, cria uma vazia agora
        if(!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
        
        // Verifica conquistas antigas que podem ter passado batido
        setTimeout(() => checkAllAchievements(), 1000);
        
        renderUI();
    }
}

function saveGameData() {
    // Garante que não salva null
    if(!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
    
    const currentData = JSON.parse(localStorage.getItem(`user_data_${currentUser}`)) || {};
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
    const jsDay = date.getDay(); 
    const todayIndex = (jsDay === 0) ? 6 : jsDay - 1; 

    checks.forEach((check, index) => {
        const newCheck = check.cloneNode(true);
        check.parentNode.replaceChild(newCheck, check);
        
        const colIndex = index % 7; 
        
        if (colIndex !== todayIndex) { 
            newCheck.classList.add('locked'); 
            newCheck.title = "Apenas o dia de hoje está liberado!"; 
        } else {
            newCheck.classList.remove('locked');
        }

        if (gameState.checked[index]) newCheck.classList.add('active');
        
        newCheck.addEventListener('click', () => toggleCheck(newCheck, index));
    });
}

function toggleCheck(el, index) {
    if (el.classList.contains('locked')) return alert("🔒 Hoje não é esse dia!");
    
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        delete gameState.checked[index];
        updateXP(-xpPerCheck);
    } else {
        el.classList.add('active');
        gameState.checked[index] = true;
        updateXP(xpPerCheck);
        checkAchievements(index); // Verifica conquista ao clicar
    }
    saveGameData();
}

function updateXP(amount) {
    gameState.xp += amount;
    if (gameState.xp < 0) gameState.xp = 0;
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel;
        showToast('ph-arrow-fat-up', 'LEVEL UP!', `Nível ${gameState.level} alcançado!`);
        unlockAchievement('level_2');
    }
    renderUI();
}

// ==========================================
// 3. CONQUISTAS (Com Correção de Erros)
// ==========================================

function checkAllAchievements() {
    // Verifica tudo de uma vez (útil para contas antigas)
    Object.keys(gameState.checked).forEach(idx => checkAchievements(parseInt(idx)));
}

function checkAchievements(lastIndex) {
    // Garante que o array existe antes de tentar usar
    if (!gameState.unlockedAchievements) gameState.unlockedAchievements = [];

    unlockAchievement('first_step'); // Desbloqueia no primeiro clique
    
    if (Object.keys(gameState.checked).length >= 10) unlockAchievement('dedicated');

    // Índices baseados nas 5 linhas de 7 dias (0-34)
    if (lastIndex >= 0 && lastIndex <= 6) unlockAchievement('gym_rat');
    if (lastIndex >= 7 && lastIndex <= 13) unlockAchievement('diet_master');
    if (lastIndex >= 14 && lastIndex <= 20) unlockAchievement('bookworm');
    if (lastIndex >= 21 && lastIndex <= 27) unlockAchievement('early_bird');
    if (lastIndex >= 28 && lastIndex <= 34) unlockAchievement('hydrated');
}

function unlockAchievement(id) {
    // Proteção extra contra erro de dados
    if (!gameState.unlockedAchievements) gameState.unlockedAchievements = [];

    if (gameState.unlockedAchievements.includes(id)) return; // Já tem

    const achievement = achievementsList.find(a => a.id === id);
    if (achievement) {
        gameState.unlockedAchievements.push(id);
        saveGameData();
        showToast(achievement.icon, 'Conquista Desbloqueada!', achievement.title);
        
        // Atualiza a tela se estiver aberta
        if (achievementsScreen.classList.contains('active')) renderAchievements();
    }
}

function showToast(icon, title, msg) {
    if(!toastContainer) return console.log("Erro: Toast container não achado");
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="ph ${icon}"></i><div class="toast-content"><h4>${title}</h4><p>${msg}</p></div>`;
    
    toastContainer.appendChild(toast);
    
    // Animação
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remover
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 500); 
    }, 4000);
}

function renderAchievements() {
    achievementsListEl.innerHTML = '';
    // Proteção extra
    const unlocked = gameState.unlockedAchievements || [];
    
    achievementsList.forEach(ach => {
        const isUnlocked = unlocked.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `<i class="ph ${ach.icon}"></i><h4>${ach.title}</h4><p>${ach.desc}</p>`;
        achievementsListEl.appendChild(card);
    });
}

// MENU EVENTS
document.getElementById('menu-achievements').addEventListener('click', (e) => {
    e.preventDefault();
    renderAchievements();
    achievementsScreen.classList.remove('hidden');
    setTimeout(() => achievementsScreen.classList.add('active'), 10);
});

document.getElementById('close-achievements').addEventListener('click', () => {
    achievementsScreen.classList.remove('active');
    setTimeout(() => achievementsScreen.classList.add('hidden'), 300);
});

document.getElementById('menu-dashboard').addEventListener('click', () => {
    achievementsScreen.classList.remove('active');
    setTimeout(() => achievementsScreen.classList.add('hidden'), 300);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Começar nova semana?")) { gameState.checked = {}; saveGameData(); location.reload(); }
});

// Inicialização
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
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js')); }

initAuth();