// Genshin RPG Time
// Extension for SillyTavern 1.18.x

(function () {
    'use strict';

    const EXTENSION_NAME = 'Genshin RPG Time';

    // =========================================================
    // Получение контекста SillyTavern
    // =========================================================

    function getSTContext() {
        if (typeof SillyTavern === 'undefined') {
            throw new Error('SillyTavern API недоступен.');
        }

        const context = SillyTavern.getContext();

        if (!context) {
            throw new Error('Не удалось получить контекст SillyTavern.');
        }

        return context;
    }

    // =========================================================
    // Работа с переменными
    // =========================================================

    function getVariables() {
        const context = getSTContext();

        if (!context.variables) {
            throw new Error('Переменные SillyTavern недоступны.');
        }

        return context.variables;
    }

    function getVariable(name, defaultValue = 0) {
        const variables = getVariables();
        const value = Number(variables[name]);

        if (!Number.isFinite(value)) {
            return defaultValue;
        }

        return value;
    }

    function setVariable(name, value) {
        const variables = getVariables();
        variables[name] = value;
    }

    // =========================================================
    // Внутреннее представление времени
    //
    // Время = количество минут с начала суток.
    //
    // 00:00 = 0
    // 01:00 = 60
    // 12:00 = 720
    // 23:59 = 1439
    // =========================================================

    const MINUTES_PER_DAY = 24 * 60;

    function normalizeTime(minutes) {
        minutes = Math.floor(Number(minutes));

        if (!Number.isFinite(minutes)) {
            minutes = 0;
        }

        return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;
    }

    function getCurrentTime() {
        return normalizeTime(getVariable('Время', 0));
    }

    function getHours(minutes) {
        return Math.floor(minutes / 60);
    }

    function getMinutes(minutes) {
        return minutes % 60;
    }

    function formatTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = getHours(totalMinutes);
        const minutes = getMinutes(totalMinutes);

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
        );
    }

    // =========================================================
    // Сохранение времени
    // =========================================================

    function saveTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = getHours(totalMinutes);
        const minutes = getMinutes(totalMinutes);

        setVariable('Время', totalMinutes);
        setVariable('Часы', hours);
        setVariable('Минуты', minutes);

        return {
            total: totalMinutes,
            hours: hours,
            minutes: minutes,
            formatted: formatTime(totalMinutes),
        };
    }

    // =========================================================
    // Изменение времени
    // =========================================================

    function addTime(amount) {
        const currentTime = getCurrentTime();
        return saveTime(currentTime + amount);
    }

    // =========================================================
    // Парсинг длительности
    //
    // Поддерживает:
    //
    // 30
    // +30
    // -30
    // 2ч
    // +2ч
    // 30м
    // +30м
    // 1ч30м
    // +1ч30м
    // 2ч15м
    // -1ч
    // =========================================================

    function parseDuration(input) {
        if (input === null || input === undefined) {
            return null;
        }

        let text = String(input)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

        if (!text) {
            return null;
        }

        // -----------------------------------------------------
        // Обычное число = минуты
        // -----------------------------------------------------

        if (/^[+-]?\d+$/.test(text)) {
            const minutes = Number(text);

            if (Number.isFinite(minutes)) {
                return minutes;
            }

            return null;
        }

        // -----------------------------------------------------
        // Убираем "+" с начала, но сохраняем "-" если есть.
        // -----------------------------------------------------

        let sign = 1;

        if (text.startsWith('+')) {
            text = text.substring(1);
        } else if (text.startsWith('-')) {
            sign = -1;
            text = text.substring(1);
        }

        if (!text) {
            return null;
        }

        // -----------------------------------------------------
        // Разбор часов
        // -----------------------------------------------------

        const hourMatch = text.match(/^(\d+(?:\.\d+)?)ч/);

        // -----------------------------------------------------
        // Разбор минут
        // -----------------------------------------------------

        const minuteMatch = text.match(/(\d+)м$/);

        let hours = 0;
        let minutes = 0;
        let foundSomething = false;

        if (hourMatch) {
            hours = Number(hourMatch[1]);
            foundSomething = true;
        }

        if (minuteMatch) {
            minutes = Number(minuteMatch[1]);
            foundSomething = true;
        }

        if (!foundSomething) {
            return null;
        }

        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
            return null;
        }

        return sign * (hours * 60 + minutes);
    }

    // =========================================================
    // Парсинг конкретного времени
    //
    // Формат:
    //
    // 00:00
    // 09:30
    // 18:45
    // 23:59
    // =========================================================

    function parseClockTime(input) {
        if (input === null || input === undefined) {
            return null;
        }

        const text = String(input).trim();

        const match = text.match(/^(\d{1,2}):(\d{1,2})$/);

        if (!match) {
            return null;
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);

        if (
            !Number.isInteger(hours) ||
            !Number.isInteger(minutes)
        ) {
            return null;
        }

        if (hours < 0 || hours > 23) {
            return null;
        }

        if (minutes < 0 || minutes > 59) {
            return null;
        }

        return hours * 60 + minutes;
    }

    // =========================================================
    // Регистрация slash-команд
    // =========================================================

    function registerCommand(name, callback, help) {
        const context = getSTContext();

        if (typeof context.registerSlashCommand !== 'function') {
            console.error(
                `[${EXTENSION_NAME}] registerSlashCommand не найден.`
            );
            return false;
        }

        try {
            context.registerSlashCommand(
                name,
                callback,
                [],
                help,
                true,
                true
            );

            console.log(
                `[${EXTENSION_NAME}] Команда /${name} зарегистрирована.`
            );

            return true;
        } catch (error) {
            console.error(
                `[${EXTENSION_NAME}] Ошибка регистрации /${name}:`,
                error
            );

            return false;
        }
    }

    // =========================================================
    // /время
    //
    // Примеры:
    //
    // /время 30
    // /время -15
    // /время +2ч
    // /время +1ч30м
    // /время 45м
    //
    // Без аргумента:
    //
    // /время
    //
    // покажет текущее время.
    // =========================================================

    registerCommand(
        'время',
        async (args) => {
            try {
                const value = String(args || '').trim();

                // Просто показать текущее время
                if (!value) {
                    return formatTime(getCurrentTime());
                }

                const duration = parseDuration(value);

                if (
                    duration === null ||
                    !Number.isFinite(duration)
                ) {
                    return (
                        'Ошибка: укажи время, например ' +
                        '/время 30, /время +2ч или /время +1ч30м'
                    );
                }

                const result = addTime(duration);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /время:`,
                    error
                );

                return `Ошибка /время: ${error.message}`;
            }
        },
        'Изменить игровое время'
    );

    // =========================================================
    // /прошловремени
    //
    // Специально для ИИ:
    //
    // /прошловремени 5
    // /прошловремени 30
    // /прошловремени 1ч20м
    //
    // Всегда добавляет положительное количество времени.
    // =========================================================

    registerCommand(
        'прошловремени',
        async (args) => {
            try {
                const value = String(args || '').trim();

                if (!value) {
                    return (
                        'Ошибка: укажи, сколько времени прошло. ' +
                        'Например: /прошловремени 30'
                    );
                }

                const duration = parseDuration(value);

                if (
                    duration === null ||
                    !Number.isFinite(duration) ||
                    duration < 0
                ) {
                    return (
                        'Ошибка: используй положительное количество времени, ' +
                        'например /прошловремени 30 или /прошловремени 1ч30м'
                    );
                }

                const result = addTime(duration);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /прошловремени:`,
                    error
                );

                return `Ошибка /прошловремени: ${error.message}`;
            }
        },
        'Добавить прошедшее игровое время'
    );

    // =========================================================
    // /установитьвремя
    //
    // Примеры:
    //
    // /установитьвремя 09:30
    // /установитьвремя 18:45
    // /установитьвремя 23:59
    // =========================================================

    registerCommand(
        'установитьвремя',
        async (args) => {
            try {
                const value = String(args || '').trim();

                if (!value) {
                    return (
                        'Ошибка: используй формат ЧЧ:ММ, ' +
                        'например /установитьвремя 18:30'
                    );
                }

                const totalMinutes = parseClockTime(value);

                if (totalMinutes === null) {
                    return (
                        'Ошибка: неверное время. ' +
                        'Используй формат ЧЧ:ММ, например 18:30'
                    );
                }

                const result = saveTime(totalMinutes);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /установитьвремя:`,
                    error
                );

                return `Ошибка /установитьвремя: ${error.message}`;
            }
        },
        'Установить конкретное время'
    );

    // =========================================================
    // /текущеевремя
    //
    // Просто возвращает текущее время.
    // =========================================================

    registerCommand(
        'текущеевремя',
        async () => {
            try {
                return formatTime(getCurrentTime());
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /текущеевремя:`,
                    error
                );

                return `Ошибка /текущеевремя: ${error.message}`;
            }
        },
        'Показать текущее игровое время'
    );

    // =========================================================
    // /времядебаг
    //
    // Показывает все значения переменных.
    //
    // Удобно для проверки, что всё работает.
    // =========================================================

    registerCommand(
        'времядебаг',
        async () => {
            try {
                const total = getCurrentTime();
                const hours = getHours(total);
                const minutes = getMinutes(total);

                return (
                    `Время=${total}; ` +
                    `Часы=${hours}; ` +
                    `Минуты=${minutes}; ` +
                    `Отображение=${formatTime(total)}`
                );
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /времядебаг:`,
                    error
                );

                return `Ошибка /времядебаг: ${error.message}`;
            }
        },
        'Показать внутренние значения игровой системы времени'
    );

    // =========================================================
    // Инициализация
    //
    // При загрузке расширения приводим переменные в порядок.
    // =========================================================

    try {
        const current = getCurrentTime();
        saveTime(current);

        console.log(
            `[${EXTENSION_NAME}] Расширение успешно загружено.`
        );

        console.log(
            `[${EXTENSION_NAME}] Текущее время: ${formatTime(current)}`
        );
    } catch (error) {
        console.error(
            `[${EXTENSION_NAME}] Ошибка инициализации:`,
            error
        );
    }

})();
