type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const currentLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';

const shouldLog = (level: LogLevel) => levels[level] >= levels[currentLevel];
const write = (level: LogLevel, message: string) => {
    if (!shouldLog(level)) {
        return;
    }

    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
    if (level === 'error') {
        console.error(line);
    } else if (level === 'warn') {
        console.warn(line);
    } else {
        console.log(line);
    }
};

export default {
    debug: (message: string) => write('debug', message),
    info: (message: string) => write('info', message),
    warn: (message: string) => write('warn', message),
    error: (message: string) => write('error', message),
};
