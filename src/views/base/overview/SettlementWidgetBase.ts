import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';

import { useUserStore } from '@/stores/user.ts';
import { useAccountsStore } from '@/stores/account.ts';
import { useExchangeRatesStore } from '@/stores/exchangeRates.ts';
import { useTransactionTemplatesStore } from '@/stores/transactionTemplate.ts';
import { useOverviewStore } from '@/stores/overview.ts';

import type { BigDecimal } from '@/core/numeral.ts';
import { TransactionType } from '@/core/transaction.ts';
import { TemplateType, ScheduledTemplateFrequencyType } from '@/core/template.ts';
import { AccountType } from '@/core/account.ts';

import { LATEST_12MONTHS_TRANSACTION_AMOUNTS_REQUEST_TYPES } from '@/models/transaction.ts';

import { BIG_DECIMAL_ZERO, isBigDecimal, parseBigDecimal } from '@/lib/numeral.ts';
import { type RunwayMonthlyAmount, type RunwayResult, RUNWAY_COUNTED_MONTHS, calculateRunway } from '@/lib/runway.ts';
import { getCurrentDateTime, getYearMonthDayDateTime } from '@/lib/datetime.ts';
import { type ScheduledRepayment, parseScheduledDaysOfMonth, getMonthlyRepaymentProjection } from '@/lib/installment.ts';
import { type SettlementAlert, type SettlementAlertLevel, type SettlementCreditLine, getSettlementAlerts } from '@/lib/settlement_alerts.ts';

export interface SettlementDisplayAlert {
    readonly key: string;
    readonly level: SettlementAlertLevel;
    readonly text: string;
    readonly link?: string;
    readonly linkText?: string;
}

// Shared data for the settlement related overview widgets (installment repayments, alerts)
export function useSettlementWidgetBase() {
    const {
        tt,
        formatAmountToLocalizedNumeralsWithCurrency,
        formatNumberToLocalizedNumerals,
        formatDateTimeToGregorianLikeLongYearMonth
    } = useI18n();

    const userStore = useUserStore();
    const accountsStore = useAccountsStore();
    const exchangeRatesStore = useExchangeRatesStore();
    const transactionTemplatesStore = useTransactionTemplatesStore();
    const overviewStore = useOverviewStore();

    const defaultCurrency = computed<string>(() => userStore.currentUserDefaultCurrency);
    const today = computed<string>(() => getCurrentDateTime().getGregorianCalendarYearDashMonthDashDay());

    // Installment-like scheduled transactions: visible monthly scheduled expenses with an end date,
    // with amounts converted to the default currency
    const scheduledRepayments = computed<ScheduledRepayment[]>(() => {
        const templates = transactionTemplatesStore.allVisibleTemplates[TemplateType.Schedule.type] || [];
        const ret: ScheduledRepayment[] = [];

        for (const template of templates) {
            if (template.type !== TransactionType.Expense ||
                template.scheduledFrequencyType !== ScheduledTemplateFrequencyType.Monthly.type ||
                !template.scheduledEndDate) {
                continue;
            }

            const daysOfMonth = parseScheduledDaysOfMonth(template.scheduledFrequency);

            if (!daysOfMonth.length) {
                continue;
            }

            const account = accountsStore.allAccountsMap[template.sourceAccountId];
            let amount = template.sourceAmount;

            if (account && account.currency !== defaultCurrency.value) {
                const exchanged = exchangeRatesStore.getExchangedAmount(parseBigDecimal(template.sourceAmount), account.currency, defaultCurrency.value);

                if (!exchanged) {
                    continue;
                }

                amount = exchanged.truncate().toSafeIntegerNumber();
            }

            ret.push({
                id: template.id,
                name: template.name,
                amount: amount,
                daysOfMonth: daysOfMonth,
                startDate: template.scheduledStartDate,
                endDate: template.scheduledEndDate
            });
        }

        return ret;
    });

    const availableFunds = computed<BigDecimal>(() => {
        const funds = accountsStore.getAvailableFunds(true);

        if (isBigDecimal(funds)) {
            return funds;
        } else if (typeof funds === 'object' && isBigDecimal(funds.value)) {
            return funds.value;
        }

        return BIG_DECIMAL_ZERO;
    });

    // income and expense of the last completed months, excluding the current (partial) month
    const countedMonthlyAmounts = computed<RunwayMonthlyAmount[]>(() => {
        const ret: RunwayMonthlyAmount[] = [];
        const transactionOverview = overviewStore.transactionOverview;

        if (!transactionOverview || !transactionOverview.thisMonth || !transactionOverview.thisMonth.valid) {
            return ret;
        }

        const completedMonthTypes = LATEST_12MONTHS_TRANSACTION_AMOUNTS_REQUEST_TYPES.slice(0, -1).slice(-RUNWAY_COUNTED_MONTHS);

        for (const requestType of completedMonthTypes) {
            const item = transactionOverview[requestType];

            if (!item) {
                continue;
            }

            ret.push({
                incomeAmount: item.incomeAmount || BIG_DECIMAL_ZERO,
                expenseAmount: item.expenseAmount || BIG_DECIMAL_ZERO
            });
        }

        return ret;
    });

    const runway = computed<RunwayResult>(() => calculateRunway(availableFunds.value, countedMonthlyAmounts.value));

    const creditLines = computed<SettlementCreditLine[]>(() => {
        const ret: SettlementCreditLine[] = [];

        for (const account of accountsStore.allAccounts) {
            if (account.hidden || !account.isLiability || !account.canSetLimit || account.type !== AccountType.SingleAccount.type || account.numericCreditCardLimit <= 0) {
                continue;
            }

            const limit = account.numericCreditCardLimit;
            const used = -account.numericBalance;

            ret.push({
                accountId: account.id,
                accountName: account.name,
                usedPercent: Math.round(used / limit * 100),
                remaining: limit - used,
                currency: account.currency
            });
        }

        return ret;
    });

    const alerts = computed<SettlementAlert[]>(() => {
        const todayParts = today.value.split('-').map(part => parseInt(part, 10));
        const thisMonth = getMonthlyRepaymentProjection(scheduledRepayments.value, todayParts[0] as number, todayParts[1] as number, 1)[0];

        return getSettlementAlerts({
            creditLines: creditLines.value,
            runwayMonths: runway.value.months,
            monthlyInstallment: thisMonth ? thisMonth.amount : 0,
            averageMonthlyDeficit: runway.value.averageMonthlyDeficit.toSafeIntegerNumber(),
            repayments: scheduledRepayments.value,
            today: today.value
        });
    });

    const displayAlerts = computed<SettlementDisplayAlert[]>(() => alerts.value.map((alert, index) => {
        const key = `${alert.kind}-${index}`;

        switch (alert.kind) {
            case 'creditLineAlmostUsed':
                return {
                    key,
                    level: alert.level,
                    text: tt('format.misc.creditLineAlmostUsedAlert', {
                        name: alert.accountName,
                        percent: formatNumberToLocalizedNumerals(alert.usedPercent),
                        remaining: formatAmountToLocalizedNumeralsWithCurrency(parseBigDecimal(alert.remaining), alert.currency)
                    }),
                    link: '/account/list',
                    linkText: tt('View Accounts')
                };
            case 'shortRunway':
                return {
                    key,
                    level: alert.level,
                    text: tt('format.misc.shortRunwayAlert', { months: formatNumberToLocalizedNumerals(alert.months, 2) })
                };
            case 'installmentShareOfDeficit':
                return {
                    key,
                    level: alert.level,
                    text: tt('format.misc.installmentShareOfDeficitAlert', { percent: formatNumberToLocalizedNumerals(alert.percent) }),
                    link: '/schedule/list',
                    linkText: tt('Scheduled Transactions')
                };
            case 'installmentEndingSoon': {
                const [year, month] = alert.endDate.split('-').map(part => parseInt(part, 10));
                return {
                    key,
                    level: alert.level,
                    text: tt('format.misc.installmentEndingSoonAlert', {
                        name: alert.name,
                        month: formatDateTimeToGregorianLikeLongYearMonth(getYearMonthDayDateTime(year as number, month as number, 1))
                    })
                };
            }
        }
    }));

    return {
        defaultCurrency,
        today,
        scheduledRepayments,
        availableFunds,
        countedMonthlyAmounts,
        runway,
        displayAlerts
    };
}
