import { TransactionType } from '@/core/transaction.ts';

// Prefixes a formatted transaction amount with "+" for income and "-" for expense, so the direction of money
// is readable without relying on the income / expense colors alone. Transfers, balance changes and hidden amounts are left as they are.
export function withTransactionAmountSign(displayAmount: string, transactionType: number, hidden: boolean): string {
    if (!displayAmount || hidden) {
        return displayAmount;
    }

    if (transactionType === TransactionType.Income) {
        return `+${displayAmount}`;
    } else if (transactionType === TransactionType.Expense) {
        return `-${displayAmount}`;
    }

    return displayAmount;
}
