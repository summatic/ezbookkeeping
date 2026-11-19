import { describe, expect, it } from 'vitest';

import { getSettlementAlerts } from '@/lib/settlement_alerts.ts';

describe('getSettlementAlerts', () => {
    it('should report almost used credit lines, short runway, installment share and installments ending soon', () => {
        const alerts = getSettlementAlerts({
            creditLines: [
                { accountId: '1', accountName: 'Woori', usedPercent: 98, remaining: 31927200, currency: 'KRW' },
                { accountId: '2', accountName: 'Hana', usedPercent: 51, remaining: 2089204300, currency: 'KRW' }
            ],
            runwayMonths: 4.23,
            monthlyInstallment: 385471400,
            averageMonthlyDeficit: 522786600,
            repayments: [
                { id: 'a', name: 'airline', amount: 1, daysOfMonth: [25], endDate: '2027-01-25' },
                { id: 'b', name: 'hotel', amount: 1, daysOfMonth: [12], endDate: '2027-09-12' },
                { id: 'c', name: 'done', amount: 1, daysOfMonth: [1], endDate: '2026-10-01' }
            ],
            today: '2026-11-19'
        });

        expect(alerts.map(alert => [alert.kind, alert.level])).toEqual([
            ['creditLineAlmostUsed', 'error'],
            ['shortRunway', 'warning'],
            ['installmentShareOfDeficit', 'warning'],
            ['installmentEndingSoon', 'info']
        ]);
        expect(alerts[2]).toMatchObject({ percent: 74 });
        expect(alerts[3]).toMatchObject({ name: 'airline' });
    });

    it('should return no alert when everything is fine', () => {
        expect(getSettlementAlerts({
            creditLines: [],
            runwayMonths: null,
            monthlyInstallment: 0,
            averageMonthlyDeficit: 0,
            repayments: [],
            today: '2026-11-19'
        })).toEqual([]);
    });

    it('should raise the runway alert to error under 3 months', () => {
        const alerts = getSettlementAlerts({ creditLines: [], runwayMonths: 2.5, monthlyInstallment: 0, averageMonthlyDeficit: 1, repayments: [], today: '2026-11-19' });
        expect(alerts).toEqual([{ kind: 'shortRunway', level: 'error', months: 2.5 }]);
    });
});
