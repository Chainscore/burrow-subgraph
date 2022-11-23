import {
  ethereum,
  near,
  BigInt,
  log,
  BigDecimal,
} from '@graphprotocol/graph-ts'
import {
  LendingProtocol,
  Deposit,
  Token,
  Withdraw,
  Borrow,
  Repay,
  Market,
  Position,
  Account,
  Liquidate,
  InterestRate,
} from '../generated/schema'
import { assets, BI_ZERO, BD_ZERO, ADDRESS_ZERO } from './const'

export function getOrCreateController(): LendingProtocol {
  let controller = LendingProtocol.load('0')
  if (!controller) {
    controller = new LendingProtocol('0')
    controller.owner = ''
    controller.oracle = ''
    controller.booster = ''
    controller.boosterMultiplier = BI_ZERO
    controller.maxAssets = 0 as i32
    controller.save()
  }
  return controller
}

export function getOrCreateDeposit(
  id: string,
  receipt: near.ReceiptWithOutcome,
): Deposit {
  let d = Deposit.load(id)
  if (!d) {
    d = new Deposit(id)
    d.hash = receipt.outcome.id.toBase58()
    d.nonce = BI_ZERO
    d.logIndex = 0 as i32
    d.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
    d.timestamp = BigInt.fromString(
      receipt.block.header.timestampNanosec.toString(),
    ).div(BigInt.fromString('1000000'))
    d.account = getOrCreateAccount(ADDRESS_ZERO).id
    d.market = ''
    d.position = ''
    d.asset = ''
    d.amount = BI_ZERO
    d.amountUSD = BD_ZERO
    d.save()
  }
  return d
}

export function getOrCreateWithdrawal(
  id: string,
  receipt: near.ReceiptWithOutcome,
): Withdraw {
  let w = Withdraw.load(id)
  if (!w) {
    w = new Withdraw(id)
    w.hash = receipt.outcome.id.toBase58()
    w.nonce = BI_ZERO
    w.logIndex = 0 as i32
    w.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
    w.timestamp = BigInt.fromString(
      receipt.block.header.timestampNanosec.toString(),
    ).div(BigInt.fromString('1000000'))
    w.account = getOrCreateAccount(ADDRESS_ZERO).id
    w.market = ''
    w.position = ''
    w.asset = ''
    w.amount = BI_ZERO
    w.amountUSD = BD_ZERO
    w.save()
  }
  return w
}

export function getOrCreateBorrow(
  id: string,
  receipt: near.ReceiptWithOutcome,
): Borrow {
  let b = Borrow.load(id)
  if (!b) {
    b = new Borrow(id)
    b.hash = receipt.outcome.id.toBase58()
    b.nonce = BI_ZERO
    b.logIndex = 0 as i32
    b.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
    b.timestamp = BigInt.fromString(
      receipt.block.header.timestampNanosec.toString(),
    ).div(BigInt.fromString('1000000'))
    b.account = getOrCreateAccount(ADDRESS_ZERO).id
    b.market = ''
    b.position = ''
    b.asset = ''
    b.amount = BI_ZERO
    b.amountUSD = BD_ZERO
    b.save()
  }
  return b
}

export function getOrCreateRepayment(
  id: string,
  receipt: near.ReceiptWithOutcome,
): Repay {
  let r = Repay.load(id)
  if (!r) {
    r = new Repay(id)
    r.hash = receipt.outcome.id.toBase58()
    r.nonce = BI_ZERO
    r.logIndex = 0 as i32
    r.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
    r.timestamp = BigInt.fromString(
      receipt.block.header.timestampNanosec.toString(),
    ).div(BigInt.fromString('1000000'))
    r.account = getOrCreateAccount(ADDRESS_ZERO).id
    r.market = ''
    r.position = ''
    r.asset = ''
    r.amount = BI_ZERO
    r.amountUSD = BD_ZERO
    r.save()
  }
  return r
}

export function getOrCreateLiquidation(
  id: string,
  receipt: near.ReceiptWithOutcome,
): Liquidate {
  let r = Liquidate.load(id)
  if (!r) {
    r = new Liquidate(id)
    r.hash = receipt.outcome.id.toBase58()
    r.nonce = BI_ZERO
    r.logIndex = 0 as i32
    r.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
    r.timestamp = BigInt.fromString(
      receipt.block.header.timestampNanosec.toString(),
    ).div(BigInt.fromI32(1000))
    r.liquidatee = getOrCreateAccount(ADDRESS_ZERO).id
    r.liquidator = getOrCreateAccount(ADDRESS_ZERO).id
    r.market = ''
    r.position = ''
    r.asset = ''
    r.amount = BI_ZERO
    r.amountUSD = BD_ZERO
    r.profitUSD = BD_ZERO
    r.save()
  }
  return r
}

export function getOrCreateMarket(id: string): Market {
  let r = Market.load(id)
  if (!r) {
    let token = getOrCreateToken(id)
    r = new Market(id)
    r.inputToken = token.id
    r.name = token.name
    r.isActive = false
    r.canBorrowFrom = false
    r.canUseAsCollateral = false
    r.protocol = getOrCreateController().id
    r.totalValueLockedUSD = BD_ZERO
    r.cumulativeTotalRevenueUSD = BD_ZERO
    r.inputTokenBalance = BI_ZERO
    r.outputTokenBalance = BI_ZERO
    r.totalDepositBalanceUSD = BD_ZERO
    r.inputTokenPriceUSD = BD_ZERO
    r.totalBorrowBalanceUSD = BD_ZERO
    r.rates = ['SUPPLY-VARIABLE-'.concat(id), 'BORROW-VARIABLE-'.concat(id)];

    r._last_update_timestamp = BigInt.fromI32(0);

    r._reserveRatio = BI_ZERO
    r._target_utilization = BI_ZERO
    r._target_utilization_rate = BI_ZERO
    r._max_utilization_rate = BI_ZERO
    r._volatility_ratio = BI_ZERO

    r._totalDeposited = BI_ZERO
    r._totalWithrawnHistory = BI_ZERO
    r._totalDepositedHistory = BI_ZERO
    r._yieldAccured = BI_ZERO

    r._totalBorrowed = BI_ZERO
    r._totalBorrowedHistory = BI_ZERO
    r._totalRepaidHistory = BI_ZERO
    r._interestAccured = BI_ZERO

    r.save()
  }
  return r
}

export function getOrCreatePosition(account: string, market: string): Position {
  let r = Position.load(account.concat('-').concat(market))
  if (!r) {
    r = new Position(account.concat('-').concat(market))
    r.account = getOrCreateAccount(account).id
    r.market = getOrCreateMarket(market).id
    r.collateral = BI_ZERO
    r.deposited = BI_ZERO
    r.borrowed = BI_ZERO
    r.totalBorrowed = BI_ZERO
    r.totalDeposited = BI_ZERO
    r.totalRepaid = BI_ZERO
    r.totalWithdrawn = BI_ZERO
    r.save()
  }
  return r
}

export function getOrCreateAccount(account: string): Account {
  let r = Account.load(account)
  if (!r) {
    r = new Account(account)
    r.borrowCount = 0
    r.depositCount = 0
    r.withdrawCount = 0
    r.repayCount = 0
    r.liquidateCount = 0
    r.liquidationCount = 0
    r.closedPositionCount = 0
    r.openPositionCount = 0
    r.save()
  }
  return r
}

export function getOrCreateToken(id: string): Token {
  let token = Token.load(id)
  if (!token) {
    token = new Token(id)
    token.name = ''
    token.decimals = 0
    token.symbol = ''
    token.extraDecimals = 0
    token.lastPriceUSD = BD_ZERO
    token.lastPriceBlockNumber = BI_ZERO

    let metadata = assets.get(id)
    if (metadata) {
      token.name = metadata.name
      token.decimals = metadata.decimals as i32
      token.symbol = metadata.symbol
    } else {
      log.info('Token metadata not found {}', [id])
    }

    token.save()
  }
  return token
}

export function getOrCreateSupplyRate(market: Market): InterestRate {
	let id = "SUPPLY-VARIABLE-".concat(market.id);
	let rate = InterestRate.load(id);
	if (rate == null) {
		rate = new InterestRate(id);
		rate.side = "LENDER";
		rate.type = "VARIABLE";
	}
	return rate as InterestRate;
}

export function getOrCreateBorrowRate(market: Market): InterestRate {
	let id = "BORROW-VARIABLE-".concat(market.id);
	let rate = InterestRate.load(id);
	if (rate == null) {
		rate = new InterestRate(id);
		rate.side = "BORROWER";
		rate.type = "VARIABLE";
	}
	return rate as InterestRate;
}