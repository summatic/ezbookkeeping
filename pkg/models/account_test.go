package models

import (
	"math"
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAccountToAccountInfoResponseBalance(t *testing.T) {
	account := &Account{Balance: math.MaxInt64}
	response := account.ToAccountInfoResponse()
	assert.Equal(t, "9223372036854775807", response.Balance)

	account.Balance = math.MinInt64
	response = account.ToAccountInfoResponse()
	assert.Equal(t, "-9223372036854775808", response.Balance)
}

func TestAccountInfoResponseSliceLess(t *testing.T) {
	var accountRespSlice AccountInfoResponseSlice
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           1,
		Category:     ACCOUNT_CATEGORY_CHECKING_ACCOUNT,
		DisplayOrder: int32(1),
	})
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           2,
		Category:     ACCOUNT_CATEGORY_CASH,
		DisplayOrder: int32(3),
	})
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           3,
		Category:     ACCOUNT_CATEGORY_CREDIT_CARD,
		DisplayOrder: int32(2),
	})
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           4,
		Category:     ACCOUNT_CATEGORY_CASH,
		DisplayOrder: int32(2),
	})
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           5,
		Category:     ACCOUNT_CATEGORY_CREDIT_CARD,
		DisplayOrder: int32(1),
	})
	accountRespSlice = append(accountRespSlice, &AccountInfoResponse{
		Id:           6,
		Category:     ACCOUNT_CATEGORY_CASH,
		DisplayOrder: int32(1),
	})

	sort.Sort(accountRespSlice)

	assert.Equal(t, int64(6), accountRespSlice[0].Id)
	assert.Equal(t, int64(4), accountRespSlice[1].Id)
	assert.Equal(t, int64(2), accountRespSlice[2].Id)
	assert.Equal(t, int64(1), accountRespSlice[3].Id)
	assert.Equal(t, int64(5), accountRespSlice[4].Id)
	assert.Equal(t, int64(3), accountRespSlice[5].Id)
}

func TestAccountIsIncludedInAvailableFunds(t *testing.T) {
	assetAccount := &Account{Category: ACCOUNT_CATEGORY_VIRTUAL}
	assert.True(t, assetAccount.IsIncludedInAvailableFunds())

	debtAccount := &Account{Category: ACCOUNT_CATEGORY_DEBT}
	assert.False(t, debtAccount.IsIncludedInAvailableFunds())

	include := true
	debtAccount.Extend = &AccountExtend{IncludeInAvailableFunds: &include}
	assert.True(t, debtAccount.IsIncludedInAvailableFunds())

	exclude := false
	assetAccount.Extend = &AccountExtend{IncludeInAvailableFunds: &exclude}
	assert.False(t, assetAccount.IsIncludedInAvailableFunds())
}

func TestAccountToAccountInfoResponseDebtLimitAndFinancialSettings(t *testing.T) {
	limit := int64(1400000000)
	rate := int64(561)
	maturityDate := "2027-05-14"
	include := true
	account := &Account{
		Category:        ACCOUNT_CATEGORY_DEBT,
		ParentAccountId: LevelOneAccountParentId,
		Extend: &AccountExtend{
			CreditCardLimit:         &limit,
			InterestRate:            &rate,
			MaturityDate:            &maturityDate,
			IncludeInAvailableFunds: &include,
		},
	}

	response := account.ToAccountInfoResponse()
	assert.Equal(t, "1400000000", *response.CreditCardLimit)
	assert.Nil(t, response.CreditCardStatementDate)
	assert.Equal(t, int64(561), *response.InterestRate)
	assert.Equal(t, "2027-05-14", *response.MaturityDate)
	assert.True(t, response.IncludeInAvailableFunds)

	cashAccount := &Account{Category: ACCOUNT_CATEGORY_CASH, ParentAccountId: LevelOneAccountParentId}
	cashResponse := cashAccount.ToAccountInfoResponse()
	assert.Nil(t, cashResponse.CreditCardLimit)
	assert.True(t, cashResponse.IncludeInAvailableFunds)
}
