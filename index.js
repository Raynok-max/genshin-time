// Genshin RPG Time
// SillyTavern 1.18.0

(function () {
    'use strict';

    const EXTENSION_NAME = 'Genshin RPG Time';

    // ---------------------------------------------------------
    // Получаем контекст SillyTavern
    // ---------------------------------------------------------

    function getContext() {
        return SillyTavern.getContext();
    }

    // ---------------------------------------------------------
    // Выполнение встроенной slash-команды
    // ---------------------------------------------------------

    async function executeCommand(command) {
        const context = getContext();

        if (!context.executeSlashCommands) {
            throw new Error(
                'API executeSlashCommands не найдено в этой версии SillyTavern.'
            );
        }

        return await context.executeSlashCommands(command);
    }

    // ---------------------------------------------------------
    // Получить локальную переменную
    // ---------------------------------------------------------

    async function getVar(name) {
        const result = await executeCommand(`/getvar ${name}`);

        const number = Number(result);

        return Number.isFinite(number) ? number : 0;
    }

    // ---------------------------------------------------------
    // Установить локальную переменную
    // ---------------------------------------------------------

    async function setVar(name, value) {
        await executeCommand(`/setvar ${name} ${value}`);
    }

    // ---------------------------------------------------------
    // Нормализация времени
    //
    // 0     = 00:00
    // 60    = 01:00
    // 720   = 12:00
    // 1439  = 23:59
    // ---------------------------------------------------------

    function normalizeTime(value) {
        value = Math.floor(Number(value));

        if (!Number.isFinite(value)) {
            value = 0;
        }

        return ((value % 1440) + 1440) % 1440;
    }

    // ---------------------------------------------------------
    // Сохранить время
    // ---------------------------------------------------------

    async function saveTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        await setVar('Время', totalMinutes);
        await setVar('Часы', hours);
        await setVar('Минуты', minutes);

        return {
            total: totalMinutes,
            hours,
            minutes,
            formatted:
                String(hours).padStart(2, '0') +
                ':' +
                String(minutes).padStart(2, '0')
        };
    }

    // ---------------------------------------------------------
    // Получить текущее время
    // ---------------------------------------------------------

    async function getCurrentTime() {
        return normalizeTime(await getVar('Время'));
    }

    // ---------------------------------------------------------
    // Форматирование времени
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // Парсер длительности
    //
    // 30
    // +30
    // -30
    // 2ч
    // +2ч
    // 30м
    // 1ч30м
    // +1ч30м
    // -1ч30м
    // ---------------------------------------------------------

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

        // Обычное число = минуты

        if (/^[+-]?\d+$/.test(text)) {
            const value = Number(text);

            return Number.isFinite(value) ? value : null;
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

    // ---------------------------------------------------------
    // Парсер ЧЧ:ММ
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // Изменить время
    // ---------------------------------------------------------

    async function changeTime(amount) {
        const current = await getCurrentTime();
        return await saveTime(current + amount);
    }

    // ---------------------------------------------------------
    // Регистрация slash-команд
    // ---------------------------------------------------------

    function registerCommand(name, callback, help) {
        const context = getContext();

        if (
            typeof context.registerSlashCommand !== 'function'
        ) {
            console.error(
                `[${EXTENSION_NAME}] ` +
                'registerSlashCommand отсутствует.'
            );
            return;
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
    // =========================================================

    registerCommand(
        'время',
        async (args) => {
            try {
                const value = String(args || '').trim();

                // /время
                if (!value) {
                    return formatTime(await getCurrentTime());
                }

                const duration = parseDuration(value);

                if (
                    duration === null ||
                    !Number.isFinite(duration)
                ) {
                    return (
                        'Ошибка. Примеры: ' +
                        '/время 30, /время -15, ' +
                        '/время +2ч, /время +1ч30м'
                    );
                }

                const result = await changeTime(duration);

                return result.formatted;

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
                        'Ошибка. Нужно положительное время. ' +
                        'Например: /прошловремени 30'
                    );
                }

                const result = await changeTime(duration);

                return result.formatted;

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
    // =========================================================

    registerCommand(
        'установитьвремя',
        async (args) => {
            try {
                const value = String(args || '').trim();

                const totalMinutes = parseClockTime(value);

                if (totalMinutes === null) {
                    return (
                        'Ошибка. Используй формат ЧЧ:ММ. ' +
                        'Например: /установитьвремя 18:30'
                    );
                }

                const result = await saveTime(totalMinutes);

                return result.formatted;

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
                return formatTime(
                    await getCurrentTime()
                );
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
                const total = await getCurrentTime();

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
        'Показать значения переменных времени'
    );

    console.log(
        `[${EXTENSION_NAME}] Загружено.`
    );

})();
