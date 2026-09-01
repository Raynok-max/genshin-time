(function () {
    'use strict';

    const context = SillyTavern.getContext();
    const MINUTES_PER_DAY = 1440;

    // ---------------------------------------------------------
    // Получение локальной переменной
    // ---------------------------------------------------------

    function getVar(name) {
        return context.variables.local.get(name);
    }

    // ---------------------------------------------------------
    // Запись локальной переменной
    // ---------------------------------------------------------

    function setVar(name, value) {
        context.variables.local.set(name, value);
    }

    // ---------------------------------------------------------
    // Нормализация времени: всегда 0...1439
    // ---------------------------------------------------------

    function normalizeTime(value) {
        value = Math.floor(Number(value));

        if (!Number.isFinite(value)) {
            value = 0;
        }

        return ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;
    }

    // ---------------------------------------------------------
    // Получить текущее игровое время
    // ---------------------------------------------------------

    function getCurrentTime() {
        return normalizeTime(getVar('Время'));
    }

    // ---------------------------------------------------------
    // Сохранить время во все три переменные
    // ---------------------------------------------------------

    function saveTime(totalMinutes) {
        totalMinutes = normalizeTime(totalMinutes);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        setVar('Время', totalMinutes);
        setVar('Часы', hours);
        setVar('Минуты', minutes);

        return {
            total: totalMinutes,
            hours: hours,
            minutes: minutes
        };
    }

    // ---------------------------------------------------------
    // Красивый вывод ЧЧ:ММ
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
    // Разбор количества времени
    //
    // 30       -> 30 минут
    // -15      -> -15 минут
    // +60      -> +60 минут
    // 2ч       -> 120 минут
    // 45м      -> 45 минут
    // 1ч30м    -> 90 минут
    // +1ч30м   -> 90 минут
    // -1ч30м   -> -90 минут
    // ---------------------------------------------------------

    function parseDuration(input) {
        let text = String(input ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

        if (!text) {
            return null;
        }

        // Обычное число = минуты
        if (/^[+-]?\d+$/.test(text)) {
            const value = Number(text);

            return Number.isFinite(value)
                ? value
                : null;
        }

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

        let total = 0;
        let found = false;

        // Часы
        const hoursMatch = text.match(/(\d+(?:\.\d+)?)ч/);

        if (hoursMatch) {
            const hours = Number(hoursMatch[1]);

            if (!Number.isFinite(hours)) {
                return null;
            }

            total += hours * 60;
            found = true;
        }

        // Минуты
        const minutesMatch = text.match(/(\d+)м/);

        if (minutesMatch) {
            const minutes = Number(minutesMatch[1]);

            if (!Number.isFinite(minutes)) {
                return null;
            }

            total += minutes;
            found = true;
        }

        if (!found) {
            return null;
        }

        return sign * total;
    }

    // ---------------------------------------------------------
    // Изменить время
    // ---------------------------------------------------------

    function changeTime(amount) {
        const current = getCurrentTime();
        return saveTime(current + amount);
    }

    // =========================================================
    // /время
    //
    // /время 30
    // /время -15
    // /время +60
    // /время +2ч
    // /время +1ч30м
    // /время 45м
    //
    // Если аргумент не указан:
    // /время
    //
    // просто показывает текущее время.
    // =========================================================

    context.registerSlashCommand(
        'время',
        function (namedArgs, unnamedArgs) {

            const value = String(
                unnamedArgs ?? ''
            ).trim();

            // Без аргумента — показать время
            if (!value) {
                return formatTime(
                    getCurrentTime()
                );
            }

            const duration = parseDuration(value);

            if (
                duration === null ||
                !Number.isFinite(duration)
            ) {
                return (
                    'Ошибка. Используй: ' +
                    '/время 30, ' +
                    '/время -15, ' +
                    '/время +2ч или ' +
                    '/время +1ч30м'
                );
            }

            const result = changeTime(duration);

            return result
                ? formatTime(result.total)
                : 'Ошибка изменения времени.';
        },
        [],
        'Изменить игровое время',
        true,
        true
    );

    console.log(
        '[Genshin RPG Time] /время загружена'
    );

})();
```
