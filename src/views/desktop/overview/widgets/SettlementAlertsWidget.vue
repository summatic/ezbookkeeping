<template>
    <v-card class="overview-widget settlement-alerts-widget h-100" :class="{ disabled: loading }">
        <template #title>
            <overview-widget-header :title="title || tt('Settlement Alerts')" :icon="mdiBellAlertOutline" />
        </template>

        <v-card-text class="overview-widget__body mt-2">
            <template v-if="!loading || alerts.length">
                <div class="overview-widget__empty" v-if="!alerts.length">
                    <v-icon :icon="mdiCheckCircleOutline" size="32" />
                    <span>{{ tt('No alerts') }}</span>
                </div>
                <ul class="settlement-alerts-widget__list" v-else>
                    <li class="settlement-alerts-widget__item" :class="`settlement-alerts-widget__item--${item.level}`"
                        :key="item.key" v-for="item in displayAlerts">
                        <v-icon class="settlement-alerts-widget__icon" size="18" :icon="item.icon" />
                        <div class="d-flex flex-column">
                            <span class="text-body-medium">{{ item.text }}</span>
                            <router-link class="text-body-small font-weight-medium mt-1" :to="item.link" v-if="item.link">{{ item.linkText }}</router-link>
                        </div>
                    </li>
                </ul>
            </template>
            <v-skeleton-loader class="skeleton-no-margin" type="paragraph" :loading="true" v-else />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import OverviewWidgetHeader from './OverviewWidgetHeader.vue';

import { computed } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { type SettlementDisplayAlert, useSettlementWidgetBase } from '@/views/base/overview/SettlementWidgetBase.ts';

import {
    mdiBellAlertOutline,
    mdiCheckCircleOutline,
    mdiAlertCircleOutline,
    mdiAlertOutline,
    mdiInformationOutline
} from '@mdi/js';

defineProps<{
    loading: boolean;
    title?: string;
}>();

const LEVEL_ICONS: Record<string, string> = {
    error: mdiAlertCircleOutline,
    warning: mdiAlertOutline,
    info: mdiInformationOutline
};

const { tt } = useI18n();
const { displayAlerts: baseDisplayAlerts } = useSettlementWidgetBase();

const alerts = computed<SettlementDisplayAlert[]>(() => baseDisplayAlerts.value);
const displayAlerts = computed<(SettlementDisplayAlert & { icon: string })[]>(() => alerts.value.map(alert => ({ ...alert, icon: LEVEL_ICONS[alert.level] as string })));
</script>

<style>
.settlement-alerts-widget__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.settlement-alerts-widget__item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: var(--ebk-radius-md);
    background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.settlement-alerts-widget__item--error {
    background-color: rgba(var(--v-theme-error), 0.1);
}

.settlement-alerts-widget__item--error .settlement-alerts-widget__icon {
    color: rgb(var(--v-theme-error));
}

.settlement-alerts-widget__item--warning {
    background-color: rgba(var(--v-theme-warning), 0.12);
}

.settlement-alerts-widget__item--warning .settlement-alerts-widget__icon {
    color: rgb(var(--v-theme-warning-darken-1));
}

.settlement-alerts-widget__icon {
    margin-top: 1px;
    flex: 0 0 auto;
}
</style>
