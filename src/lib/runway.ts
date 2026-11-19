import type { BigDecimal } from '@/core/numeral.ts';

import { BIG_DECIMAL_ZERO } from '@/lib/numeral.ts';

// the number of most recent completed months used to average the monthly deficit
export const RUNWAY_COUNTED_MONTHS: number = 3;

export interface RunwayMonthlyAmount {
    readonly incomeAmount: BigDecimal;
    readonly expenseAmount: BigDecimal;
}

export interface RunwayResult {
    // average of (expense - income) over the counted months, positive means a deficit
    readonly averageMonthlyDeficit: BigDecimal;
    // how many months the available funds last at the average deficit, null when there is no deficit
    readonly months: number | null;
    readonly countedMonths: number;
}

// Calculates how many months the available funds last if the average monthly deficit of the given months continues
export function calculateRunway(availableFunds: BigDecimal, monthlyAmounts: RunwayMonthlyAmount[]): RunwayResult {
    if (!monthlyAmounts.length) {
        return {
            averageMonthlyDeficit: BIG_DECIMAL_ZERO,
            months: null,
            countedMonths: 0
        };
    }

    let totalDeficit: BigDecimal = BIG_DECIMAL_ZERO;

    for (const item of monthlyAmounts) {
        totalDeficit = totalDeficit.add(item.expenseAmount).subtract(item.incomeAmount);
    }

    const averageMonthlyDeficit = totalDeficit.divide(monthlyAmounts.length).truncate();

    if (!averageMonthlyDeficit.isPositive()) {
        return {
            averageMonthlyDeficit: averageMonthlyDeficit,
            months: null,
            countedMonths: monthlyAmounts.length
        };
    }

    const funds = availableFunds.isPositive() ? availableFunds : BIG_DECIMAL_ZERO;
    const months = Math.floor(funds.divide(averageMonthlyDeficit).toDoubleNumber() * 100) / 100;

    return {
        averageMonthlyDeficit: averageMonthlyDeficit,
        months: months,
        countedMonths: monthlyAmounts.length
    };
}
