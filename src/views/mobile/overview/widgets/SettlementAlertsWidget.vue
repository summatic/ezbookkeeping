<template>
    <f7-list strong inset dividers class="no-margin-top margin-bottom">
        <f7-list-item group-title v-if="showTitle">
            <small>{{ title || tt('Settlement Alerts') }}</small>
        </f7-list-item>
        <f7-list-item :title="tt('No alerts')" v-if="!loading && !displayAlerts.length"></f7-list-item>
        <f7-list-item :key="alert.key" :link="alert.link" :footer="alert.linkText" v-for="alert in displayAlerts">
            <template #media>
                <f7-icon :class="levelClass(alert.level)" :f7="levelIcon(alert.level)"></f7-icon>
            </template>
            <template #title>
                <div class="settlement-alert-title">{{ alert.text }}</div>
            </template>
        </f7-list-item>
    </f7-list>
</template>

<script setup lang="ts">
import { useI18n } from '@/locales/helpers.ts';
import { useSettlementWidgetBase } from '@/views/base/overview/SettlementWidgetBase.ts';

defineProps<{
    loading: boolean;
    title?: string;
    showTitle: boolean;
}>();

const { tt } = useI18n();
const { displayAlerts } = useSettlementWidgetBase();

function levelIcon(level: string): string {
    return level === 'info' ? 'info_circle' : 'exclamationmark_triangle';
}

function levelClass(level: string): string {
    if (level === 'error') {
        return 'text-color-red';
    } else if (level === 'warning') {
        return 'text-color-orange';
    }

    return 'text-color-gray';
}
</script>

<style>
.settlement-alert-title {
    white-space: normal;
}
</style>
