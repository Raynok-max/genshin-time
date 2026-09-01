// Genshin RPG Time
// SillyTavern 1.18.0

(function () {
    'use strict';

    const EXTENSION_NAME = 'Genshin RPG Time';
    const MINUTES_PER_DAY = 1440;

    // =========================================================
    // Контекст SillyTavern
    // =========================================================

    function getContext() {
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
    // Локальные переменные текущего чата
    // =========================================================

    function getVariable(name) {
        const context = getContext();

        if (!context.variables?.local?.get) {
            throw new Error('API локальных переменных недоступен.');
        }

        return context.variables.local.get(name);
    }

    function setVariable(name, value) {
        const context = getContext();

        if (!context.variables?.local?.set) {
            throw new Error('API локальных переменных недоступен.');
        }

        context.variables.local.set(name, value);
    }

    // =========================================================
    // Нормализация времени
    // =========================================================

    function normalizeTime(value) {
        let time = Math.floor(Number(value));

        if (!Number.isFinite(time)) {
            time = 0;
        }

        return ((time % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;
    }

    // =========================================================
    // Получить текущее время
    // =========================================================

    function getCurrentTime() {
        return normalizeTime(getVariable('Время'));
    }

    // =========================================================
    // Сохранить время
    // =========================================================

    function saveTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        setVariable('Время', totalMinutes);
        setVariable('Часы', hours);
        setVariable('Минуты', minutes);

        return {
            total: totalMinutes,
            hours: hours,
            minutes: minutes,
            text:
                String(hours).padStart(2, '0') +
                ':' +
                String(minutes).padStart(2, '0')
        };
    }

    // =========================================================
    // Форматирование
    // =========================================================

    function formatTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
        );
    }

    // =========================================================
    // Изменение времени
    // =========================================================

    function changeTime(amount) {
        const current = getCurrentTime();
        return saveTime(current + amount);
    }

    // =========================================================
    // Парсер длительности
    //
    // 30       = 30 минут
    // +30      = +30 минут
    // -30      = -30 минут
    // 2ч       = 2 часа
    // 30м      = 30 минут
    // 1ч30м    = 1 час 30 минут
    // -1ч30м   = -1 час 30 минут
    // =========================================================

    function parseDuration(input) {
        if (input === undefined || input === null) {
            return null;
        }

        let text = String(input)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

        if (!text) {
            return null;
        }

        // Обычное число = минуты

        if (/^[+-]?\d+$/.test(text)) {
            const result = Number(text);
            return Number.isFinite(result) ? result : null;
        }

        let sign = 1;

        if (text.startsWith('+')) {
            text = text.slice(1);
        } else if (text.startsWith('-')) {
            sign = -1;
            text = text.slice(1);
        }

        if (!text) {
            return null;
        }

        let total = 0;
        let found = false;

        // Часы

        const hoursMatch = text.match(/(\d+(?:\.\d+)?)ч/);

        if (hoursMatch) {
            total += Number(hoursMatch[1]) * 60;
            found = true;
        }

        // Минуты

        const minutesMatch = text.match(/(\d+)м/);

        if (minutesMatch) {
            total += Number(minutesMatch[1]);
            found = true;
        }

        if (!found || !Number.isFinite(total)) {
            return null;
        }

        return sign * total;
    }

    // =========================================================
    // Парсер конкретного времени ЧЧ:ММ
    // =========================================================

    function parseClockTime(input) {
        const text = String(input || '').trim();

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
        const context = getContext();

        if (typeof context.registerSlashCommand !== 'function') {
            throw new Error(
                'registerSlashCommand отсутствует в API SillyTavern.'
            );
        }

        context.registerSlashCommand(
            name,
            callback,
            [],
            help,
            true,
            true
        );
    }

    // =========================================================
    // /время
    //
    // /время 30
    // /время -15
    // /время +2ч
    // /время +1ч30м
    //
    // Без аргумента:
    // /время
    // =========================================================

    registerCommand(
        'время',
        async (args) => {
            try {
                const value = String(args || '').trim();

                if (!value) {
                    return formatTime(getCurrentTime());
                }

                const duration = parseDuration(value);

                if (
                    duration === null ||
                    !Number.isFinite(duration)
                ) {
                    return (
                        'Ошибка. Примеры: ' +
                        '/время 30, ' +
                        '/время -15, ' +
                        '/время +2ч, ' +
                        '/время +1ч30м'
                    );
                }

                return changeTime(duration).text;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] /время:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Изменить игровое время'
    );

    // =========================================================
    // /прошловремени
    //
    // Для ИИ:
    // /прошловремени 30
    // /прошловремени 1ч20м
    // =========================================================

    registerCommand(
        'прошловремени',
        async (args) => {
            try {
                const value = String(args || '').trim();

                if (!value) {
                    return (
                        'Ошибка. Например: ' +
                        '/прошловремени 30'
                    );
                }

                const duration = parseDuration(value);

                if (
                    duration === null ||
                    !Number.isFinite(duration) ||
                    duration < 0
                ) {
                    return (
                        'Ошибка. Нужно положительное количество времени.'
                    );
                }

                return changeTime(duration).text;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] /прошловремени:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Добавить прошедшее игровое время'
    );

    // =========================================================
    // /установитьвремя
    //
    // /установитьвремя 18:30
    // =========================================================

    registerCommand(
        'установитьвремя',
        async (args) => {
            try {
                const value = String(args || '').trim();
                const total = parseClockTime(value);

                if (total === null) {
                    return (
                        'Ошибка. Используй формат ЧЧ:ММ, ' +
                        'например /установитьвремя 18:30'
                    );
                }

                return saveTime(total).text;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] /установитьвремя:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Установить конкретное игровое время'
    );

    // =========================================================
    // /текущеевремя
    // =========================================================

    registerCommand(
        'текущеевремя',
        async () => {
            try {
                return formatTime(getCurrentTime());
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] /текущеевремя:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Показать текущее игровое время'
    );

    // =========================================================
    // /времядебаг
    // =========================================================

    registerCommand(
        'времядебаг',
        async () => {
            try {
                const total = getCurrentTime();
                const hours = Math.floor(total / 60);
                const minutes = total % 60;

                return (
                    `Время=${total}; ` +
                    `Часы=${hours}; ` +
                    `Минуты=${minutes}; ` +
                    `Отображение=${formatTime(total)}`
                );
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] /времядебаг:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Показать внутренние значения времени'
    );

    console.log(
        `[${EXTENSION_NAME}] Загружено успешно.`
    );
})();
