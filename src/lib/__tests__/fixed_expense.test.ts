import { describe, expect, it } from 'vitest';

import { parseBigDecimal } from '@/lib/numeral.ts';
import { isFixedExpenseCategory, splitFixedVariableExpense } from '@/lib/fixed_expense.ts';

describe('isFixedExpenseCategory', () => {
    it('should match the category itself or its parent', () => {
        expect(isFixedExpenseCategory('11', '1', { '11': true })).toBe(true);
        expect(isFixedExpenseCategory('11', '1', { '1': true })).toBe(true);
        expect(isFixedExpenseCategory('12', '2', { '1': true })).toBe(false);
        expect(isFixedExpenseCategory('1', '0', { '0': true })).toBe(false);
    });
});

describe('splitFixedVariableExpense', () => {
    it('should split amounts into fixed and variable and group fixed amounts by marked category', () => {
        const result = splitFixedVariableExpense([
            { categoryId: '11', parentCategoryId: '1', amount: parseBigDecimal(1500000) },
            { categoryId: '12', parentCategoryId: '1', amount: parseBigDecimal(426810) },
            { categoryId: '21', parentCategoryId: '2', amount: parseBigDecimal(2912166) },
            { categoryId: '31', parentCategoryId: '3', amount: parseBigDecimal(6687311) }
        ], { '1': true, '21': true });

        expect(result.fixed.toString()).toBe('4838976');
        expect(result.variable.toString()).toBe('6687311');
        expect(result.fixedByCategoryId['1']?.toString()).toBe('1926810');
        expect(result.fixedByCategoryId['21']?.toString()).toBe('2912166');
    });
});
