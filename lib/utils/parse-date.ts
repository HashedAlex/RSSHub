import dayjs from 'dayjs';

export const parseDate = (date: string | number | Date) => dayjs(date).toDate();
