import os from 'node:os';

import { parseDate } from '@/utils/parse-date';

const collapseWhitespace = (str?: string | null) => str?.replaceAll(/\s+/g, ' ').trim();

const convertDateToISO8601 = (date?: string | Date | number | null) => {
    if (!date) {
        return date;
    }

    if (typeof date !== 'object') {
        return parseDate(date).toISOString();
    }

    return date.toISOString();
};

const getLocalhostAddress = () => {
    const interfaces = os.networkInterfaces();

    return Object.keys(interfaces)
        .flatMap((name) => interfaces[name] ?? [])
        .filter((iface) => iface?.family === 'IPv4' && !iface.internal)
        .map((iface) => iface?.address)
        .filter(Boolean);
};

export { collapseWhitespace, convertDateToISO8601, getLocalhostAddress };
