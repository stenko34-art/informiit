/**
 * Загрузка данных из Google Таблиц
 * Каждая группа — отдельная таблица
 */

// ID таблиц для каждой группы (из предоставленных ссылок)
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

// Кэш данных (храним 10 минут)
var cache = {};
var cacheTime = {};

// Задания в том порядке, как в таблице (слева направо)
var TASK_ORDER = ['ЛР1', 'ЛР2', 'ЛР3', 'ЛР4,5', 'ЛР6', 'ЛР7', 'ПЗ1', 'ПЗ2', 'ПЗ3', 'ПЗ5', 'ПЗ6', 'ПЗ7', 'ПЗ8'];

/**
 * Загрузка данных группы из Google Sheets
 */
function loadGroupData(group) {
    return new Promise(function(resolve, reject) {
        var sheetId = SHEET_IDS[group];
        
        if (!sheetId) {
            console.log('Нет ID таблицы для группы ' + group);
            resolve(null);
            return;
        }
        
        // Проверяем кэш (10 минут)
        var now = Date.now();
        if (cache[group] && cacheTime[group] && (now - cacheTime[group] < 600000)) {
            console.log('Загружено из кэша: группа ' + group);
            resolve(cache[group]);
            return;
        }
        
        console.log('Загружаем группу ' + group + ' из Google Sheets...');
        
        // Используем Google Visualization API (не требует ключа!)
        var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json';
        
        fetch(url)
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(function(text) {
                // Парсим JSON из ответа
                var jsonStart = text.indexOf('{');
                var jsonEnd = text.lastIndexOf('}') + 1;
                
                if (jsonStart === -1 || jsonEnd <= jsonStart) {
                    throw new Error('Не удалось распарсить ответ');
                }
                
                var json = JSON.parse(text.substring(jsonStart, jsonEnd));
                var rows = json.table.rows;
                var students = [];
                
                console.log('Загружено строк:', rows.length);
                
                // Пропускаем заголовок (строка 0)
                for (var i = 1; i < rows.length; i++) {
                    var cells = rows[i].c;
                    
                    // Пропускаем пустые строки
                    if (!cells || !cells[1]) continue;
                    
                    var fio = getCellValue(cells[1]);
                    if (!fio || fio.trim() === '') continue;
                    
                    var student = {
                        number: getCellValue(cells[0]),
                        fio: fio.trim(),
                        tasks: {}
                    };
                    
                    // Парсим задания (начиная со столбца C = индекс 2)
                    for (var j = 0; j < TASK_ORDER.length; j++) {
                        var colIndex = 2 + j * 2; // 2, 4, 6, 8...
                        var statusCell = cells[colIndex];
                        var gradeCell = cells[colIndex + 1];
                        
                        student.tasks[TASK_ORDER[j]] = {
                            status: statusCell ? String(getCellValue(statusCell)).trim() : '',
                            grade: gradeCell ? String(getCellValue(gradeCell)).trim() : ''
                        };
                    }
                    
                    students.push(student);
                }
                
                console.log('Студентов в группе ' + group + ':', students.length);
                
                // Сохраняем в кэш
                cache[group] = students;
                cacheTime[group] = Date.now();
                
                resolve(students);
            })
            .catch(function(error) {
                console.error('Ошибка загрузки группы ' + group + ':', error.message);
                // Если есть кэш — используем его
                if (cache[group]) {
                    console.log('Используем старый кэш для группы ' + group);
                    resolve(cache[group]);
                } else {
                    resolve(null);
                }
            });
    });
}

/**
 * Получить значение ячейки
 */
function getCellValue(cell) {
    if (!cell) return '';
    if (cell.v !== undefined && cell.v !== null) return cell.v;
    if (cell.f) return cell.f;
    return '';
}

/**
 * Найти студента по имени в данных группы
 */
function findStudentByName(name, students) {
    if (!students) return null;
    
    // Нормализуем имя для поиска
    var searchName = name.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (var i = 0; i < students.length; i++) {
        var studentName = students[i].fio.toLowerCase().replace(/\s+/g, ' ').trim();
        if (studentName.includes(searchName) || searchName.includes(studentName)) {
            return students[i];
        }
    }
    return null;
}

/**
 * Получить данные конкретного студента
 */
function getStudentSheetData(studentName, group) {
    return loadGroupData(group).then(function(students) {
        if (!students) return null;
        return findStudentByName(studentName, students);
    });
}

// Экспорт для использования в dashboard
window.GoogleSheets = {
    loadGroupData: loadGroupData,
    getStudentSheetData: getStudentSheetData,
    findStudentByName: findStudentByName,
    TASK_ORDER: TASK_ORDER
};
