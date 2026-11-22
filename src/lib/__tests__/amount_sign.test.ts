import { describe, expect, it } from 'vitest';

import { TransactionType } from '@/core/transaction.ts';
import { withTransactionAmountSign } from '@/lib/amount_sign.ts';

describe('withTransactionAmountSign', () => {
    it('should prefix income with + and expense with -', () => {
        expect(withTransactionAmountSign('₩ 1,500,000', TransactionType.Income, false)).toBe('+₩ 1,500,000');
        expect(withTransactionAmountSign('₩ 1,500,000', TransactionType.Expense, false)).toBe('-₩ 1,500,000');
    });

    it('should leave transfers, balance changes, hidden and empty amounts unchanged', () => {
        expect(withTransactionAmountSign('₩ 100', TransactionType.Transfer, false)).toBe('₩ 100');
        expect(withTransactionAmountSign('₩ 100', TransactionType.ModifyBalance, false)).toBe('₩ 100');
        expect(withTransactionAmountSign('***', TransactionType.Expense, true)).toBe('***');
        expect(withTransactionAmountSign('', TransactionType.Income, false)).toBe('');
    });
});
