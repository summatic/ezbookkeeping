<template>
    <v-card class="overview-widget runway-widget h-100" :class="{ disabled: loading }">
        <template #title>
            <overview-widget-header :title="title || tt('Runway')" :icon="mdiTimerSandComplete" />
        </template>

        <v-card-text class="overview-widget__body mt-3">
            <template v-if="!loading || hasData">
                <div class="d-flex align-baseline flex-wrap ga-2">
                    <span class="runway-widget__months overview-widget__amount" v-if="runway.months !== null">{{ displayMonths }}</span>
                    <span class="text-title-medium" v-if="runway.months !== null">{{ tt('months') }}</span>
                    <span class="text-title-large" v-else>{{ tt('No deficit in the last 3 months') }}</span>
                    <v-chip class="ms-1" size="small" variant="tonal" color="error" v-if="runOutMonthText">
                        {{ tt('Funds run out around') }} {{ runOutMonthText }}
                    </v-chip>
                </div>

                <div class="runway-widget__track mt-4" aria-hidden="true" v-if="runway.months !== null">
                    <v-progress-linear rounded height="10" color="primary" :model-value="trackPercent" />
                    <div class="runway-widget__ticks overview-widget__caption text-body-small mt-1">
                        <span :key="label" v-for="label in trackMonthLabels">{{ label }}</span>
                    </div>
                </div>

                <div class="runway-widget__formula overview-widget__caption text-body-medium mt-4">
                    <div>{{ tt('Available funds') }} <b class="overview-widget__amount">{{ displayAvailableFunds }}</b></div>
                    <div>{{ tt('Average monthly deficit over the last 3 months') }} <b class="overview-widget__amount">{{ displayAverageDeficit }}</b></div>
                </div>
            </template>
            <v-skeleton-loader class="skeleton-no-margin" type="heading, text, text" :loading="true" v-else />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import OverviewWidgetHeader from './OverviewWidgetHeader.vue';

import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';

import { useSettingsStore } from '@/stores/setting.ts';
import { useUserStore } from '@/stores/user.ts';
import { useAccountsStore } from '@/stores/account.ts';
import { useOverviewStore } from '@/stores/overview.ts';

import type { BigDecimal } from '@/core/numeral.ts';
import {
    type TransactionOverviewData,
    LATEST_12MONTHS_TRANSACTION_AMOUNTS_REQUEST_TYPES
} from '@/models/transaction.ts';

import { BIG_DECIMAL_ZERO, isBigDecimal } from '@/lib/numeral.ts';
import { getCurrentUnixTime, getUnixTimeAfterUnixTime, parseDateTimeFromUnixTime } from '@/lib/datetime.ts';
import { type RunwayMonthlyAmount, type RunwayResult, RUNWAY_COUNTED_MONTHS, calculateRunway } from '@/lib/runway.ts';

import {
    mdiTimerSandComplete
} from '@mdi/js';

const TRACK_MONTHS = 6;
const AVERAGE_DAYS_PER_MONTH = 30.4375;

defineProps<{
    loading: boolean;
    title?: string;
}>();

const {
    tt,
    formatAmountToLocalizedNumeralsWithCurrency,
    formatNumberToLocalizedNumerals,
    formatDateTimeToGregorianLikeLongYearMonth,
    formatDateTimeToGregorianLikeShortMonth
} = useI18n();

const settingsStore = useSettingsStore();
const userStore = useUserStore();
const accountsStore = useAccountsStore();
const overviewStore = useOverviewStore();

const defaultCurrency = computed<string>(() => userStore.currentUserDefaultCurrency);
const transactionOverview = computed<TransactionOverviewData>(() => overviewStore.transactionOverview);

const availableFunds = computed<BigDecimal>(() => {
    const funds = accountsStore.getAvailableFunds(true);

    if (isBigDecimal(funds)) {
        return funds;
    } else if (typeof funds === 'object' && isBigDecimal(funds.value)) {
        return funds.value;
    }

    return BIG_DECIMAL_ZERO;
});

// the last completed months, excluding the current (partial) month
const countedMonthlyAmounts = computed<RunwayMonthlyAmount[]>(() => {
    const ret: RunwayMonthlyAmount[] = [];

    if (!transactionOverview.value || !transactionOverview.value.thisMonth || !transactionOverview.value.thisMonth.valid) {
        return ret;
    }

    const completedMonthTypes = LATEST_12MONTHS_TRANSACTION_AMOUNTS_REQUEST_TYPES.slice(0, -1).slice(-RUNWAY_COUNTED_MONTHS);

    for (const requestType of completedMonthTypes) {
        const item = transactionOverview.value[requestType];

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

const hasData = computed<boolean>(() => countedMonthlyAmounts.value.length > 0 || accountsStore.allAccounts.length > 0);
const runway = computed<RunwayResult>(() => calculateRunway(availableFunds.value, countedMonthlyAmounts.value));

const displayMonths = computed<string>(() => runway.value.months === null ? '' : formatNumberToLocalizedNumerals(runway.value.months, 2));
const displayAvailableFunds = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(accountsStore.getAvailableFunds(settingsStore.appSettings.showAccountBalance), defaultCurrency.value));
const displayAverageDeficit = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(runway.value.averageMonthlyDeficit, defaultCurrency.value));

const runOutUnixTime = computed<number | null>(() => {
    if (runway.value.months === null) {
        return null;
    }

    return getUnixTimeAfterUnixTime(getCurrentUnixTime(), Math.round(runway.value.months * AVERAGE_DAYS_PER_MONTH), 'days');
});

const runOutMonthText = computed<string>(() => runOutUnixTime.value === null ? '' : formatDateTimeToGregorianLikeLongYearMonth(parseDateTimeFromUnixTime(runOutUnixTime.value)));
const trackPercent = computed<number>(() => runway.value.months === null ? 100 : Math.min(100, runway.value.months / TRACK_MONTHS * 100));

const trackMonthLabels = computed<string[]>(() => {
    const labels: string[] = [];
    const now = getCurrentUnixTime();

    for (let i = 0; i < TRACK_MONTHS; i++) {
        labels.push(formatDateTimeToGregorianLikeShortMonth(parseDateTimeFromUnixTime(getUnixTimeAfterUnixTime(now, i, 'months'))));
    }

    return labels;
});
</script>

<style>
.runway-widget__months {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
}

.runway-widget__ticks {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
}

.runway-widget__formula {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
</style>
