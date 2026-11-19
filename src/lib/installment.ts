// Projects repayments of installment-like scheduled transactions: monthly scheduled expenses that have an end date.
// All dates are calendar dates in 'YYYY-MM-DD' format and amounts are already in the same currency.

export interface ScheduledRepayment {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    // days of month the scheduled transaction is created on
    readonly daysOfMonth: number[];
    readonly startDate?: string;
    readonly endDate: string;
}

export interface MonthlyRepaymentTotal {
    readonly year: number;
    readonly month: number;
    readonly amount: number;
}

interface CalendarDate {
    readonly year: number;
    readonly month: number;
    readonly day: number;
}

function parseCalendarDate(value: string | undefined): CalendarDate | null {
    if (!value) {
        return null;
    }

    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);

    if (!match) {
        return null;
    }

    return { year: parseInt(match[1] as string, 10), month: parseInt(match[2] as string, 10), day: parseInt(match[3] as string, 10) };
}

function compareCalendarDate(a: CalendarDate, b: CalendarDate): number {
    return (a.year - b.year) || (a.month - b.month) || (a.day - b.day);
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(year: number, month: number, count: number): { year: number, month: number } {
    const index = year * 12 + (month - 1) + count;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// Parses the monthly frequency value of a scheduled transaction (comma separated days of month, e.g. "1,15")
export function parseScheduledDaysOfMonth(frequency: string | undefined): number[] {
    if (!frequency) {
        return [];
    }

    const days: number[] = [];

    for (const item of frequency.split(',')) {
        const day = parseInt(item.trim(), 10);

        if (Number.isInteger(day) && day >= 1 && day <= 31 && !days.includes(day)) {
            days.push(day);
        }
    }

    return days.sort((a, b) => a - b);
}

function getOccurrencesInMonth(item: ScheduledRepayment, year: number, month: number, after?: CalendarDate): number {
    const start = parseCalendarDate(item.startDate);
    const end = parseCalendarDate(item.endDate);

    if (!end) {
        return 0;
    }

    const daysInMonth = getDaysInMonth(year, month);
    let count = 0;

    for (const day of item.daysOfMonth) {
        if (day > daysInMonth) {
            continue;
        }

        const date: CalendarDate = { year, month, day };

        if ((start && compareCalendarDate(date, start) < 0) || compareCalendarDate(date, end) > 0) {
            continue;
        }

        if (after && compareCalendarDate(date, after) <= 0) {
            continue;
        }

        count++;
    }

    return count;
}

export function getMonthlyRepaymentProjection(items: ScheduledRepayment[], fromYear: number, fromMonth: number, monthCount: number): MonthlyRepaymentTotal[] {
    const ret: MonthlyRepaymentTotal[] = [];

    for (let i = 0; i < monthCount; i++) {
        const { year, month } = addMonths(fromYear, fromMonth, i);
        let amount = 0;

        for (const item of items) {
            amount += item.amount * getOccurrencesInMonth(item, year, month);
        }

        ret.push({ year, month, amount });
    }

    return ret;
}

// Returns the total of repayments scheduled after the given date
export function getRemainingRepayment(items: ScheduledRepayment[], today: string): number {
    const after = parseCalendarDate(today);

    if (!after) {
        return 0;
    }

    let total = 0;

    for (const item of items) {
        const end = parseCalendarDate(item.endDate);

        if (!end || compareCalendarDate(end, after) <= 0) {
            continue;
        }

        let current = { year: after.year, month: after.month };

        while (current.year < end.year || (current.year === end.year && current.month <= end.month)) {
            total += item.amount * getOccurrencesInMonth(item, current.year, current.month, after);
            current = addMonths(current.year, current.month, 1);
        }
    }

    return total;
}

// Returns the latest end date among the repayments that are not finished yet, or null if all of them are finished
export function getLastRepaymentEndDate(items: ScheduledRepayment[], today: string): string | null {
    const after = parseCalendarDate(today);
    let last: { value: string, date: CalendarDate } | null = null;

    for (const item of items) {
        const end = parseCalendarDate(item.endDate);

        if (!end || (after && compareCalendarDate(end, after) <= 0)) {
            continue;
        }

        if (!last || compareCalendarDate(end, last.date) > 0) {
            last = { value: item.endDate, date: end };
        }
    }

    return last ? last.value : null;
}
