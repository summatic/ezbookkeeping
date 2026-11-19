<template>
    <f7-list strong inset dividers class="no-margin-top margin-bottom">
        <f7-list-item group-title v-if="showTitle">
            <small>{{ title || tt('Installment Repayments') }}</small>
        </f7-list-item>
        <f7-list-item :title="tt('No installment found. Add monthly scheduled expenses with an end date to see them here.')"
                      v-if="!loading && !scheduledRepayments.length"></f7-list-item>
        <template v-else>
            <f7-list-item :title="tt('Remaining')" :after="loading ? '' : displayRemaining"
                          :footer="lastEndMonthText ? `${tt('Ends')} ${lastEndMonthText}` : ''"></f7-list-item>
            <f7-list-item :title="item.label" :after="item.amount" :key="item.key" v-for="item in projection"></f7-list-item>
        </template>
    </f7-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useSettlementWidgetBase } from '@/views/base/overview/SettlementWidgetBase.ts';

import { parseBigDecimal } from '@/lib/numeral.ts';
import { getYearMonthDayDateTime } from '@/lib/datetime.ts';
import { getMonthlyRepaymentProjection, getRemainingRepayment, getLastRepaymentEndDate } from '@/lib/installment.ts';

const PROJECTION_MONTHS = 6;

defineProps<{
    loading: boolean;
    title?: string;
    showTitle: boolean;
}>();

const { tt, formatAmountToLocalizedNumeralsWithCurrency, formatDateTimeToGregorianLikeLongYearMonth } = useI18n();
const { defaultCurrency, today, scheduledRepayments } = useSettlementWidgetBase();

function yearMonthText(year: number, month: number): string {
    return formatDateTimeToGregorianLikeLongYearMonth(getYearMonthDayDateTime(year, month, 1));
}

const projection = computed(() => {
    const [year, month] = today.value.split('-').map(part => parseInt(part, 10));

    return getMonthlyRepaymentProjection(scheduledRepayments.value, year as number, month as number, PROJECTION_MONTHS)
        .filter(item => item.amount > 0)
        .map(item => ({
            key: `${item.year}-${item.month}`,
            label: yearMonthText(item.year, item.month),
            amount: formatAmountToLocalizedNumeralsWithCurrency(parseBigDecimal(item.amount), defaultCurrency.value)
        }));
});

const displayRemaining = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(parseBigDecimal(getRemainingRepayment(scheduledRepayments.value, today.value)), defaultCurrency.value));
const lastEndMonthText = computed<string>(() => {
    const endDate = getLastRepaymentEndDate(scheduledRepayments.value, today.value);

    if (!endDate) {
        return '';
    }

    const [year, month] = endDate.split('-').map(part => parseInt(part, 10));
    return yearMonthText(year as number, month as number);
});
</script>
