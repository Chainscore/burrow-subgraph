import { ethereum, near, BigInt, log } from '@graphprotocol/graph-ts';
import { LendingProtocol, Deposit, Token, Withdraw, Borrow, Repay, Market, Position, Account, Liquidate } from '../generated/schema';
import { assets, BI_ZERO, BD_ZERO, ADDRESS_ZERO } from './const';

export function getOrCreateController(): LendingProtocol {
    let controller = LendingProtocol.load("0")
    if(!controller){
        controller = new LendingProtocol("0");
        controller.owner = ""
        controller.oracle = ""
        controller.booster = ""
        controller.boosterMultiplier = BI_ZERO
        controller.maxAssets = 0 as i32
        controller.save()
    }
    return controller
}

export function getOrCreateDeposit(id: string, receipt: near.ReceiptWithOutcome): Deposit {
    let d = Deposit.load(id)
    if(!d){
        d = new Deposit(id);
        d.hash = receipt.outcome.id.toBase58()
        d.nonce = BI_ZERO
        d.logIndex = 0 as i32
        d.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
        d.timestamp = BigInt.fromString((receipt.block.header.timestampNanosec).toString()).div(BigInt.fromString("1000000"))
        d.account = getOrCreateAccount(ADDRESS_ZERO).id
        d.market = ""
        d.position = ""
        d.asset = ""
        d.amount = BI_ZERO
        d.amountUSD = BD_ZERO
        d.save()
    }
    return d
}

export function getOrCreateWithdrawal(id: string, receipt: near.ReceiptWithOutcome): Withdraw {
    let w = Withdraw.load(id)
    if(!w){
        w = new Withdraw(id);
        w.hash = receipt.outcome.id.toBase58()
        w.nonce = BI_ZERO
        w.logIndex = 0 as i32
        w.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
        w.timestamp = BigInt.fromString((receipt.block.header.timestampNanosec).toString()).div(BigInt.fromString("1000000"))
        w.account = getOrCreateAccount(ADDRESS_ZERO).id
        w.market = ""
        w.position = ""
        w.asset = ""
        w.amount = BI_ZERO
        w.amountUSD = BD_ZERO
        w.save()
    }
    return w
}

export function getOrCreateBorrow(id: string, receipt: near.ReceiptWithOutcome): Borrow {
    let b = Borrow.load(id)
    if(!b){
        b = new Borrow(id);
        b.hash = receipt.outcome.id.toBase58()
        b.nonce = BI_ZERO
        b.logIndex = 0 as i32
        b.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
        b.timestamp = BigInt.fromString((receipt.block.header.timestampNanosec).toString()).div(BigInt.fromString("1000000"))
        b.account = getOrCreateAccount(ADDRESS_ZERO).id
        b.market = ""
        b.position = ""
        b.asset = ""
        b.amount = BI_ZERO
        b.amountUSD = BD_ZERO
        b.save()
    }
    return b
}

export function getOrCreateRepayment(id: string, receipt: near.ReceiptWithOutcome): Repay {
    let r = Repay.load(id)
    if(!r){
        r = new Repay(id);
        r.hash = receipt.outcome.id.toBase58()
        r.nonce = BI_ZERO
        r.logIndex = 0 as i32
        r.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
        r.timestamp = BigInt.fromString((receipt.block.header.timestampNanosec).toString()).div(BigInt.fromString("1000000"))
        r.account = getOrCreateAccount(ADDRESS_ZERO).id
        r.market = ""
        r.position = ""
        r.asset = ""
        r.amount = BI_ZERO
        r.amountUSD = BD_ZERO
        r.save()
    }
    return r
}

export function getOrCreateLiquidation(id: string, receipt: near.ReceiptWithOutcome): Liquidate {
    let r = Liquidate.load(id)
    if(!r){
        r = new Liquidate(id);
        r.hash = receipt.outcome.id.toBase58()
        r.nonce = BI_ZERO
        r.logIndex = 0 as i32
        r.blockNumber = BigInt.fromI32(receipt.block.header.height as i32)
        r.timestamp = BigInt.fromString((receipt.block.header.timestampNanosec).toString()).div(BigInt.fromI32(1000))
        r.liquidatee = getOrCreateAccount(ADDRESS_ZERO).id
        r.liquidator = getOrCreateAccount(ADDRESS_ZERO).id
        r.market = ""
        r.position = ""
        r.asset = ""
        r.amount = BI_ZERO
        r.amountUSD = BD_ZERO
        r.profitUSD = BD_ZERO
        r.save()
    }
    return r
}

export function getOrCreateMarket(id: string): Market {
    let r = Market.load(id)
    if(!r){
        r = new Market(id);
        r.underlyingToken = getOrCreateToken(id).id;
        r.totalBorrows = BI_ZERO
        r.totalDeposits = BI_ZERO
        r.totalBorrowers = 0
        r.totalDepositers = 0
        r.save()
    }
    return r
}

export function getOrCreatePosition(account: string, market: string): Position {
    let r = Position.load(account.concat("-").concat(market))
    if(!r){
        r = new Position(account.concat("-").concat(market));
        r.account = getOrCreateAccount(account).id;
        r.market = getOrCreateMarket(market).id;
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
    if(!r){
        r = new Account(account);
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
    if(!token){
        token = new Token(id);
        token.name = ""
        token.decimals = 0
        token.symbol = ""

        let metadata = assets.get(id)
        if(metadata){
            token.name = metadata.name
            token.decimals = metadata.decimals as i32
            token.symbol = metadata.symbol
            token.lastPriceUSD = BD_ZERO
            token.lastPriceBlockNumber = BI_ZERO
        } else {
            log.info("Token metadata not found {}", [id])
        }
        
        token.save()
    }
    return token
}