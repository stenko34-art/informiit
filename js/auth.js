/**
 * Система авторизации
 */

// Загружаем список студентов (если файл не найден, используем пустой объект)
let USERS = {};
try {
    // В браузере students.js должен быть загружен через <script>
    if (typeof STUDENTS !== 'undefined') USERS = STUDENTS;
} catch(e) {
    console.error('Не удалось загрузить список студентов');
}

// Данные о результатах
let resultsData = {};
try {
    const saved = localStorage.getItem('itResults');
    if (saved) resultsData = JSON.parse(saved);
} catch(e) {}

// Текущий пользователь
let currentUser = null;

// Вход в систему
function login() {
    const loginInput = document.getElementById('loginInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorMsg = document.getElementById('errorMsg');
    
    const login = loginInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    
    // Сброс ошибки
    errorMsg.style.display = 'none';
    
    if (!login || !password) {
        showError(errorMsg, 'Введите логин и пароль');
        return;
    }
    
    const user = USERS[login];
    if (!user) {
        showError(errorMsg, 'Студент с таким логином не найден. Проверьте написание.');
        return;
    }
    
    if (user.password !== password) {
        showError(errorMsg, 'Неверный пароль. Попробуйте ещё раз.');
        return;
    }
    
    // Успешный вход
    currentUser = { login, ...user };
    
    // Инициализируем результаты
    if (!resultsData[login]) {
        resultsData[login] = { 
            tasks: {},
            lastLogin: new Date().toISOString()
        };
    } else {
        resultsData[login].lastLogin = new Date().toISOString();
    }
    saveResults();
    
    // Сохраняем сессию
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Перенаправляем
    if (user.isAdmin) {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

function showError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// Проверка авторизации
function checkAuth() {
    const saved = sessionStorage.getItem('currentUser');
    if (!saved) {
        window.location.href = 'index.html';
        return null;
    }
    currentUser = JSON.parse(saved);
    return currentUser;
}

// Выход
function logout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'index.html';
}

// Сохранение результатов
function saveResults() {
    localStorage.setItem('itResults', JSON.stringify(resultsData));
}

// Сохранение результата задания
function saveTaskResult(login, taskId, score, maxScore) {
    if (!resultsData[login]) resultsData[login] = { tasks: {} };
    
    const existing = resultsData[login].tasks[taskId];
    // Не ухудшаем результат
    if (existing && existing.score >= score) return false;
    
    resultsData[login].tasks[taskId] = {
        score: score,
        max: maxScore,
        percent: Math.round(score / maxScore * 100),
        date: new Date().toISOString()
    };
    saveResults();
    return true;
}

// Получение результата
function getTaskResult(login, taskId) {
    return resultsData[login]?.tasks?.[taskId] || null;
}

// Получение всех результатов (для админа)
function getAllResults() {
    return resultsData;
}

// Получение списка всех студентов с результатами (для админа)
function getStudentsWithResults() {
    const students = [];
    for (let [login, user] of Object.entries(USERS)) {
        if (user.isAdmin) continue;
        
        const results = resultsData[login]?.tasks || {};
        const totalDone = Object.values(results).filter(r => r.score > 0).length;
        const totalScore = Object.values(results).reduce((sum, r) => sum + (r.score || 0), 0);
        
        students.push({
            login,
            name: user.name,
            group: user.group,
            results,
            totalDone,
            totalScore,
            lastLogin: resultsData[login]?.lastLogin || '—'
        });
    }
    // Сортируем по группе, затем по фамилии
    students.sort((a, b) => {
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        return a.name.localeCompare(b.name);
    });
    return students;
}
