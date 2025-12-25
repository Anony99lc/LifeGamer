// ==========================================
//  CONFIGURAÇÃO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDmnIt0JFWMhWhsgKFjc9YWXgbPtUJmoLs",
    authDomain: "gamerlife-v2.firebaseapp.com",
    projectId: "gamerlife-v2",
    storageBucket: "gamerlife-v2.firebasestorage.app",
    messagingSenderId: "1099149362318",
    appId: "1:1099149362318:web:3611a4d37ec95b886335df"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// VARIÁVEIS E CONFIGURAÇÃO
// ==========================================
const xpPerCheck = 15;
const xpToNextLevel = 1000;

// Elementos DOM
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const playerDisplay = document.getElementById('player-name');
const userAvatar = document.getElementById('user-avatar');
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const progressBar = document.querySelector('.progress-bar-fill');
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsListEl = document.getElementById('achievements-list');
const toastContainer = document.getElementById('toast-container');
const allChecks = document.querySelectorAll('.check'); // Pega todos os botões

let productivityChart = null;
let levelUpSound = null; 
try { levelUpSound = new Audio('./levelup.mp3'); levelUpSound.volume = 0.5; } catch(e) {}

let currentUser = null;
let gameState = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };
let unsubscribe = null; 

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

// ==========================================
// 1. INICIALIZAÇÃO (Roda só 1 vez)
// ==========================================

// Configura os cliques nos botões APENAS UMA VEZ
// (Isso impede o erro de clique duplo/fantasma)
allChecks.forEach((check, index) => {
    check.onclick = function() {
        toggleCheck(check, index);
    };
});

// Configura os botões de Login/Menu
document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Erro: " + e.message));
});
document.getElementById('btn-login').addEventListener('click', () => {
    auth.signInWithEmailAndPassword(document.getElementById('login-user').value.trim(), document.getElementById('login-pass').value.trim()).catch(e => alert(e.message));
});
document.getElementById('btn-register').addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(document.getElementById('reg-user').value.trim(), document.getElementById('reg-pass').value.trim())
        .then(() => alert("Criado!"))
        .catch(e => alert(e.message));
});
document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });
document.getElementById('link-to-register').addEventListener('click', () => { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
document.getElementById('link-to-login').addEventListener('click', () => { registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

// Listeners de Menu
document.getElementById('menu-achievements').addEventListener('click', (e) => { e.preventDefault(); renderAchievements(); achievementsScreen.classList.remove('hidden'); setTimeout(() => achievementsScreen.classList.add('active'), 10); });
document.getElementById('close-achievements').addEventListener('click', () => { achievementsScreen.classList.remove('active'); setTimeout(() => achievementsScreen.classList.add('hidden'), 300); });
document.getElementById('menu-dashboard').addEventListener('click', () => { achievementsScreen.classList.remove('active'); setTimeout(() => achievementsScreen.classList.add('hidden'), 300); });
document.getElementById('reset-btn').addEventListener('click', () => { if(confirm("Nova semana?")) { gameState.checked = {}; saveGameData(); } });


// ==========================================
// 2. LÓGICA DO JOGO (Firebase)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        startGame(user);
    } else {
        currentUser = null;
        authScreen.classList.remove('hidden');
        authScreen.style.opacity = '1';
        if(unsubscribe) unsubscribe();
    }
});

function startGame(user) {
    playerDisplay.innerText = user.displayName || user.email.split('@')[0];
    if(user.photoURL) userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar">`;
    
    authScreen.style.opacity = '0';
    setTimeout(() => authScreen.classList.add('hidden'), 500);

    unsubscribe = db.collection('users').doc(user.uid).onSnapshot((doc) => {
        if (doc.exists) {
            gameState = doc.data();
            // Garante integridade dos dados
            if(!gameState.checked) gameState.checked = {};
            if(!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
            
            checkAllAchievements();
            renderUI(); // Apenas pinta a tela, não mexe nos cliques
        } else {
            // Cria conta nova
            const initialData = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };
            db.collection('users').doc(user.uid).set(initialData);
            gameState = initialData;
            renderUI();
        }
    });
}

function saveGameData() {
    if(currentUser) db.collection('users').doc(currentUser.uid).set(gameState, { merge: true });
}

// ==========================================
// 3. FUNÇÕES VISUAIS E LÓGICAS
// ==========================================

function renderUI() {
    // 1. Atualiza Textos
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;

    // 2. Calcula dia de hoje
    const date = new Date();
    const jsDay = date.getDay();
    const todayIndex = (jsDay === 0) ? 6 : jsDay - 1;

    // 3. PINTA OS BOTÕES (Sem mexer nos cliques)
    allChecks.forEach((check, index) => {
        // Estado Visual (Vermelho ou Cinza)
        if (gameState.checked && gameState.checked[index]) {
            check.classList.add('active');
        } else {
            check.classList.remove('active');
        }

        // Estado Bloqueado (Cadeado)
        const colIndex = index % 7;
        if (colIndex !== todayIndex) { 
            check.classList.add('locked'); 
            check.title = "Dia bloqueado!"; 
        } else {
            check.classList.remove('locked');
            check.title = "Clique para marcar";
        }
    });
    
    updateProductivityChart();
}

function toggleCheck(el, index) {
    // 1. Bloqueio
    if (el.classList.contains('locked')) return alert("🔒 Só hoje!");
    
    // 2. Lógica Baseada no Estado Atual dos DADOS
    const isChecked = gameState.checked && gameState.checked[index];

    if (isChecked) {
        // --- DESMARCAR ---
        delete gameState.checked[index];
        gameState.xp -= xpPerCheck;
        if(gameState.xp < 0) gameState.xp = 0;
        
        el.classList.remove('active'); // Feedback visual imediato
    } else {
        // --- MARCAR ---
        gameState.checked[index] = true;
        gameState.xp += xpPerCheck;
        checkAchievements(index);
        
        el.classList.add('active'); // Feedback visual imediato
    }
    
    // Level Up
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel;
        if(levelUpSound) levelUpSound.play().catch(() => {});
        showToast('ph-arrow-fat-up', 'LEVEL UP!', `Nível ${gameState.level}!`);
        unlockAchievement('level_2');
    }

    // Salva
    saveGameData();
    
    // Atualiza barra de XP imediatamente
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;
    updateProductivityChart();
}

function updateProductivityChart() {
    let dayCounts = [0,0,0,0,0,0,0]; 
    if (gameState.checked) {
        Object.keys(gameState.checked).forEach(idx => {
            dayCounts[parseInt(idx) % 7]++; 
        });
    }
    if (productivityChart) {
        productivityChart.data.datasets[0].data = dayCounts;
        productivityChart.update();
    }
}

// Conquistas e Notificações
function checkAllAchievements() { if(gameState.checked) Object.keys(gameState.checked).forEach(idx => checkAchievements(parseInt(idx))); }
function checkAchievements(lastIndex) {
    unlockAchievement('first_step');
    if (Object.keys(gameState.checked).length >= 10) unlockAchievement('dedicated');
    if (lastIndex >= 0 && lastIndex <= 6) unlockAchievement('gym_rat');
    if (lastIndex >= 7 && lastIndex <= 13) unlockAchievement('diet_master');
    if (lastIndex >= 14 && lastIndex <= 20) unlockAchievement('bookworm');
    if (lastIndex >= 21 && lastIndex <= 27) unlockAchievement('early_bird');
    if (lastIndex >= 28 && lastIndex <= 34) unlockAchievement('hydrated');
}
function unlockAchievement(id) {
    if (gameState.unlockedAchievements.includes(id)) return;
    gameState.unlockedAchievements.push(id);
    const ach = achievementsList.find(a => a.id === id);
    if(ach) showToast(ach.icon, 'Conquista!', ach.title);
    saveGameData(); 
}
function showToast(icon, title, msg) {
    if(!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="ph ${icon}"></i><div><h4>${title}</h4><p>${msg}</p></div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
}
function renderAchievements() {
    achievementsListEl.innerHTML = '';
    const unlocked = gameState.unlockedAchievements || [];
    gameState.unlockedAchievements.forEach(id => {
        const ach = achievementsList.find(a => a.id === id);
        if(ach) achievementsListEl.innerHTML += `<div class="achievement-card unlocked"><i class="ph ${ach.icon}"></i><h4>${ach.title}</h4><p>${ach.desc}</p></div>`;
    });
    achievementsList.filter(a => !gameState.unlockedAchievements.includes(a.id)).forEach(ach => {
        achievementsListEl.innerHTML += `<div class="achievement-card"><i class="ph ${ach.icon}"></i><h4>${ach.title}</h4><p>${ach.desc}</p></div>`;
    });
}

// ==========================================
// 4. INICIALIZAÇÃO GRÁFICOS E PWA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Gráfico Produtividade
    const ctxProd = document.getElementById('productivityChart');
    if(ctxProd) {
        productivityChart = new Chart(ctxProd.getContext('2d'), { 
            type: 'line', 
            data: { 
                labels: ['S','T','Q','Q','S','S','D'], 
                datasets: [{ 
                    data: [0,0,0,0,0,0,0], 
                    borderColor: '#ff2e4d', backgroundColor: 'rgba(255,46,77,0.1)', 
                    fill: true, tension: 0.4 
                }] 
            }, 
            options: { plugins:{legend:false}, scales:{ x:{display:false}, y:{ beginAtZero: true, suggestedMax: 5, grid:{color:'#27272a'} } } } 
        });
    }
    // Gráfico Humor (Decorativo)
    const ctxMood = document.getElementById('moodChart');
    if(ctxMood) {
        new Chart(ctxMood.getContext('2d'), { 
            type: 'bar', 
            data: { 
                labels: ['S','T','Q','Q','S','S','D'], 
                datasets: [{ data: [7,6,8,5,7,9,8], backgroundColor: '#27272a', borderRadius: 4 }] 
            }, 
            options: { plugins:{legend:false}, scales:{x:{display:false}, y:{display:false}} } 
        });
    }
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));