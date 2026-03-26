const fallback = <T>(a: T | undefined | null, b?: T | null, c?: T) => {
    if (a !== undefined && a !== null) {
        return a;
    }
    if (b !== undefined && b !== null) {
        return b;
    }
    return c;
};

const queryToBoolean = (value?: string | string[] | null) => {
    if (value === undefined || value === null) {
        return value;
    }

    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized === undefined) {
        return undefined;
    }

    return !['0', 'false'].includes(normalized.toLowerCase());
};

const queryToInteger = (value?: string | string[] | null) => {
    if (value === undefined || value === null) {
        return value;
    }

    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized === undefined) {
        return undefined;
    }

    return Number.parseInt(normalized, 10);
};

export { fallback, queryToBoolean, queryToInteger };
