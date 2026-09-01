(function () {
    'use strict';

    const context = SillyTavern.getContext();
    const MINUTES_PER_DAY = 1440;

    // =========================================================
    // ИЗМЕНЕНИЕ ИГРОВОГО ВРЕМЕНИ
    // =========================================================

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

        current = ((current % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;

        let newTime = current + value;

        newTime = ((newTime % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;

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

    // =========================================================
    // ПОЛУЧЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ
    // =========================================================

    function getCurrentTime() {
        const variables = context.variables.local;

        let totalMinutes = Number(variables.get('Время'));

        if (!Number.isFinite(totalMinutes)) {
            totalMinutes = 0;
        }

        totalMinutes = Math.floor(totalMinutes);

        totalMinutes = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY)
            % MINUTES_PER_DAY;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return (
            String(hours).padStart(2, '0') +
            ':' +
            String(minutes).padStart(2, '0')
        );
    }

    // =========================================================
    // УСТАНОВКА КОНКРЕТНОГО ВРЕМЕНИ
    // =========================================================

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
    // РАЗБОР ЕСТЕСТВЕННОГО ОПИСАНИЯ ВРЕМЕНИ
    // =========================================================

    function parseTimeValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        let text = String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');

        if (!text) {
            return null;
        }

        // -----------------------------------------------------
        // 1. Точное число минут
        //
        // 20
        // 45
        // 120
        // -----------------------------------------------------

        if (/^\d+$/.test(text)) {
            return Number(text);
        }

        // -----------------------------------------------------
        // 2. Часы и минуты
        //
        // 1ч
        // 2ч
        // 1ч 30м
        // 1ч30м
        // 45м
        // -----------------------------------------------------

        const compact = text.replace(/\s+/g, '');

        let total = 0;
        let found = false;

        const hoursMatch = compact.match(/(\d+(?:[.,]\d+)?)ч/);
        const minutesMatch = compact.match(/(\d+)м/);

        if (hoursMatch) {
            const hours = Number(
                hoursMatch[1].replace(',', '.')
            );

            if (!Number.isFinite(hours)) {
                return null;
            }

            total += hours * 60;
            found = true;
        }

        if (minutesMatch) {
            const minutes = Number(minutesMatch[1]);

            if (!Number.isFinite(minutes)) {
                return null;
            }

            total += minutes;
            found = true;
        }

        if (found) {
            return Math.round(total);
        }

        // -----------------------------------------------------
        // 3. Естественные формулировки
        // -----------------------------------------------------

        const phrases = [
            {
                patterns: [
                    'несколько секунд',
                    'несколько секунд',
                ],
                minutes: 0
            },
            {
                patterns: [
                    'мгновение',
                    'несколько мгновений',
                    'почти сразу',
                    'сразу'
                ],
                minutes: 0
            },
            {
                patterns: [
                    'пару минут',
                    'пара минут'
                ],
                minutes: 2
            },
            {
                patterns: [
                    'несколько минут'
                ],
                minutes: 5
            },
            {
                patterns: [
                    'около десяти минут',
                    'примерно десять минут'
                ],
                minutes: 10
            },
            {
                patterns: [
                    'около пятнадцати минут',
                    'примерно пятнадцать минут'
                ],
                minutes: 15
            },
            {
                patterns: [
                    'полчаса',
                    'пол часа',
                    'тридцать минут'
                ],
                minutes: 30
            },
            {
                patterns: [
                    'около часа',
                    'примерно час',
                    'час'
                ],
                minutes: 60
            },
            {
                patterns: [
                    'полтора часа',
                    'полтора часа'
                ],
                minutes: 90
            },
            {
                patterns: [
                    'несколько часов'
                ],
                minutes: 180
            },
            {
                patterns: [
                    'около двух часов',
                    'примерно два часа'
                ],
                minutes: 120
            },
            {
                patterns: [
                    'около трех часов',
                    'около трёх часов',
                    'примерно три часа'
                ],
                minutes: 180
            },
            {
                patterns: [
                    'полдня',
                    'пол дня'
                ],
                minutes: 360
            },
            {
                patterns: [
                    'весь день',
                    'целый день',
                    'практически весь день'
                ],
                minutes: 720
            },
            {
                patterns: [
                    'ночь',
                    'всю ночь',
                    'за ночь'
                ],
                minutes: 480
            }
        ];

        for (const phrase of phrases) {
            for (const pattern of phrase.patterns) {
                if (text.includes(pattern)) {
                    return phrase.minutes;
                }
            }
        }

        return null;
    }

    // =========================================================
    // SLASH /ВРЕМЯ
    // =========================================================

    context.registerSlashCommand(
        'время',
        function (namedArgs, unnamedArgs) {
            const result = changeTime(unnamedArgs);

            if (typeof toastr !== 'undefined') {
                if (result.startsWith('Ошибка')) {
                    toastr.error(result);
                } else {
                    toastr.success(
                        'Игровое время: ' + result
                    );
                }
            }

            return result;
        },
        [],
        'Добавить игровое время в минутах',
        true,
        true
    );

    // =========================================================
    // SLASH /ПРОШЛОВРЕМЕНИ
    // =========================================================

    context.registerSlashCommand(
        'прошловремени',
        function (namedArgs, unnamedArgs) {
            const result = changeTime(unnamedArgs);

            if (typeof toastr !== 'undefined') {
                if (result.startsWith('Ошибка')) {
                    toastr.error(result);
                } else {
                    toastr.success(
                        'Игровое время: ' + result
                    );
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
    // SLASH /УСТАНОВИТЬВРЕМЯ
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
        'Установить точное время ЧЧ:ММ',
        true,
        true
    );

    // =========================================================
    // SLASH /ТЕКУЩЕЕВРЕМЯ
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
    // АВТОМАТИКА ИИ
    //
    // Поддерживает:
    //
    // [TIME:20]
    // [TIME:1ч]
    // [TIME:1ч 30м]
    // [TIME:45м]
    // [TIME:несколько часов]
    // [TIME:полдня]
    // [TIME:весь день]
    // [TIME:ночь]
    // =========================================================

    function processAIMessage(messageId) {
        try {
            const chat = context.chat;

            if (!chat || !chat[messageId]) {
                return;
            }

            const message = chat[messageId];

            // Только сообщения ИИ
            if (message.is_user || message.is_system) {
                return;
            }

            let text = String(message.mes ?? '');

            // Ищем TIME-маркер
            const match = text.match(
                /\[TIME:\s*([^\]]+?)\s*\]/i
            );

            if (!match) {
                return;
            }

            const rawValue = match[1].trim();

            const minutes = parseTimeValue(rawValue);

            if (
                minutes === null ||
                !Number.isFinite(minutes) ||
                minutes < 0
            ) {
                console.warn(
                    '[Genshin RPG Time] Не удалось определить время:',
                    rawValue
                );

                if (typeof toastr !== 'undefined') {
                    toastr.warning(
                        'Не удалось определить время: ' +
                        rawValue
                    );
                }

                return;
            }

            // Изменяем игровое время
            const result = changeTime(minutes);

            // Удаляем TIME-маркер из сообщения
            text = text.replace(
                /\s*\[TIME:\s*[^\]]+?\s*\]\s*/gi,
                ''
            );

            // Убираем лишние пустые строки в конце
            text = text.replace(/\n{3,}/g, '\n\n').trim();

            message.mes = text;
            chat[messageId] = message;

            // Обновляем отображение сообщения
            const messageElement = document.querySelector(
                `.mes[mesid="${messageId}"] .mes_text`
            );

            if (messageElement) {
                messageElement.innerHTML = text;
            }

            // Сохраняем чат
            if (typeof context.saveChat === 'function') {
                context.saveChat();
            }

            if (typeof toastr !== 'undefined') {
                toastr.info(
                    `ИИ: +${minutes} мин. → ${result}`
                );
            }

            console.log(
                '[Genshin RPG Time]',
                `TIME "${rawValue}" = ${minutes} минут`,
                '→',
                result
            );

        } catch (error) {
            console.error(
                '[Genshin RPG Time] Ошибка обработки времени ИИ:',
                error
            );
        }
    }

    // =========================================================
    // ПОДКЛЮЧЕНИЕ К MESSAGE_RECEIVED
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
