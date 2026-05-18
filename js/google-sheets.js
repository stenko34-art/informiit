var SHEET_IDS = {
    '101': '1e4fcZ6J6fHfsvb6xca8lP5AwSRT2t7b02GcHEZfTmwU',
    '102': '1AeNAFAkY1EDD4NfVUmk04j2nqZK3l2ltdXuDNX6bB-Q',
    '103': '1LSe4uS98lWDNyjigS028Kn4lV42u7N2DUjyJo3y3RHc',
    '104': '1Z8uVSazOeBtclHgIBsYEBFCD_RikTjPzQyjyAZF2t3Y',
    '105': '1Zga2Kn2BjzL1RCidFiNDbDtQF7IbLZzdZ8AE7AXM9fw',
    '106': '1fNXJCnmJ_szR50v2RfPKx_xR2gHDL44hr7SxHI1oLgo',
    '107': '1m-D6b57CdSPDEw6vcevvVMB4twmJReLa8xS4qyMFJ2Y',
    '108': '1qwWCSk-EDVq1amZ3Hn8fKsJULBkthr8lr9_x68vjlsY'
};

var cache = {};
var cacheTime = {};

function loadGroupData(group) {
    return new Promise(function(resolve) {
        var sheetId = SHEET_IDS[group];
        if (!sheetId) { resolve(null); return; }
        
        if (cache[group] && cacheTime[group] && (Date.now() - cacheTime[group] < 300000)) {
            console.log('Из кэша: группа ' + group);
            resolve(cache[group]);
            return;
        }
        
        console.log('Загружаем группу ' + group + '...');
        
        // Загружаем ПЗ
        var urlPZ = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ПЗ';
        
        fetch(urlPZ)
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
                var pzData = parseStudents(json);
                console.log('ПЗ загружено: ' + pzData.length + ' студентов');
                
                // Загружаем ЛР
                var urlLR = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ЛР';
                return fetch(urlLR)
                    .then(function(r) { return r.text(); })
                    .then(function(text) {
                        var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
                        var lrData = parseStudents(json);
                        console.log('ЛР загружено: ' + lrData.length + ' студентов');
                        
                        // Объединяем
                        var merged = mergeByName(pzData, lrData);
                        cache[group] = merged;
                        cacheTime[group] = Date.now();
                        resolve(merged);
                    });
            })
            .catch(function(err) {
                console.error('Ошибка:', err);
                resolve(cache[group] || null);
            });
    });
}

function parseStudents(json) {
    var rows = json.table.rows;
    var students = [];
    
    for (var i = 1; i < rows.length; i++) {
        var cells = rows[i].c;
        if (!cells || !cells[3]) continue;
        
        var fio = getVal(cells[3]);
        if (!fio) continue;
        
        students.push({ fio: fio, tasks: {} });
    }
    
    return students;
}

function mergeByName(pz, lr) {
    var map = {};
    
    pz.forEach(function(s) {
        map[s.fio] = { fio: s.fio, tasks: {} };
    });
    lr.forEach(function(s) {
        if (!map[s.fio]) map[s.fio] = { fio: s.fio, tasks: {} };
    });
    
    return Object.values(map);
}

function getVal(cell) {
    if (!cell) return '';
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return '';
}

function findStudentByName(name, students) {
    if (!students) return null;
    var search = name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (var i = 0; i < students.length; i++) {
        var sName = students[i].fio.toLowerCase().replace(/\s+/g, ' ').trim();
        if (sName === search || sName.includes(search) || search.includes(sName)) {
            // Загружаем полные данные студента
            return loadFullStudentData(students[i].fio, i);
        }
    }
    return null;
}

function loadFullStudentData(fio, index) {
    var group = currentLoadGroup;
    var sheetId = SHEET_IDS[group];
    
    return Promise.all([
        fetch('https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ПЗ').then(r => r.text()),
        fetch('https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ЛР').then(r => r.text())
    ]).then(function(results) {
        var pzJson = JSON.parse(results[0].substring(results[0].indexOf('{'), results[0].lastIndexOf('}') + 1));
        var lrJson = JSON.parse(results[1].substring(results[1].indexOf('{'), results[1].lastIndexOf('}') + 1));
        
        var student = { fio: fio, tasks: {} };
        
        // Парсим ПЗ (столбцы G-H=ПЗ1, I-J=ПЗ2, K-L=ПЗ3, M-N=ПЗ5, O-P=ПЗ6, Q-R=ПЗ7, S-T=ПЗ8)
        var pzCols = [6,8,10,12,14,16,18]; // индексы столбцов статуса
        var pzNames = ['ПЗ1','ПЗ2','ПЗ3','ПЗ5','ПЗ6','ПЗ7','ПЗ8'];
        
        var pzRow = pzJson.table.rows[index + 2]; // +2 потому что первые 2 строки — заголовки
        if (pzRow) {
            pzCols.forEach(function(col, i) {
                student.tasks[pzNames[i]] = {
                    status: getVal(pzRow.c[col]),
                    grade: getVal(pzRow.c[col + 1])
                };
            });
        }
        
        // Парсим ЛР (столбцы E-F=ЛР1, G-H=ЛР2, I-J=ЛР3, K-L=ЛР4, M-N=ЛР5, O-P=ЛР6, Q-R=ЛР7)
        var lrCols = [4,6,8,10,12,14,16];
        var lrNames = ['ЛР1','ЛР2','ЛР3','ЛР4','ЛР5','ЛР6','ЛР7'];
        
        var lrRow = lrJson.table.rows[index + 2];
        if (lrRow) {
            lrCols.forEach(function(col, i) {
                student.tasks[lrNames[i]] = {
                    status: getVal(lrRow.c[col]),
                    grade: getVal(lrRow.c[col + 1])
                };
            });
        }
        
        return student;
    });
}

var currentLoadGroup = '';

function getStudentSheetData(studentName, group) {
    currentLoadGroup = group;
    
    return loadGroupData(group).then(function(students) {
        return findStudentByName(studentName, students);
    });
}

window.GoogleSheets = {
    loadGroupData: loadGroupData,
    getStudentSheetData: getStudentSheetData
};
