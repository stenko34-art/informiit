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
        
        var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ПЗ';
        
        fetch(url)
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
                var rows = json.table.rows;
                var students = [];
                
                // Начинаем с 3-й строки (индекс 2), ФИО в столбце D (индекс 3)
                for (var i = 2; i < rows.length; i++) {
                    var cells = rows[i].c;
                    if (!cells || !cells[3]) continue;
                    
                    var fio = getVal(cells[3]);
                    if (!fio) continue;
                    
                    students.push({ fio: fio, tasks: {} });
                }
                
                console.log('Студентов: ' + students.length);
                cache[group] = students;
                cacheTime[group] = Date.now();
                resolve(students);
            })
            .catch(function(err) {
                console.error('Ошибка:', err);
                resolve(cache[group] || null);
            });
    });
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
            return students[i];
        }
    }
    return null;
}

function getStudentSheetData(studentName, group) {
    return loadGroupData(group).then(function(students) {
        return findStudentByName(studentName, students);
    });
}

window.GoogleSheets = {
    loadGroupData: loadGroupData,
    getStudentSheetData: getStudentSheetData,
    findStudentByName: findStudentByName
};
