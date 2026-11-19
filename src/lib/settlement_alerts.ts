import type { ScheduledRepayment } from '@/lib/installment.ts';

export type SettlementAlertLevel = 'error' | 'warning' | 'info';

export type SettlementAlert =
    | { readonly kind: 'creditLineAlmostUsed', readonly level: SettlementAlertLevel, readonly accountId: string, readonly accountName: string, readonly usedPercent: number, readonly remaining: number, readonly currency: string }
    | { readonly kind: 'shortRunway', readonly level: SettlementAlertLevel, readonly months: number }
    | { readonly kind: 'installmentShareOfDeficit', readonly level: SettlementAlertLevel, readonly percent: number }
    | { readonly kind: 'installmentEndingSoon', readonly level: SettlementAlertLevel, readonly name: string, readonly endDate: string };

export interface SettlementCreditLine {
    readonly accountId: string;
    readonly accountName: string;
    readonly usedPercent: number;
    readonly remaining: number;
    readonly currency: string;
}

export interface SettlementAlertInput {
    readonly creditLines: SettlementCreditLine[];
    readonly runwayMonths: number | null;
    // repayment of installments in the current month and the average monthly deficit, both in the default currency
    readonly monthlyInstallment: number;
    readonly averageMonthlyDeficit: number;
    readonly repayments: ScheduledRepayment[];
    readonly today: string;
}

export const CREDIT_LINE_USAGE_ALERT_PERCENT = 90;
export const RUNWAY_ERROR_MONTHS = 3;
export const RUNWAY_WARNING_MONTHS = 6;
export const INSTALLMENT_SHARE_WARNING_PERCENT = 50;
export const INSTALLMENT_ENDING_SOON_MONTHS = 2;

const LEVEL_ORDER: Record<SettlementAlertLevel, number> = { error: 0, warning: 1, info: 2 };

function monthIndex(date: string): number {
    const [year, month] = date.split('-').map(part => parseInt(part, 10));
    return (year as number) * 12 + (month as number);
}

export function getSettlementAlerts(input: SettlementAlertInput): SettlementAlert[] {
    const alerts: SettlementAlert[] = [];

    for (const creditLine of input.creditLines) {
        if (creditLine.usedPercent >= CREDIT_LINE_USAGE_ALERT_PERCENT) {
            alerts.push({ kind: 'creditLineAlmostUsed', level: 'error', ...creditLine });
        }
    }

    if (input.runwayMonths !== null && input.runwayMonths < RUNWAY_WARNING_MONTHS) {
        alerts.push({ kind: 'shortRunway', level: input.runwayMonths < RUNWAY_ERROR_MONTHS ? 'error' : 'warning', months: input.runwayMonths });
    }

    if (input.averageMonthlyDeficit > 0 && input.monthlyInstallment > 0) {
        const percent = Math.round(input.monthlyInstallment / input.averageMonthlyDeficit * 100);

        if (percent >= INSTALLMENT_SHARE_WARNING_PERCENT) {
            alerts.push({ kind: 'installmentShareOfDeficit', level: 'warning', percent: percent });
        }
    }

    const todayMonth = monthIndex(input.today);

    for (const repayment of input.repayments) {
        if (repayment.endDate <= input.today) {
            continue;
        }

        if (monthIndex(repayment.endDate) - todayMonth <= INSTALLMENT_ENDING_SOON_MONTHS) {
            alerts.push({ kind: 'installmentEndingSoon', level: 'info', name: repayment.name, endDate: repayment.endDate });
        }
    }

    return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
