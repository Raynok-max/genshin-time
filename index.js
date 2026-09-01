(function () {
    'use strict';

    const context = SillyTavern.getContext();

    function changeTime(minutes) {
        const value = Number(String(minutes ?? '').trim());

        if (!Number.isFinite(value)) {
            return 'Ошибка: укажи количество минут';
        }

        const variables = context.variables.local;

        let current = Number(variables.get('Время'));

        if (!Number.isFinite(current)) {
            current = 0;
        }

        current = ((current % 1440) + 1440) % 1440;

        let newTime = current + value;

        newTime = ((newTime % 1440) + 1440) % 1440;

        const hours = Math.floor(newTime / 60);
        const minutesPart = newTime % 60;

        variables.set('Время', newTime);
        variables.set('Часы', hours);
        variables.set('Минуты', minutesPart);

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutesPart).padStart(2, '0')
        );
    }

    function setExactTime(timeString) {
        const value = String(timeString ?? '').trim();

        const match = value.match(/^(\d{1,2}):(\d{1,2})$/);

        if (!match) {
            return 'Ошибка: используй формат ЧЧ:ММ, например 18:30';
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);

        if (
            !Number.isInteger(hours) ||
            !Number.isInteger(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {
            return 'Ошибка: время должно быть от 00:00 до 23:59';
        }

        const totalMinutes = hours * 60 + minutes;

        const variables = context.variables.local;

        variables.set('Время', totalMinutes);
        variables.set('Часы', hours);
        variables.set('Минуты', minutes);

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
        );
    }

    function getCurrentTime() {
        const variables = context.variables.local;

        let totalMinutes = Number(variables.get('Время'));

        if (!Number.isFinite(totalMinutes)) {
            totalMinutes = 0;
        }

        totalMinutes = Math.floor(totalMinutes);
        totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
        );
    }

    context.registerSlashCommand(
        'время',
        function (namedArgs, unnamedArgs) {
            return changeTime(unnamedArgs);
        },
        [],
        'Добавить указанное количество минут к игровому времени',
        true,
        true
    );

    context.registerSlashCommand(
        'прошловремени',
        function (namedArgs, unnamedArgs) {
            return changeTime(unnamedArgs);
        },
        [],
        'Указать, сколько игровых минут прошло',
        true,
        true
    );

    context.registerSlashCommand(
        'установитьвремя',
        function (namedArgs, unnamedArgs) {
            return setExactTime(unnamedArgs);
        },
        [],
        'Установить точное игровое время в формате ЧЧ:ММ',
        true,
        true
    );

    context.registerSlashCommand(
        'текущеевремя',
        function () {
            return getCurrentTime();
        },
        [],
        'Показать текущее игровое время',
        true,
        true
    );

    console.log('[Genshin RPG Time] Загружено');
})();
