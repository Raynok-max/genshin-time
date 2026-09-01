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

    function getCurrentTime() {
        const variables = context.variables.local;

        let totalMinutes = Number(variables.get('Время'));

        if (!Number.isFinite(totalMinutes)) {
            totalMinutes = 0;
        }

        totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
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

    // =========================================================
    // /время
    // =========================================================

    context.registerSlashCommand(
        'время',
        function (namedArgs, unnamedArgs) {
            const result = changeTime(unnamedArgs);

            if (typeof toastr !== 'undefined') {
                if (result.startsWith('Ошибка')) {
                    toastr.error(result);
                } else {
                    toastr.success('Игровое время: ' + result);
                }
            }

            return result;
        },
        [],
        'Добавить указанное количество минут к игровому времени',
        true,
        true
    );

    // =========================================================
    // /прошловремени
    // =========================================================

    context.registerSlashCommand(
        'прошловремени',
        function (namedArgs, unnamedArgs) {
            const result = changeTime(unnamedArgs);

            if (typeof toastr !== 'undefined') {
                if (result.startsWith('Ошибка')) {
                    toastr.error(result);
                } else {
                    toastr.success('Игровое время: ' + result);
                }
            }

            return result;
        },
        [],
        'Указать, сколько игровых минут прошло',
        true,
        true
    );

    // =========================================================
    // /установитьвремя
    // =========================================================

    context.registerSlashCommand(
        'установитьвремя',
        function (namedArgs, unnamedArgs) {
            const result = setExactTime(unnamedArgs);

            if (typeof toastr !== 'undefined') {
                if (result.startsWith('Ошибка')) {
                    toastr.error(result);
                } else {
                    toastr.success(
                        'Игровое время установлено: ' + result
                    );
                }
            }

            return result;
        },
        [],
        'Установить точное игровое время в формате ЧЧ:ММ',
        true,
        true
    );

    // =========================================================
    // /текущеевремя
    // =========================================================

    context.registerSlashCommand(
        'текущеевремя',
        function () {
            const result = getCurrentTime();

            if (typeof toastr !== 'undefined') {
                toastr.info(
                    'Текущее игровое время: ' + result
                );
            }

            return result;
        },
        [],
        'Показать текущее игровое время',
        true,
        true
    );

    // =========================================================
    // АВТОМАТИКА ДЛЯ ИИ
    //
    // ИИ пишет в своём ответе:
    //
    // [TIME:25]
    //
    // Расширение автоматически добавляет 25 минут.
    // =========================================================

    function processAIMessage(messageId) {
        try {
            const chat = context.chat;

            if (!chat || !chat[messageId]) {
                return;
            }

            const message = chat[messageId];

            // Не трогаем пользовательские сообщения.
            if (message.is_user) {
                return;
            }

            if (message.is_system) {
                return;
            }

            const text = String(message.mes ?? '');

            // Ищем [TIME:число]
            const match = text.match(/\[TIME:\s*(\d+)\s*\]/i);

            if (!match) {
                return;
            }

            const minutes = Number(match[1]);

            if (!Number.isFinite(minutes)) {
                return;
            }

            const result = changeTime(minutes);

            console.log(
                '[Genshin RPG Time] AI:',
                `прошло ${minutes} мин.`,
                `новое время ${result}`
            );

            if (typeof toastr !== 'undefined') {
                toastr.info(
                    `ИИ: +${minutes} мин. → ${result}`
                );
            }

        } catch (error) {
            console.error(
                '[Genshin RPG Time] Ошибка обработки ответа ИИ:',
                error
            );
        }
    }

    // =========================================================
    // Подключаемся к событию получения сообщения
    // =========================================================

    if (
        context.eventSource &&
        context.event_types &&
        context.event_types.MESSAGE_RECEIVED
    ) {
        context.eventSource.on(
            context.event_types.MESSAGE_RECEIVED,
            processAIMessage
        );

        console.log(
            '[Genshin RPG Time] Автоматическое время ИИ включено'
        );
    } else {
        console.error(
            '[Genshin RPG Time] MESSAGE_RECEIVED недоступен'
        );
    }

    console.log('[Genshin RPG Time] Загружено');
})();
