(function () {
    'use strict';

    const context = SillyTavern.getContext();

    context.registerSlashCommand(
        'время',
        function (namedArgs, unnamedArgs) {
            const value = Number(String(unnamedArgs ?? '').trim());

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
            const minutes = newTime % 60;

            variables.set('Время', newTime);
            variables.set('Часы', hours);
            variables.set('Минуты', minutes);

            return (
                String(hours).padStart(2, '0') +
                ':' +
                String(minutes).padStart(2, '0')
            );
        },
        [],
        'Изменить игровое время',
        true,
        true
    );

    console.log('[Genshin RPG Time] Загружено');
})();
