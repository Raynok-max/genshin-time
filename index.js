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

    console.log('[Genshin RPG Time] Загружено');
})();
