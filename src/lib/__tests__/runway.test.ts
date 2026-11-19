import { describe, expect, it } from 'vitest';

import { parseBigDecimal } from '@/lib/numeral.ts';
import { calculateRunway } from '@/lib/runway.ts';

// amounts are stored in hundredths of the currency unit
function month(income: number, expense: number) {
    return { incomeAmount: parseBigDecimal(income * 100), expenseAmount: parseBigDecimal(expense * 100) };
}

describe('calculateRunway', () => {
    it('should divide available funds by the average monthly deficit', () => {
        // available funds 22,136,719 / average deficit of Aug-Oct 5,227,866 = 4.23 months
        const result = calculateRunway(parseBigDecimal(2213671900), [
            month(14189707, 14506398),
            month(8677537, 15628934),
            month(7679907, 16095417)
        ]);

        expect(result.averageMonthlyDeficit.toString()).toBe('522786600');
        expect(result.months).toBe(4.23);
        expect(result.countedMonths).toBe(3);
    });

    it('should return null months when there is no deficit', () => {
        const result = calculateRunway(parseBigDecimal(100000), [month(500, 300), month(500, 600)]);

        expect(result.averageMonthlyDeficit.toString()).toBe('-5000');
        expect(result.months).toBeNull();
    });

    it('should round the average deficit to a whole currency unit', () => {
        const result = calculateRunway(parseBigDecimal(100000), [month(0, 100), month(0, 100), month(0, 101)]);

        expect(result.averageMonthlyDeficit.toString()).toBe('10000');
    });

    it('should treat negative available funds as zero', () => {
        const result = calculateRunway(parseBigDecimal(-1000), [month(0, 100)]);

        expect(result.months).toBe(0);
    });

    it('should return null months when no month is given', () => {
        const result = calculateRunway(parseBigDecimal(1000), []);

        expect(result.months).toBeNull();
        expect(result.countedMonths).toBe(0);
    });
});
