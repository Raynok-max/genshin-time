import { registerSlashCommand, executeSlashCommands } from '../../../slash-commands.js';

const COMMAND_NAME = 'genshin-time';
const ALIASES = ['время'];

function normalizeMinutes(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const rounded = Math.trunc(n);
    return ((rounded % 1440) + 1440) % 1440;
}

async function getLocalVar(name) {
    const result = await executeSlashCommands(`/getvar ${name}`);
    const value = result?.pipe;
    return value === undefined || value === null || value === '' ? 0 : Number(value);
}

async function setLocalVar(name, value) {
    const result = await executeSlashCommands(`/setvar key=${name} ${value}`);
    if (result?.isError) {
        throw new Error(result.errorMessage || `Не удалось установить переменную ${name}`);
    }
}

async function timeCallback(_args, value) {
    const delta = Number(String(value ?? '').trim());

    if (!Number.isFinite(delta)) {
        throw new Error('Использование: /время 30');
    }

    const currentRaw = await getLocalVar('Время');
    const current = Number.isFinite(currentRaw) ? currentRaw : 0;

    const total = normalizeMinutes(current + Math.trunc(delta));
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    await setLocalVar('Время', total);
    await setLocalVar('Часы', hours);
    await setLocalVar('Минуты', minutes);

    return display;
}

registerSlashCommand(
    COMMAND_NAME,
    timeCallback,
    ALIASES,
    'Изменяет игровое время в переменной «Время» (минуты от 00:00), обновляет «Часы» и «Минуты». Пример: /время 30 или /genshin-time 90.',
    true,
    true,
);
