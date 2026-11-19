import type { BigDecimal } from '@/core/numeral.ts';

import { BIG_DECIMAL_ZERO } from '@/lib/numeral.ts';

export interface CategoryExpenseAmount {
    readonly categoryId: string;
    readonly parentCategoryId: string;
    readonly amount: BigDecimal;
}

export interface FixedVariableExpenseSplit {
    readonly fixed: BigDecimal;
    readonly variable: BigDecimal;
    // fixed expense amount per category id that was marked as fixed (a secondary category, or a primary category covering its sub-categories)
    readonly fixedByCategoryId: Record<string, BigDecimal>;
}

// A category counts as fixed when it, or its parent category, is in the fixed expense category set
export function isFixedExpenseCategory(categoryId: string, parentCategoryId: string, fixedCategoryIds: Record<string, boolean>): boolean {
    return !!fixedCategoryIds[categoryId] || (!!parentCategoryId && parentCategoryId !== '0' && !!fixedCategoryIds[parentCategoryId]);
}

export function splitFixedVariableExpense(items: CategoryExpenseAmount[], fixedCategoryIds: Record<string, boolean>): FixedVariableExpenseSplit {
    let fixed: BigDecimal = BIG_DECIMAL_ZERO;
    let variable: BigDecimal = BIG_DECIMAL_ZERO;
    const fixedByCategoryId: Record<string, BigDecimal> = {};

    for (const item of items) {
        if (isFixedExpenseCategory(item.categoryId, item.parentCategoryId, fixedCategoryIds)) {
            fixed = fixed.add(item.amount);
            const groupId = fixedCategoryIds[item.categoryId] ? item.categoryId : item.parentCategoryId;
            fixedByCategoryId[groupId] = (fixedByCategoryId[groupId] ?? BIG_DECIMAL_ZERO).add(item.amount);
        } else {
            variable = variable.add(item.amount);
        }
    }

    return { fixed, variable, fixedByCategoryId };
}
