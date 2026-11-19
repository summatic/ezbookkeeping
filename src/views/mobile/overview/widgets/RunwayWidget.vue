<template>
    <f7-list strong inset dividers class="no-margin-top margin-bottom">
        <f7-list-item group-title v-if="showTitle">
            <small>{{ title || tt('Runway') }}</small>
        </f7-list-item>
        <f7-list-item class="combined-item item-no-divider">
            <template #header>
                <div class="margin-bottom-half">{{ tt('Runway') }}</div>
            </template>
            <template #title>
                <span class="overview-widget-primary-amount skeleton-text" v-if="loading">0.00</span>
                <span class="overview-widget-primary-amount" v-else-if="runway.months !== null">{{ displayMonths }} {{ tt('months') }}</span>
                <span class="overview-widget-primary-amount" v-else>{{ tt('No deficit in the last 3 months') }}</span>
            </template>
            <template #footer>
                <span class="text-color-red" v-if="!loading && runOutMonthText">{{ tt('Funds run out around') }} {{ runOutMonthText }}</span>
            </template>
        </f7-list-item>
        <f7-list-item class="item-title-full-line">
            <template #footer>
                <div class="overview-transaction-footer default-text-color display-flex justify-content-space-between">
                    <span>{{ tt('Available funds') }}</span>
                    <span class="skeleton-text" v-if="loading">0.00 USD</span>
                    <span v-else>{{ displayAvailableFunds }}</span>
                </div>
                <div class="overview-transaction-footer default-text-color display-flex justify-content-space-between">
                    <span>{{ tt('Average monthly deficit over the last 3 months') }}</span>
                    <span class="skeleton-text" v-if="loading">0.00 USD</span>
                    <span class="text-expense" v-else>{{ displayAverageDeficit }}</span>
                </div>
            </template>
        </f7-list-item>
    </f7-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useSettlementWidgetBase } from '@/views/base/overview/SettlementWidgetBase.ts';

import { useSettingsStore } from '@/stores/setting.ts';
import { useAccountsStore } from '@/stores/account.ts';

import { getCurrentUnixTime, getUnixTimeAfterUnixTime, parseDateTimeFromUnixTime } from '@/lib/datetime.ts';

const AVERAGE_DAYS_PER_MONTH = 30.4375;

defineProps<{
    loading: boolean;
    title?: string;
    showTitle: boolean;
}>();

const { tt, formatAmountToLocalizedNumeralsWithCurrency, formatNumberToLocalizedNumerals, formatDateTimeToGregorianLikeLongYearMonth } = useI18n();

const settingsStore = useSettingsStore();
const accountsStore = useAccountsStore();
const { defaultCurrency, runway } = useSettlementWidgetBase();

const displayMonths = computed<string>(() => runway.value.months === null ? '' : formatNumberToLocalizedNumerals(runway.value.months, 2));
const displayAvailableFunds = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(accountsStore.getAvailableFunds(settingsStore.appSettings.showAccountBalance), defaultCurrency.value));
const displayAverageDeficit = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(runway.value.averageMonthlyDeficit, defaultCurrency.value));
const runOutMonthText = computed<string>(() => {
    if (runway.value.months === null) {
        return '';
    }

    const unixTime = getUnixTimeAfterUnixTime(getCurrentUnixTime(), Math.round(runway.value.months * AVERAGE_DAYS_PER_MONTH), 'days');
    return formatDateTimeToGregorianLikeLongYearMonth(parseDateTimeFromUnixTime(unixTime));
});
</script>
