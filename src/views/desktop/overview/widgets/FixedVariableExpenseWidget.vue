<template>
    <v-card class="overview-widget fixed-expense-widget h-100" :class="{ disabled: loading }">
        <template #title>
            <overview-widget-header :title="title || tt('Fixed and Variable Expenses')" :icon="mdiScaleBalance">
                <v-btn density="compact" color="default" variant="text" :aria-label="tt('More')" :icon="true">
                    <v-icon :icon="mdiDotsVertical" />
                    <v-menu activator="parent">
                        <v-list>
                            <v-list-item :prepend-icon="mdiShapePlusOutline" @click="showFixedCategoriesDialog = true">
                                <v-list-item-title>{{ tt('Set Fixed Expense Categories') }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-btn>
            </overview-widget-header>
        </template>

        <v-card-text class="overview-widget__body mt-2">
            <template v-if="!loading || hasData">
                <div class="overview-widget__caption text-body-medium mb-3">{{ periodName }}</div>

                <div class="overview-widget__caption text-body-medium" v-if="!hasFixedCategories">
                    {{ tt('No fixed expense category is set yet.') }}
                    <a href="#" @click.prevent="showFixedCategoriesDialog = true">{{ tt('Set Fixed Expense Categories') }}</a>
                </div>

                <template v-else>
                    <div class="fixed-expense-widget__bar" role="img" :aria-label="`${tt('Fixed Expenses')} ${fixedPercentText}, ${tt('Variable Expenses')} ${variablePercentText}`">
                        <div class="fixed-expense-widget__bar-fixed" :style="{ width: `${fixedPercent}%` }"></div>
                        <div class="fixed-expense-widget__bar-variable" :style="{ width: `${100 - fixedPercent}%` }"></div>
                    </div>
                    <div class="d-flex justify-space-between text-body-medium mt-2">
                        <span><span class="fixed-expense-widget__dot fixed-expense-widget__dot--fixed"></span>{{ tt('Fixed Expenses') }} <b class="overview-widget__amount">{{ displayFixed }}</b> ({{ fixedPercentText }})</span>
                        <span><span class="fixed-expense-widget__dot fixed-expense-widget__dot--variable"></span>{{ tt('Variable Expenses') }} <b class="overview-widget__amount">{{ displayVariable }}</b></span>
                    </div>

                    <div class="fixed-expense-widget__list mt-4">
                        <div class="fixed-expense-widget__row" :key="item.id" v-for="item in fixedItems">
                            <span class="text-body-medium text-truncate">{{ item.name }}</span>
                            <v-progress-linear rounded :height="6" color="primary" :bg-opacity="0.1" :model-value="item.percent" :aria-label="item.name" />
                            <span class="text-body-medium overview-widget__amount text-end">{{ item.displayAmount }}</span>
                        </div>
                    </div>
                </template>
            </template>
            <v-skeleton-loader class="skeleton-no-margin" type="text, text, paragraph" :loading="true" v-else />
        </v-card-text>
    </v-card>

    <category-filter-settings-dialog type="custom" category-types="2"
                                     :selected-category-ids="selectedFixedCategoryIds"
                                     v-model:show="showFixedCategoriesDialog"
                                     @settings:change="onFixedCategoriesChanged" />
</template>

<script setup lang="ts">
import OverviewWidgetHeader from './OverviewWidgetHeader.vue';
import CategoryFilterSettingsDialog from '@/views/desktop/common/dialogs/CategoryFilterSettingsDialog.vue';

import { ref, computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';

import { useSettingsStore } from '@/stores/setting.ts';
import { useUserStore } from '@/stores/user.ts';
import { useAccountsStore } from '@/stores/account.ts';
import { useTransactionCategoriesStore } from '@/stores/transactionCategory.ts';
import { useOverviewStore } from '@/stores/overview.ts';
import { useExchangeRatesStore } from '@/stores/exchangeRates.ts';

import { keysIfValueEquals } from '@/core/base.ts';
import { CategoryType } from '@/core/category.ts';
import { DateRange } from '@/core/datetime.ts';

import { arrayItemToObjectField } from '@/lib/common.ts';
import { parseBigDecimal } from '@/lib/numeral.ts';
import { type CategoryExpenseAmount, type FixedVariableExpenseSplit, splitFixedVariableExpense } from '@/lib/fixed_expense.ts';

import {
    mdiScaleBalance,
    mdiDotsVertical,
    mdiShapePlusOutline
} from '@mdi/js';

interface FixedItem {
    id: string;
    name: string;
    displayAmount: string;
    percent: number;
}

const props = defineProps<{
    loading: boolean;
    title?: string;
    dateType: number;
}>();

const { tt, formatAmountToLocalizedNumeralsWithCurrency, formatPercentToLocalizedNumerals } = useI18n();

const settingsStore = useSettingsStore();
const userStore = useUserStore();
const accountsStore = useAccountsStore();
const categoriesStore = useTransactionCategoriesStore();
const overviewStore = useOverviewStore();
const exchangeRatesStore = useExchangeRatesStore();

const showFixedCategoriesDialog = ref<boolean>(false);

const defaultCurrency = computed<string>(() => userStore.currentUserDefaultCurrency);
const fixedCategoryIds = computed<Record<string, boolean>>(() => settingsStore.appSettings.fixedExpenseCategoryIds || {});
const selectedFixedCategoryIds = computed<string[]>(() => Array.from(keysIfValueEquals(fixedCategoryIds.value, true)));
const hasFixedCategories = computed<boolean>(() => selectedFixedCategoryIds.value.length > 0);
const periodName = computed<string>(() => tt(DateRange.valueOf(props.dateType)?.name ?? DateRange.LastMonth.name));

const categoryAmounts = computed<CategoryExpenseAmount[]>(() => {
    const response = overviewStore.transactionCategoryStatisticsData[props.dateType];
    const ret: CategoryExpenseAmount[] = [];

    for (const item of response?.items ?? []) {
        const account = accountsStore.allAccountsMap[item.accountId];
        const category = categoriesStore.allTransactionCategoriesMap[item.categoryId];

        if (!account || !category || category.type !== CategoryType.Expense) {
            continue;
        }

        let amount = parseBigDecimal(item.amount);

        if (account.currency !== defaultCurrency.value) {
            const exchanged = exchangeRatesStore.getExchangedAmount(amount, account.currency, defaultCurrency.value);

            if (!exchanged) {
                continue;
            }

            amount = exchanged.truncate();
        }

        ret.push({ categoryId: category.id, parentCategoryId: category.parentId, amount: amount });
    }

    return ret;
});

const hasData = computed<boolean>(() => categoryAmounts.value.length > 0);
const split = computed<FixedVariableExpenseSplit>(() => splitFixedVariableExpense(categoryAmounts.value, fixedCategoryIds.value));

const fixedPercent = computed<number>(() => {
    const total = split.value.fixed.add(split.value.variable);
    return total.isPositive() ? Math.round(split.value.fixed.divide(total).multiply(100).toDoubleNumber()) : 0;
});

const fixedPercentText = computed<string>(() => formatPercentToLocalizedNumerals(fixedPercent.value, 0, '<1'));
const variablePercentText = computed<string>(() => formatPercentToLocalizedNumerals(100 - fixedPercent.value, 0, '<1'));
const displayFixed = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(split.value.fixed, defaultCurrency.value));
const displayVariable = computed<string>(() => formatAmountToLocalizedNumeralsWithCurrency(split.value.variable, defaultCurrency.value));

const fixedItems = computed<FixedItem[]>(() => {
    const entries = Object.entries(split.value.fixedByCategoryId).sort((a, b) => b[1].compareTo(a[1]));
    const max = entries.length ? entries[0]![1] : null;

    return entries.slice(0, 6).map(([categoryId, amount]) => ({
        id: categoryId,
        name: categoriesStore.allTransactionCategoriesMap[categoryId]?.name ?? '',
        displayAmount: formatAmountToLocalizedNumeralsWithCurrency(amount, defaultCurrency.value),
        percent: max && max.isPositive() ? amount.divide(max).multiply(100).toDoubleNumber() : 0
    }));
});

function onFixedCategoriesChanged(changed: boolean, selectedCategoryIds?: string[]): void {
    showFixedCategoriesDialog.value = false;

    if (changed && selectedCategoryIds) {
        settingsStore.setFixedExpenseCategoryIds(arrayItemToObjectField(selectedCategoryIds, true));
    }
}
</script>

<style>
.fixed-expense-widget__bar {
    display: flex;
    height: 14px;
    border-radius: 999px;
    overflow: hidden;
}

.fixed-expense-widget__bar-fixed,
.fixed-expense-widget__dot--fixed {
    background-color: rgb(var(--v-theme-primary));
}

.fixed-expense-widget__bar-variable,
.fixed-expense-widget__dot--variable {
    background-color: rgb(var(--v-theme-expense));
}

.fixed-expense-widget__dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-inline-end: 6px;
}

.fixed-expense-widget__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.fixed-expense-widget__row {
    display: grid;
    grid-template-columns: minmax(64px, 120px) minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
}
</style>
