import { describe, expect, it } from 'vitest';

import {
    type ScheduledRepayment,
    parseScheduledDaysOfMonth,
    getMonthlyRepaymentProjection,
    getRemainingRepayment,
    getLastRepaymentEndDate
} from '@/lib/installment.ts';

const hotel: ScheduledRepayment = { id: '1', name: 'hotel', amount: 191205, daysOfMonth: [12], startDate: '2026-10-12', endDate: '2027-09-12' };
const airline: ScheduledRepayment = { id: '2', name: 'airline', amount: 655700, daysOfMonth: [25], startDate: '2026-10-25', endDate: '2026-11-25' };

describe('parseScheduledDaysOfMonth', () => {
    it('should parse, dedupe and sort valid days', () => {
        expect(parseScheduledDaysOfMonth('15, 1,1,32,x')).toEqual([1, 15]);
        expect(parseScheduledDaysOfMonth(undefined)).toEqual([]);
    });
});

describe('getMonthlyRepaymentProjection', () => {
    it('should sum repayments per month within the start and end dates', () => {
        const projection = getMonthlyRepaymentProjection([hotel, airline], 2026, 11, 3);

        expect(projection).toEqual([
            { year: 2026, month: 11, amount: 191205 + 655700 },
            { year: 2026, month: 12, amount: 191205 },
            { year: 2027, month: 1, amount: 191205 }
        ]);
    });

    it('should skip days that do not exist in the month and cross year boundaries', () => {
        const item: ScheduledRepayment = { id: '3', name: 'x', amount: 100, daysOfMonth: [30], endDate: '2027-03-30' };
        const projection = getMonthlyRepaymentProjection([item], 2027, 1, 4);

        expect(projection.map(p => p.amount)).toEqual([100, 0, 100, 0]);
    });
});

describe('getRemainingRepayment', () => {
    it('should count only repayments after today', () => {
        // hotel: 2026-11-12 is past on 2026-11-19, so 2026-12 .. 2027-09 = 10 payments; airline: 2026-11-25 = 1 payment
        expect(getRemainingRepayment([hotel, airline], '2026-11-19')).toBe(191205 * 10 + 655700);
    });

    it('should return zero for finished repayments', () => {
        expect(getRemainingRepayment([airline], '2026-12-01')).toBe(0);
    });
});

describe('getLastRepaymentEndDate', () => {
    it('should return the latest end date of unfinished repayments', () => {
        expect(getLastRepaymentEndDate([hotel, airline], '2026-11-19')).toBe('2027-09-12');
        expect(getLastRepaymentEndDate([airline], '2026-12-01')).toBeNull();
    });
});
