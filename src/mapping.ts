import {
	near,
	BigInt,
	JSONValue,
	TypedMap,
	log,
	BigDecimal,
	JSONValueKind,
	json,
} from '@graphprotocol/graph-ts';
import {
	getOrCreateController,
	getOrCreateDeposit,
	getOrCreateToken,
	getOrCreateWithdrawal,
	getOrCreateMarket,
	getOrCreatePosition,
	getOrCreateBorrow,
	getOrCreateRepayment,
	getOrCreateAccount,
	getOrCreateLiquidation,
} from './helpers';

import { updateMarket, updatePosition } from './update';

/**
 * ------------------------------------------------------------------
 * ----------------------------- Events -----------------------------
 * ------------------------------------------------------------------
 * deposit_to_reserve     { account_id, amount, token_id }
 * deposit                - same as above
 * withdraw_started       - same as above
 * withdraw_failed        - same as above
 * withdraw_succeeded     - same as above
 * increase_collateral    - same as above
 * decrease_collateral    - same as above
 * borrow                 - same as above
 * repay                  - same as above
 * liquidate              { account_id, liquidation_account_id, collateral_sum, repaid_sum }
 * force_close            { liquidation_account_id, collateral_sum, repaid_sum }
 * booster_stake          { account_id, booster_amount, duration, x_booster_amount, total_booster_amount, total_x_booster_amount }
 * booster_unstake        { account_id, total_booster_amount, total_x_booster_amount }
 * ------------------------------------------------------------------
 */

export function handleDeposit(
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome,
	logIndex: number,
	method?: string,
	args?: TypedMap<string, JSONValue>
): void {
	let deposit = getOrCreateDeposit(
		receipt.outcome.id
			.toBase58()
			.concat('-')
			.concat((logIndex as i32).toString()),
		receipt
	);
	deposit.logIndex = logIndex as i32;
	let account_id = data.get('account_id');
	if (!account_id) {
		log.info('{} data not found', ['account_id']);
		return;
	}

	let amount = data.get('amount');
	if (!amount) {
		log.info('{} data not found', ['amount']);
		return;
	}
	let token_id = data.get('token_id');
	if (!token_id) {
		log.info('{} data not found', ['token_id']);
		return;
	}
	
	let market = getOrCreateMarket(token_id.toString());
	let account = getOrCreateAccount(account_id.toString());
	let position = getOrCreatePosition(
		account_id.toString(),
		token_id.toString()
	);
	if (position.deposited.isZero() && position.borrowed.isZero()) {
		account.positionCount += 1;
		account.openPositionCount += 1;
	}

	let token = getOrCreateToken(token_id.toString());

	deposit.account = account.id;
	deposit.amount = BigInt.fromString(amount.toString());
	deposit.asset = token.id;
	deposit.market = market.id;
	deposit.position = position.id;

	deposit.amountUSD = deposit.amount
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(token.lastPriceUSD!);

	position.deposited = position.deposited.plus(deposit.amount);
	position.totalDeposited = position.totalDeposited.plus(deposit.amount);

	account.depositCount = account.depositCount + 1;
	market._totalDeposited = market._totalDeposited.plus(deposit.amount);
	market._totalDepositedHistory = market._totalDepositedHistory.plus(deposit.amount);
    market.inputTokenBalance = market.inputTokenBalance.plus(deposit.amount)

	updateMarket(market, receipt);
	updatePosition(position, market);
    market.save()
	account.save();
	deposit.save();
	position.save();
}

export function handleWithdraw(
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome,
	logIndex: number,
	method?: string,
	args?: TypedMap<string, JSONValue>
): void {
	let withdraw = getOrCreateWithdrawal(
		receipt.outcome.id
			.toBase58()
			.concat('-')
			.concat((logIndex as i32).toString()),
		receipt
	);
	withdraw.logIndex = logIndex as i32;
	let account_id = data.get('account_id');
	if (!account_id) {
		log.info('{} data not found', ['account_id']);
		return;
	}
	let amount = data.get('amount');
	if (!amount) {
		log.info('{} data not found', ['amount']);
		return;
	}
	let token_id = data.get('token_id');
	if (!token_id) {
		log.info('{} data not found', ['token_id']);
		return;
	}

	let market = getOrCreateMarket(token_id.toString());
	let account = getOrCreateAccount(account_id.toString());
	let position = getOrCreatePosition(
		account_id.toString(),
		token_id.toString()
	);

	let token = getOrCreateToken(token_id.toString());
	withdraw.account = account.id;
	withdraw.amount = BigInt.fromString(amount.toString());
	withdraw.asset = token.id;
	withdraw.market = market.id;
	withdraw.position = position.id;

	withdraw.amountUSD = withdraw.amount
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(token.lastPriceUSD!);

	position.deposited = position.deposited.minus(withdraw.amount);
	if (position.deposited.isZero() && position.borrowed.isZero()) {
		account.openPositionCount -= 1;
	}
	position.totalWithdrawn = position.totalWithdrawn.plus(withdraw.amount);

	market.inputTokenBalance = market.inputTokenBalance.minus(withdraw.amount);
	account.withdrawCount = account.withdrawCount + 1;
	market._totalWithrawnHistory = market._totalWithrawn.plus(withdraw.amount);
	market._totalDeposited = market._totalDeposited.minus(withdraw.amount);

	updateMarket(market, receipt);
	updatePosition(position, market);
    market.save()
	account.save();
	withdraw.save();
	position.save();
}

export function handleBorrow(
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome,
	logIndex: number,
	method?: string,
	args?: TypedMap<string, JSONValue>
): void {
	let borrow = getOrCreateBorrow(
		receipt.outcome.id
			.toBase58()
			.concat('-')
			.concat((logIndex as i32).toString()),
		receipt
	);
	borrow.logIndex = logIndex as i32;
	let account_id = data.get('account_id');
	if (!account_id) {
		log.info('{} data not found', ['account_id']);
		return;
	}
	let amount = data.get('amount');
	if (!amount) {
		log.info('{} data not found', ['amount']);
		return;
	}
	let token_id = data.get('token_id');
	if (!token_id) {
		log.info('{} data not found', ['token_id']);
		return;
	}

	let market = getOrCreateMarket(token_id.toString());
	let account = getOrCreateAccount(account_id.toString());
	let position = getOrCreatePosition(
		account_id.toString(),
		token_id.toString()
	);
	if (position.deposited.isZero() && position.borrowed.isZero()) {
		account.positionCount += 1;
		account.openPositionCount += 1;
	}

	let token = getOrCreateToken(token_id.toString());
	borrow.account = account.id;
	borrow.amount = BigInt.fromString(amount.toString());
	borrow.asset = token.id;
	borrow.market = market.id;
	borrow.position = position.id;

	borrow.amountUSD = borrow.amount
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(token.lastPriceUSD!);

	position.borrowed = position.borrowed.plus(borrow.amount);
	position.totalBorrowed = position.totalBorrowed.plus(borrow.amount);
	account.borrowCount += 1;
	market._totalBorrowed = market._totalBorrowed.plus(borrow.amount);
	market._totalBorrowedHistory = market._totalBorrowedHistory.plus(borrow.amount);
	market._totalDeposited = market._totalDeposited.plus(borrow.amount);
	market.outputTokenBalance = market.outputTokenBalance.plus(borrow.amount);

	updateMarket(market, receipt);
	updatePosition(position, market);
    market.save()
	account.save();
	borrow.save();
	position.save();
}

export function handleRepayment(
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome,
	logIndex: number,
	method?: string,
	args?: TypedMap<string, JSONValue>
): void {
	let repay = getOrCreateRepayment(
		receipt.outcome.id
			.toBase58()
			.concat('-')
			.concat((logIndex as i32).toString()),
		receipt
	);
	repay.logIndex = logIndex as i32;
	let account_id = data.get('account_id');
	if (!account_id) {
		log.info('{} data not found', ['account_id']);
		return;
	}
	let amount = data.get('amount');
	if (!amount) {
		log.info('{} data not found', ['amount']);
		return;
	}
	let token_id = data.get('token_id');
	if (!token_id) {
		log.info('{} data not found', ['token_id']);
		return;
	}

	let market = getOrCreateMarket(token_id.toString());
	let account = getOrCreateAccount(account_id.toString());
	let position = getOrCreatePosition(
		account_id.toString(),
		token_id.toString()
	);

	if (position.deposited.isZero() && position.borrowed.isZero()) {
		account.positionCount += 1;
	}

	let token = getOrCreateToken(token_id.toString());
	repay.market = market.id;
	repay.account = account.id;
	repay.amount = BigInt.fromString(amount.toString());
	repay.asset = token.id;
	repay.position = position.id;
	repay.amountUSD = repay.amount
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(token.lastPriceUSD!);

	position.borrowed = position.borrowed.minus(repay.amount);
	position.totalRepaid = position.totalRepaid.plus(repay.amount);
	account.repayCount += 1;
	market.outputTokenBalance = market.outputTokenBalance.minus(repay.amount);
	market._totalRepaidHistory = market._totalRepaidHistory.plus(repay.amount);
	market._totalBorrowed = market._totalBorrowed.minus(repay.amount);
	market._totalWithrawn = market._totalWithrawn.plus(repay.amount);

	if (position.deposited.isZero() && position.borrowed.isZero()) {
		account.openPositionCount -= 1;
		account.closedPositionCount += 1;
	}

	updateMarket(market, receipt);
	updatePosition(position, market);
    market.save()
	account.save();
	repay.save();
	position.save();
}

// { account_id, liquidation_account_id, collateral_sum, repaid_sum }
export function handleLiquidate(
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome,
	logIndex: number,
	method?: string,
	args?: TypedMap<string, JSONValue>
): void {
	let liq = getOrCreateLiquidation(
		receipt.outcome.id
			.toBase58()
			.concat('-')
			.concat((logIndex as i32).toString()),
		receipt
	);
	liq.logIndex = logIndex as i32;
	let account_id = data.get('account_id');
	if (!account_id) {
		log.info('{} data not found', ['account_id']);
		return;
	}
	let liquidation_account_id = data.get('liquidation_account_id');
	if (!liquidation_account_id) {
		log.info('{} data not found', ['liquidation_account_id']);
		return;
	}
	let collateral_sum = data.get('collateral_sum');
	if (!collateral_sum) {
		log.info('{} data not found', ['collateral_sum']);
		return;
	}
	let repaid_sum = data.get('repaid_sum');
	if (!repaid_sum) {
		log.info('{} data not found', ['repaid_sum']);
		return;
	}

	let liquidator = getOrCreateAccount(account_id.toString());
	liquidator.liquidateCount += 1;
	liq.liquidator = liquidator.id;
	liquidator.save();

	let liquidatee = getOrCreateAccount(liquidation_account_id.toString());
	liquidatee.liquidateCount += 1;
	liq.liquidatee = liquidatee.id;
	liquidatee.save();

	liq.amountUSD = BigDecimal.fromString(collateral_sum.toString());
	liq.profitUSD = liq.amountUSD.minus(
		BigDecimal.fromString(repaid_sum.toString())
	);

	if (args) {
		let msg = args.get('msg');
		if (!msg) {
			log.info('LIQ::Msg not found', []);
			return;
		}
		log.info('LIQ::MSG {}', [msg.toString()]);
		msg = json.fromString(msg.toString());
		let exec = msg.toObject().get('Execute');
		if (!exec) {
			log.info('LIQ::Execute not found', []);
			return;
		}

		if (exec.kind != JSONValueKind.OBJECT) return;
		let actions = exec.toObject().get('actions');
		if (!actions) {
			log.info('LIQ::Actions not found', []);
			return;
		}

		if (actions.kind != JSONValueKind.ARRAY) return;
		let actionsArr = actions.toArray();

		for (let i = 0; i < actionsArr.length; i++) {
			if (actionsArr[i].kind == JSONValueKind.OBJECT) {
				let a = actionsArr[i].toObject();
				let liqCall = a.get('Liquidate');
				if (liqCall) {
					if (liqCall.kind == JSONValueKind.OBJECT) {
						// Repaid asset
						let in_assets = liqCall.toObject().get('in_assets');
						if (
							in_assets &&
							in_assets.kind == JSONValueKind.ARRAY
						) {
							if (
								in_assets.toArray()[0].kind ==
								JSONValueKind.OBJECT
							) {
								let asset = in_assets.toArray()[0].toObject();
								let asset_id = asset.get('token_id');
								let asset_amt = asset.get('amount');
								if (asset_id && asset_amt) {
									liq.asset = asset_id.toString();
								}
							}
						}
						// Collateral asset
						let out_assets = liqCall.toObject().get('out_assets');
						if (
							out_assets &&
							out_assets.kind == JSONValueKind.ARRAY
						) {
							if (
								out_assets.toArray()[0].kind ==
								JSONValueKind.OBJECT
							) {
								let asset = out_assets.toArray()[0].toObject();
								let asset_id = asset.get('token_id');
								let asset_amt = asset.get('amount');
								if (asset_id && asset_amt) {
									liq.market = asset_id.toString();
									liq.amount = BigInt.fromString(
										asset_amt.toString()
									);
									liq.position = getOrCreatePosition(
										liquidation_account_id.toString(),
										asset_id.toString()
									).id;
								}
							}
						}
					}
				}
			}
		}
	}

	liq.save();
}
