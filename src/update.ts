import { log, BigInt, BigDecimal, near } from '@graphprotocol/graph-ts';
import { Market, Position } from '../generated/schema';
import { compound } from './compound';
import { BI_ZERO } from './const'
import {
  getOrCreateMarket,
  getOrCreatePosition,
  getOrCreateToken,
} from './helpers'
import { updateApr } from './rates';

export function updateMarket(market: Market, receipt: near.ReceiptWithOutcome): void {
  let token = getOrCreateToken(market.inputToken)

  market.inputTokenPriceUSD = token.lastPriceUSD!
  market.totalDepositBalanceUSD = market.inputTokenBalance
    .toBigDecimal()
    .div(
      BigInt.fromI32(10)
        .pow((token.decimals + token.extraDecimals) as u8)
        .toBigDecimal(),
    )
    .times(market.inputTokenPriceUSD)
  market.totalBorrowBalanceUSD = market.outputTokenBalance
    .toBigDecimal()
    .div(
      BigInt.fromI32(10)
        .pow((token.decimals + token.extraDecimals) as u8)
        .toBigDecimal(),
    )
    .times(market.inputTokenPriceUSD)
  market.totalValueLockedUSD = market.totalDepositBalanceUSD

  market._yieldAccured = market._totalWithrawn
    .minus(market._totalDeposited)
    .plus(market.inputTokenBalance)

  log.info(
    'STAT _totalWithrawn {} _totalDeposited {} inputTokenBalance {} yield {}',
    [
      market._totalWithrawn.toString(),
      market._totalDeposited.toString(),
      market.inputTokenBalance.toString(),
      market._yieldAccured.toString(),
    ],
  )

  market._interestAccured = market._totalRepaidHistory
    .minus(market._totalBorrowed)
    .plus(market.outputTokenBalance)
  market.cumulativeTotalRevenueUSD = market._interestAccured
    .times(market._reserveRatio)
    .toBigDecimal()
    .div(
      BigInt.fromI32(10)
        .pow((token.decimals + token.extraDecimals) as u8)
        .toBigDecimal(),
    )
    .times(market.inputTokenPriceUSD)
    .div(BigDecimal.fromString('10000'))
  updateApr(market)
  compound(market, receipt.block)
}

export function updatePosition(position: Position, market: Market): void {
  if (position.totalWithdrawn.gt(position.totalDeposited)) {
    if (!position._yieldAccured) {
      position._yieldAccured = BI_ZERO
    }
    let newYieldAccured = position.totalWithdrawn.minus(position.totalDeposited)
    let additionalYieldAccured = newYieldAccured.minus(position._yieldAccured!)

    // update market
    market._yieldAccured = market._yieldAccured.plus(additionalYieldAccured)
    position._yieldAccured = newYieldAccured
  }

  if (position.totalRepaid.gt(position.totalBorrowed)) {
    if (!position._interestAccured) {
      position._interestAccured = BI_ZERO
    }
    let newInterestAccured = position.totalRepaid.minus(position.totalBorrowed)
    let additionalInterestAccured = newInterestAccured.minus(
      position._interestAccured!
    )

    // update market
    market._interestAccured = market._interestAccured.plus(
      additionalInterestAccured,
    )

    position._interestAccured = newInterestAccured
  }
}
