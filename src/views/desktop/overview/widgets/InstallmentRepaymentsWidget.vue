<template>
    <v-card class="overview-widget installment-widget h-100" :class="{ disabled: loading }">
        <template #title>
            <overview-widget-header :title="title || tt('Installment Repayments')" :icon="mdiCreditCardClockOutline">
                <v-btn density="compact" color="default" variant="text" :aria-label="tt('More')" :icon="true">
                    <v-icon :icon="mdiDotsVertical" />
                    <v-menu activator="parent">
                        <v-list>
                            <v-list-item :prepend-icon="mdiClipboardTextClockOutline" to="/schedule/list">
                                <v-list-item-title>{{ tt('Scheduled Transactions') }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-btn>
            </overview-widget-header>
        </template>

        <v-card-text class="overview-widget__body mt-2">
            <template v-if="!loading || scheduledRepayments.length">
                <div class="overview-widget__caption text-body-medium" v-if="!scheduledRepayments.length">
                    {{ tt('No installment found. Add monthly scheduled expenses with an end date to see them here.') }}
                </div>
                <template v-else>
                    <div class="d-flex flex-wrap align-baseline" style="column-gap: 16px; row-gap: 4px">
                        <div>
                            <span class="overview-widget__caption text-body-medium me-2">{{ tt('Remaining') }}</span>
                            <span class="overview-widget__amount text-title-large">{{ displayRemaining }}</span>
                        </div>
                        <div class="overview-widget__caption text-body-medium" v-if="lastEndMonthText">
                            {{ tt('Ends') }} {{ lastEndMonthText }}
                        </div>
                    </div>

                    <div class="installment-widget__chart mt-4" role="img" :aria-label="chartAriaLabel">
                        <div class="installment-widget__bar-column" :key="`${item.year}-${item.month}`" v-for="item in projection">
                            <span class="installment-widget__bar-value text-body-small">{{ item.shortAmount }}</span>
                            <div class="installment-widget__bar" :class="{ 'installment-widget__bar--max': item.isMax }"
                                 :style="{ height: `${item.heightPercent}%` }"></div>
                        </div>
                    </div>
                    <div class="installment-widget__labels overview-widget__caption text-body-small mt-1">
                        <span :key="`${item.year}-${item.month}`" v-for="item in projection">{{ item.label }}</span>
                    </div>
                </template>
            </template>
            <v-skeleton-loader class="skeleton-no-margin" type="heading, image" :loading="true" v-else />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import OverviewWidgetHeader from './OverviewWidgetHeader.vue';

import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useSettlementWidgetBase } from '@/views/base/overview/SettlementWidgetBase.ts';

import { parseBigDecimal } from '@/lib/numeral.ts';
import { getYearMonthDayDateTime } from '@/lib/datetime.ts';
import { getMonthlyRepaymentProjection, getRemainingRepayment, getLastRepaymentEndDate } from '@/lib/installment.ts';

import {
    mdiCreditCardClockOutline,
    mdiClipboardTextClockOutline,
    mdiDotsVertical
} from '@mdi/js';

interface ProjectionDisplayItem {
    year: number;
    month: number;
    label: string;
    shortAmount: string;
    heightPercent: number;
    isMax: boolean;
}

const PROJECTION_MONTHS = 12;

defineProps<{
    loading: boolean;
    title?: string;
}>();

const {
    tt,
    formatAmountToLocalizedNumeralsWithCurrency,
    getCurrentLanguageTag,
    formatDateTimeToGregorianLikeShortMonth,
    formatDateTimeToGregorianLikeLongYearMonth
} = useI18n();

const { defaultCurrency, today, scheduledRepayments } = useSettlementWidgetBase();

const todayParts = computed<number[]>(() => today.value.split('-').map(part => parseInt(part, 10)));

const rawProjection = computed(() => getMonthlyRepaymentProjection(scheduledRepayments.value, todayParts.value[0] as number, todayParts.value[1] as number, PROJECTION_MONTHS));

const projection = computed<ProjectionDisplayItem[]>(() => {
    const max = Math.max(0, ...rawProjection.value.map(item => item.amount));

    return rawProjection.value.map(item => ({
        year: item.year,
        month: item.month,
        label: formatDateTimeToGregorianLikeShortMonth(getYearMonthDayDateTime(item.year, item.month, 1)),
        shortAmount: item.amount > 0 ? formatShortAmount(item.amount) : '',
        heightPercent: max > 0 ? Math.max(item.amount > 0 ? 4 : 0, Math.round(item.amount / max * 100)) : 0,
        isMax: max > 0 && item.amount === max
    }));
});

const displayRemaining = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(parseBigDecimal(getRemainingRepayment(scheduledRepayments.value, today.value)), defaultCurrency.value));

const lastEndMonthText = computed<string>(() => {
    const endDate = getLastRepaymentEndDate(scheduledRepayments.value, today.value);

    if (!endDate) {
        return '';
    }

    const [year, month] = endDate.split('-').map(part => parseInt(part, 10));
    return formatDateTimeToGregorianLikeLongYearMonth(getYearMonthDayDateTime(year as number, month as number, 1));
});

const chartAriaLabel = computed<string>(() => projection.value
    .map(item => `${item.label} ${formatAmountToLocalizedNumeralsWithCurrency(parseBigDecimal(rawProjection.value.find(raw => raw.year === item.year && raw.month === item.month)?.amount ?? 0), defaultCurrency.value)}`)
    .join(', '));

// amounts are stored in hundredths; show them compactly above the bars (e.g. "385만" in Korean, "3.9M" in English)
function formatShortAmount(amount: number): string {
    try {
        return new Intl.NumberFormat(getCurrentLanguageTag(), { notation: 'compact', maximumFractionDigits: 1 }).format(amount / 100);
    } catch {
        return String(Math.round(amount / 100));
    }
}
</script>

<style>
.installment-widget__chart {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 6px;
    align-items: end;
    height: 140px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.installment-widget__bar-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    height: 100%;
    min-width: 0;
}

.installment-widget__bar-value {
    white-space: nowrap;
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
}

.installment-widget__bar {
    width: 100%;
    max-width: 32px;
    border-radius: 4px 4px 0 0;
    background-color: rgba(var(--v-theme-primary), 0.55);
}

.installment-widget__bar--max {
    background-color: rgb(var(--v-theme-primary));
}

.installment-widget__labels {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 6px;
    text-align: center;
}
</style>
