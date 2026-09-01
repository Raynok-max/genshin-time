```javascript
// Genshin RPG Time
// SillyTavern 1.18.0

(function () {
    'use strict';

    const EXTENSION_NAME = 'Genshin RPG Time';
    const MINUTES_PER_DAY = 1440;

    // =========================================================
    // SillyTavern context
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
    // Local variables
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

        return context.variables.local.set(name, value);
    }

    // =========================================================
    // Time helpers
    // =========================================================

    function normalizeTime(minutes) {
        minutes = Math.floor(Number(minutes));

        if (!Number.isFinite(minutes)) {
            minutes = 0;
        }

        return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    }

    function getCurrentTime() {
        const value = getVariable('Время');

        if (value === undefined || value === null || value === '') {
            return 0;
        }

        return normalizeTime(value);
    }

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
            formatted:
                String(hours).padStart(2, '0') +
                ':' +
                String(minutes).padStart(2, '0')
        };
    }

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

    function changeTime(amount) {
        const current = getCurrentTime();
        return saveTime(current + amount);
    }

    // =========================================================
    // Arguments
    //
    // В ST 1.18.0:
    //
    // callback(namedArguments, unnamedArguments)
    //
    // Поэтому здесь аккуратно получаем второй аргумент.
    // =========================================================

    function getArgumentValue(unnamedArguments) {
        if (unnamedArguments === undefined || unnamedArguments === null) {
            return '';
        }

        if (Array.isArray(unnamedArguments)) {
            return unnamedArguments.join(' ').trim();
        }

        return String(unnamedArguments).trim();
    }

    // =========================================================
    // Duration parser
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
        let text = String(input ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

        if (!text) {
            return null;
        }

        // Просто число = минуты

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

        const hoursMatch = text.match(/(\d+(?:\.\d+)?)ч/);

        if (hoursMatch) {
            total += Number(hoursMatch[1]) * 60;
            found = true;
        }

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
    // Clock parser
    //
    // 00:00
    // 09:30
    // 18:45
    // 23:59
    // =========================================================

    function parseClockTime(input) {
        const text = String(input ?? '').trim();

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
    // Slash command registration
    // =========================================================

    function registerCommand(name, callback, help) {
        const context = getContext();

        if (typeof context.registerSlashCommand !== 'function') {
            throw new Error(
                'registerSlashCommand отсутствует в SillyTavern.'
            );
        }

        context.registerSlashCommand(
            name,
            callback,
            [],
            help
        );

        console.log(
            `[${EXTENSION_NAME}] Зарегистрирована команда /${name}`
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
    // /время
    // =========================================================

    registerCommand(
        'время',
        async (_namedArguments, unnamedArguments) => {
            try {
                const value = getArgumentValue(unnamedArguments);

                // /время
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

                const result = changeTime(duration);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /время:`,
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
    // /прошловремени 30
    // /прошловремени 1ч30м
    // =========================================================

    registerCommand(
        'прошловремени',
        async (_namedArguments, unnamedArguments) => {
            try {
                const value = getArgumentValue(unnamedArguments);

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
                        'Ошибка. Укажи положительное количество времени.'
                    );
                }

                const result = changeTime(duration);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /прошловремени:`,
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
        async (_namedArguments, unnamedArguments) => {
            try {
                const value = getArgumentValue(unnamedArguments);

                const totalMinutes = parseClockTime(value);

                if (totalMinutes === null) {
                    return (
                        'Ошибка. Используй формат ЧЧ:ММ, ' +
                        'например /установитьвремя 18:30'
                    );
                }

                const result = saveTime(totalMinutes);

                return result.formatted;
            } catch (error) {
                console.error(
                    `[${EXTENSION_NAME}] Ошибка /установитьвремя:`,
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
                    `[${EXTENSION_NAME}] Ошибка /текущеевремя:`,
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
                    `[${EXTENSION_NAME}] Ошибка /времядебаг:`,
                    error
                );

                return `Ошибка: ${error.message}`;
            }
        },
        'Показать внутренние значения времени'
    );

    // =========================================================
    // Initialization
    // =========================================================

    try {
        const current = getCurrentTime();

        // Нормализуем существующие переменные.
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
```
