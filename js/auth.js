function checkAuth() {
    var saved = sessionStorage.getItem('currentUser');
    if (!saved) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(saved);
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function saveTaskResult(login, taskId, score, maxScore) {
    var saved = localStorage.getItem('itResults');
    var resultsData = {};
    if (saved) {
        try { resultsData = JSON.parse(saved); } catch(e) {}
    }
    
    if (!resultsData[login]) resultsData[login] = { tasks: {} };
    
    var existing = resultsData[login].tasks[taskId];
    if (existing && existing.score >= score) return false;
    
    resultsData[login].tasks[taskId] = {
        score: score,
        max: maxScore,
        percent: Math.round(score / maxScore * 100),
        date: new Date().toISOString()
    };
    
    localStorage.setItem('itResults', JSON.stringify(resultsData));
    return true;
}

function getTaskResult(login, taskId) {
    var saved = localStorage.getItem('itResults');
    if (!saved) return null;
    try {
        var resultsData = JSON.parse(saved);
        return resultsData[login]?.tasks?.[taskId] || null;
    } catch(e) {
        return null;
    }
}
