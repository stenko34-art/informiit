/**
 * Загрузка данных из Google Таблиц
 * Структура: листы "ПЗ" и "ЛР", фамилии в столбце D, начиная с 3 строки
 */

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

/**
 * Загрузка данных группы (оба листа: ПЗ и ЛР)
 */
function loadGroupData(group) {
    return new Promise(function(resolve, reject) {
        var sheetId = SHEET_IDS[group];
        if (!sheetId) { resolve(null); return; }
        
        var now = Date.now();
        if (cache[group] && cacheTime[group] && (now - cacheTime[group] < 300000)) {
            resolve(cache[group]);
            return;
        }
        
        // Загружаем лист "ПЗ"
        var urlPZ = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ПЗ';
        
        fetch(urlPZ)
            .then(function(r) { return r.text(); })
            .then(function(text) {
                var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
                return parseSheet(json, 'ПЗ');
            })
            .then(function(pzData) {
                // Загружаем лист "ЛР"
                var urlLR = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=ЛР';
                return fetch(urlLR)
                    .then(function(r) { return r.text(); })
                    .then(function(text) {
                        var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
                        var lrData = parseSheet(json, 'ЛР');
                        
                        // Объединяем данные
                        var merged = mergeStudentData(pzData, lrData);
                        cache[group] = merged;
                        cacheTime[group] = Date.now();
                        resolve(merged);
                    });
            })
            .catch(function(err) {
                console.error('Ошибка загрузки группы ' + group + ':', err);
                resolve(cache[group] || null);
            });
    });
}

/**
 * Парсинг листа
 */
function parseSheet(json, sheetType) {
    var rows = json.table.rows;
    var students = [];
    
    // Данные начинаются с 3-й строки (индекс 2), столбец D (индекс 3)
    for (var i = 2; i < rows.length; i++) {
        var cells = rows[i].c;
        if (!cells || !cells[3]) continue; // Нет фамилии
        
        var fio = getVal(cells[3]);
        if (!fio || fio.trim() === '') continue;
        
        var student = {
            fio: fio.trim(),
            type: sheetType,
            tasks: {}
        };
        
        // Парсим задания в зависимости от листа
        if (sheetType === 'ПЗ') {
            parsePZSheet(student, cells);
        } else if (sheetType === 'ЛР') {
            parseLRSheet(student, cells);
        }
        
        students.push(student);
    }
    
    return students;
}

/**
 * Парсинг листа ПЗ
 * Столбцы: G-H (ПЗ1), I-J (ПЗ2), K-L (ПЗ3), M-N (ПЗ5), O-P (ПЗ6), Q-R (ПЗ7), S-T (ПЗ8)
 * Дальше: U-V (ПЗ9), W-X (ПЗ10), Y-Z (ПЗ11), AA-AB (ПЗ12), AC-AD (ПЗ13), AE-AF (ПЗ14), AG-AH (ПЗ15)
 * AI-AJ (ПЗ16), AK-AL (ПЗ17), AM-AN (ПЗ18), AO-AP (ПЗ19), AQ-AR (ПЗ20), AS-AT (ПЗ21), AU-AV (ПЗ24), AW-AX (ПЗ25), AY-AZ (ПЗ27), BA-BB (ПЗ28), BC-BD (ПЗ29)
 */
function parsePZSheet(student, cells) {
    var pzMap = {
        6: 'ПЗ1', 8: 'ПЗ2', 10: 'ПЗ3', 12: 'ПЗ5', 14: 'ПЗ6', 16: 'ПЗ7', 18: 'ПЗ8',
        20: 'ПЗ9', 22: 'ПЗ10', 24: 'ПЗ11', 26: 'ПЗ12', 28: 'ПЗ13', 30: 'ПЗ14', 32: 'ПЗ15',
        34: 'ПЗ16', 36: 'ПЗ17', 38: 'ПЗ18', 40: 'ПЗ19', 42: 'ПЗ20', 44: 'ПЗ21',
        46: 'ПЗ24', 48: 'ПЗ25', 50: 'ПЗ27', 52: 'ПЗ28', 54: 'ПЗ29'
    };
    
    for (var col in pzMap) {
        var statusCell = cells[parseInt(col)];
        var gradeCell = cells[parseInt(col) + 1];
        student.tasks[pzMap[col]] = {
            status: getVal(statusCell),
            grade: getVal(gradeCell)
        };
    }
}

/**
 * Парсинг листа ЛР
 * Столбцы: E-F (ЛР1), G-H (ЛР2), I-J (ЛР3), K-L (ЛР4), M-N (ЛР5), O-P (ЛР6), Q-R (ЛР7),
 * S-T (ЛР8), U-V (ЛР9), W-X (ЛР10), Y-Z (ЛР11), AA-AB (ЛР12), AC-AD (ЛР13), AE-AF (ЛР14), AG-AH (ЛР15), AI-AJ (ЛР16)
 */
function parseLRSheet(student, cells) {
    var lrMap = {
        4: 'ЛР1', 6: 'ЛР2', 8: 'ЛР3', 10: 'ЛР4', 12: 'ЛР5', 14: 'ЛР6', 16: 'ЛР7',
        18: 'ЛР8', 20: 'ЛР9', 22: 'ЛР10', 24: 'ЛР11', 26: 'ЛР12', 28: 'ЛР13', 30: 'ЛР14', 32: 'ЛР15', 34: 'ЛР16'
    };
    
    for (var col in lrMap) {
        var statusCell = cells[parseInt(col)];
        var gradeCell = cells[parseInt(col) + 1];
        student.tasks[lrMap[col]] = {
            status: getVal(statusCell),
            grade: getVal(gradeCell)
        };
    }
}

/**
 * Объединение данных ПЗ и ЛР по ФИО
 */
function mergeStudentData(pzStudents, lrStudents) {
    var merged = [];
    var fioMap = {};
    
    // Сначала добавляем всех из ПЗ
    pzStudents.forEach(function(s) {
        fioMap[s.fio] = { fio: s.fio, tasks: {} };
        Object.assign(fioMap[s.fio].tasks, s.tasks);
    });
    
    // Добавляем/обновляем из ЛР
    lrStudents.forEach(function(s) {
        if (!fioMap[s.fio]) {
            fioMap[s.fio] = { fio: s.fio, tasks: {} };
        }
        Object.assign(fioMap[s.fio].tasks, s.tasks);
    });
    
    // Преобразуем в массив
    for (var fio in fioMap) {
        merged.push(fioMap[fio]);
    }
    
    return merged;
}

function getVal(cell) {
    if (!cell) return '';
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    if (cell.f) return String(cell.f).trim();
    return '';
}

function findStudentByName(name, students) {
    if (!students) return null;
    
    // Убираем лишние пробелы и приводим к нижнему регистру
    var searchName = name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    console.log('Ищем студента: "' + searchName + '"');
    console.log('Всего студентов в группе: ' + students.length);
    
    // Сначала точное совпадение
    for (var i = 0; i < students.length; i++) {
        var sName = students[i].fio.toLowerCase().replace(/\s+/g, ' ').trim();
        console.log('Студент ' + i + ': "' + sName + '"');
        
        if (sName === searchName) {
            console.log('✅ Найдено точное совпадение!');
            return students[i];
        }
    }
    
    // Частичное совпадение (фамилия содержится в имени)
    for (var i = 0; i < students.length; i++) {
        var sName = students[i].fio.toLowerCase().replace(/\s+/g, ' ').trim();
        if (sName.includes(searchName) || searchName.includes(sName)) {
            console.log('✅ Найдено частичное совпадение!');
            return students[i];
        }
    }
    
    console.log('❌ Студент не найден');
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
