// ==========================================
//  CONFIGURAÇÃO FIREBASE (GamerLife V2)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDmnIt0JFWMhWhsgKFjc9YWXgbPtUJmoLs",
    authDomain: "gamerlife-v2.firebaseapp.com",
    projectId: "gamerlife-v2",
    storageBucket: "gamerlife-v2.firebasestorage.app",
    messagingSenderId: "1099149362318",
    appId: "1:1099149362318:web:3611a4d37ec95b886335df"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// CONFIGURAÇÃO DO JOGO
// ==========================================
const xpPerCheck = 15;
const xpToNextLevel = 1000;

// Elementos
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const playerDisplay = document.getElementById('player-name');
const userAvatar = document.getElementById('user-avatar');
const levelDisplay = document.getElementById('level-display');
const xpDisplay = document.getElementById('xp-display');
const progressBar = document.querySelector('.progress-bar-fill');
const checks = document.querySelectorAll('.check');
const achievementsScreen = document.getElementById('achievements-screen');
const achievementsListEl = document.getElementById('achievements-list');
const toastContainer = document.getElementById('toast-container');

// Variável Global do Gráfico (IMPORTANTE)
let productivityChart = null;

// Dados de Conquistas
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

let currentUser = null;
let gameState = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };
let unsubscribe = null; 

// ==========================================
// 1. SISTEMA DE LOGIN
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

document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert("Erro Google: " + error.message));
});

document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    auth.signInWithEmailAndPassword(email, pass).catch(error => alert("Erro: " + error.message));
});

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => alert("Conta criada!"))
        .catch(error => alert("Erro ao criar: " + error.message));
});

document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });
document.getElementById('link-to-register').addEventListener('click', () => { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
document.getElementById('link-to-login').addEventListener('click', () => { registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

// ==========================================
// 2. LÓGICA DO JOGO
// ==========================================

function startGame(user) {
    playerDisplay.innerText = user.displayName || user.email.split('@')[0];
    if(user.photoURL) userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar">`;
    else userAvatar.innerHTML = `<i class="ph ph-user"></i>`;

    authScreen.style.opacity = '0';
    setTimeout(() => authScreen.classList.add('hidden'), 500);

    // --- CONEXÃO COM O BANCO ---
    const docRef = db.collection('users').doc(user.uid);

    unsubscribe = docRef.onSnapshot((doc) => {
        if (doc.exists) {
            gameState = doc.data();
            
            // Correções de segurança
            if(!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
            if(!gameState.checked) gameState.checked = {};

            checkAllAchievements();
            renderUI();
        } else {
            // Cria conta nova se não existir
            const initialData = { xp: 0, level: 1, checked: {}, unlockedAchievements: [] };
            docRef.set(initialData);
            gameState = initialData;
            renderUI();
        }
    });
}

function saveGameData() {
    if(currentUser) {
        db.collection('users').doc(currentUser.uid).set(gameState, { merge: true })
        .catch(err => console.error("Erro ao salvar:", err));
    }
}

function renderUI() {
    // 1. Atualiza os Textos de Nível e XP
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;

    // 2. Calcula o dia de hoje para bloquear os outros
    const date = new Date();
    const jsDay = date.getDay();
    const todayIndex = (jsDay === 0) ? 6 : jsDay - 1;

    // 3. PEGA OS BOTÕES REAIS QUE ESTÃO NA TELA AGORA
    // (Isso corrige o bug de "cor não muda")
    const currentChecks = document.querySelectorAll('.check');

    currentChecks.forEach((check, index) => {
        // A. Limpa qualquer clique antigo para não duplicar
        check.onclick = null; 

        // B. Define se está marcado (Vermelho) ou não (Cinza)
        if (gameState.checked && gameState.checked[index]) {
            check.classList.add('active');
        } else {
            check.classList.remove('active');
        }

        // C. Define se está bloqueado (Cadeado) ou liberado
        const colIndex = index % 7;
        if (colIndex !== todayIndex) { 
            check.classList.add('locked'); 
            check.title = "Dia bloqueado!"; 
        } else {
            check.classList.remove('locked');
            check.title = "Clique para marcar";
        }

        // D. Adiciona o clique da forma mais segura possível
        check.onclick = function() {
            toggleCheck(check, index);
        };
    });
    
    // Atualiza o gráfico sempre que a tela mudar
    updateProductivityChart();
}

function toggleCheck(el, index) {
    // 1. Verifica se o dia está bloqueado (Cadeado)
    if (el.classList.contains('locked')) {
        return alert("🔒 Você só pode alterar o dia de hoje!");
    }
    
    // 2. Tira a prova real: Está marcado na tela?
    const isVisuallyActive = el.classList.contains('active');

    if (isVisuallyActive) {
        // --- ESTÁ MARCADO -> VAMOS DESMARCAR ---
        
        // Remove do visual imediatamente
        el.classList.remove('active');
        
        // Remove dos dados
        if(gameState.checked) delete gameState.checked[index];
        
        // Diminui XP
        gameState.xp -= xpPerCheck;
        if(gameState.xp < 0) gameState.xp = 0;

    } else {
        // --- ESTÁ DESMARCADO -> VAMOS MARCAR ---
        
        // Adiciona ao visual imediatamente
        el.classList.add('active');
        
        // Salva nos dados
        if(!gameState.checked) gameState.checked = {};
        gameState.checked[index] = true;
        
        // Aumenta XP
        gameState.xp += xpPerCheck;
        checkAchievements(index);
    }
    
    // 3. Atualiza Nível e Barra (Lógica Comum)
    if (gameState.xp >= xpToNextLevel) {
        gameState.level++;
        gameState.xp -= xpToNextLevel;
        
        // Toca o som se ele existir
        if(typeof levelUpSound !== 'undefined') {
            levelUpSound.play().catch(e => console.log("Sem som"));
        }

        showToast('ph-arrow-fat-up', 'LEVEL UP!', `Nível ${gameState.level}!`);
        unlockAchievement('level_2');
    }

    // Atualiza textos
    levelDisplay.innerText = gameState.level;
    xpDisplay.innerText = `${gameState.xp} / ${xpToNextLevel} XP`;
    progressBar.style.width = `${(gameState.xp / xpToNextLevel) * 100}%`;

    // Atualiza gráfico e salva
    updateProductivityChart();
    saveGameData(); 
}
// ... (Funções de Conquista) ...
function checkAllAchievements() { if(gameState.checked) Object.keys(gameState.checked).forEach(idx => checkAchievements(parseInt(idx))); }
function checkAchievements(lastIndex) {
    if (!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
    unlockAchievement('first_step');
    if (Object.keys(gameState.checked).length >= 10) unlockAchievement('dedicated');
    if (lastIndex >= 0 && lastIndex <= 6) unlockAchievement('gym_rat');
    if (lastIndex >= 7 && lastIndex <= 13) unlockAchievement('diet_master');
    if (lastIndex >= 14 && lastIndex <= 20) unlockAchievement('bookworm');
    if (lastIndex >= 21 && lastIndex <= 27) unlockAchievement('early_bird');
    if (lastIndex >= 28 && lastIndex <= 34) unlockAchievement('hydrated');
}
function unlockAchievement(id) {
    if (!gameState.unlockedAchievements) gameState.unlockedAchievements = [];
    if (gameState.unlockedAchievements.includes(id)) return;
    const achievement = achievementsList.find(a => a.id === id);
    if (achievement) {
        gameState.unlockedAchievements.push(id);
        saveGameData(); 
        showToast(achievement.icon, 'Conquista!', achievement.title);
        if (achievementsScreen.classList.contains('active')) renderAchievements();
    }
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
    achievementsList.forEach(ach => {
        const isUnlocked = unlocked.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `<i class="ph ${ach.icon}"></i><h4>${ach.title}</h4><p>${ach.desc}</p>`;
        achievementsListEl.appendChild(card);
    });
}
document.getElementById('menu-achievements').addEventListener('click', (e) => { e.preventDefault(); renderAchievements(); achievementsScreen.classList.remove('hidden'); setTimeout(() => achievementsScreen.classList.add('active'), 10); });
document.getElementById('close-achievements').addEventListener('click', () => { achievementsScreen.classList.remove('active'); setTimeout(() => achievementsScreen.classList.add('hidden'), 300); });
document.getElementById('menu-dashboard').addEventListener('click', () => { achievementsScreen.classList.remove('active'); setTimeout(() => achievementsScreen.classList.add('hidden'), 300); });
document.getElementById('reset-btn').addEventListener('click', () => { if(confirm("Nova semana?")) { gameState.checked = {}; saveGameData(); } });

// ==========================================
// 3. INICIALIZAÇÃO DE GRÁFICOS E PWA
// ==========================================

// Configuração do Gráfico de Produtividade
const chartCanvas = document.getElementById('productivityChart');
if(chartCanvas) {
    const ctxProd = chartCanvas.getContext('2d');
    productivityChart = new Chart(ctxProd, { 
        type: 'line', 
        data: { 
            labels: ['S','T','Q','Q','S','S','D'], 
            datasets: [{ 
                data: [0,0,0,0,0,0,0], // Começa vazio, a função updateProductivityChart vai preencher
                borderColor: '#ff2e4d', 
                backgroundColor: 'rgba(255,46,77,0.1)', 
                fill: true, 
                tension: 0.4 
            }] 
        }, 
        options: { 
            plugins:{legend:false}, 
            scales:{
                x:{display:false}, 
                y:{
                    beginAtZero: true, 
                    suggestedMax: 5,
                    grid:{color:'#27272a'}
                }
            } 
        } 
    });
}

// Configuração do Gráfico de Humor (Visual apenas)
const moodCanvas = document.getElementById('moodChart');
if(moodCanvas) {
    const ctxMood = moodCanvas.getContext('2d');
    new Chart(ctxMood, { 
        type: 'bar', 
        data: { 
            labels: ['S','T','Q','Q','S','S','D'], 
            datasets: [{ 
                data: [7,6,8,5,7,9,8], 
                backgroundColor: '#27272a', 
                hoverBackgroundColor: '#ff2e4d', 
                borderRadius: 4 
            }] 
        }, 
        options: { 
            plugins:{legend:false}, 
            scales:{x:{display:false}, y:{display:false}} 
        } 
    });
}

// Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) { 
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js')); 
}