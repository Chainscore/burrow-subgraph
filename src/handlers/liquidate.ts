import {
	BigInt,
	log,
	BigDecimal,
	JSONValueKind,
	json,
} from "@graphprotocol/graph-ts";
import { getOrCreateAccount } from "../helpers/account";
import { getOrCreatePosition } from "../helpers/position";

import { getOrCreateLiquidation } from "../helpers/actions";
import {
	getOrCreateMarket,
	getOrCreateMarketDailySnapshot,
	getOrCreateMarketHourlySnapshot,
} from "../helpers/market";

import { updateProtocol } from "../update/protocol";
import {
	getOrCreateProtocol,
	getOrCreateUsageMetricsDailySnapshot,
	getOrCreateUsageMetricsHourlySnapshot,
	getOrCreateFinancialDailySnapshot,
} from "../helpers/protocol";
import { Position, _PositionCounter } from "../../generated/schema";
import { BI_ZERO, BI_BD, NANOSEC_TO_SEC } from "../utils/const";
import { EventData } from "../utils/type";

// { account_id, liquidation_account_id, collateral_sum, repaid_sum }
export function handleLiquidate(event: EventData): void {
	const receipt = event.receipt;
	const data = event.data;
	const logIndex = event.logIndex;
	const args = event.args;

	const protocol = getOrCreateProtocol();

	const usageHourly = getOrCreateUsageMetricsHourlySnapshot(receipt);
	usageHourly.hourlyLiquidateCount += 1;
	const usageDaily = getOrCreateUsageMetricsDailySnapshot(receipt);
	usageDaily.dailyLiquidateCount += 1;
	const financialDaily = getOrCreateFinancialDailySnapshot(receipt);

	/* -------------------------------------------------------------------------- */
	/*                                 Liquidator                                 */
	/* -------------------------------------------------------------------------- */
	const account_id = data.get("account_id");
	if (!account_id) {
		log.info("{} data not found", ["account_id"]);
		return;
	}

	const liquidator = getOrCreateAccount(account_id.toString());
	if (liquidator.liquidateCount == 0) {
		protocol.cumulativeUniqueLiquidators =
			protocol.cumulativeUniqueLiquidators + 1;
	}
	if (liquidator._last_active_timestamp.lt(usageDaily.timestamp)) {
		usageDaily.dailyActiveLiquidators += 1;
	}

	liquidator.liquidateCount += 1;

	/* -------------------------------------------------------------------------- */
	/*                                 Liquidatee                                 */
	/* -------------------------------------------------------------------------- */
	const liquidation_account_id = data.get("liquidation_account_id");
	if (!liquidation_account_id) {
		log.info("{} data not found", ["liquidation_account_id"]);
		return;
	}
	const liquidatee = getOrCreateAccount(liquidation_account_id.toString());
	if (liquidatee.liquidationCount == 0) {
		protocol.cumulativeUniqueLiquidatees =
			protocol.cumulativeUniqueLiquidatees + 1;
	}
	if (liquidatee._last_active_timestamp.lt(usageDaily.timestamp)) {
		usageDaily.dailyActiveLiquidatees += 1;
	}
	liquidatee.liquidationCount += 1;

	/* -------------------------------------------------------------------------- */
	/*                              Collateral Amount                             */
	/* -------------------------------------------------------------------------- */
	const collateral_sum = data.get("collateral_sum");
	if (!collateral_sum) {
		log.info("{} data not found", ["collateral_sum"]);
		return;
	}

	const collateral_sum_value = BigDecimal.fromString(
		collateral_sum.toString()
	);

	/* -------------------------------------------------------------------------- */
	/*                                Repaid Amount                               */
	/* -------------------------------------------------------------------------- */
	const repaid_sum = data.get("repaid_sum");
	if (!repaid_sum) {
		log.info("{} data not found", ["repaid_sum"]);
		return;
	}
	const repaid_sum_value = BigDecimal.fromString(repaid_sum.toString());

	// discount
	const discountFactor = repaid_sum_value.div(collateral_sum_value);

	// finding token_in, token_in_amount, token_out and token_out_amount
	// TOKEN_IN: borrowed token
	// TOKEN_OUT: collateral token
	let token_in: string[] = new Array<string>(),
		token_out: string[] = new Array<string>();
	let token_in_amount: string[] = new Array<string>(),
		token_out_amount: string[] = new Array<string>();
	if (args) {
		let msg = args.get("msg");
		msg = json.fromString(msg!.toString());
		const exec = msg.toObject().get("Execute");
		const actions = exec!.toObject().get("actions");
		const actionsArr = actions!.toArray();

		for (let i = 0; i < actionsArr.length; i++) {
			if (actionsArr[i].kind == JSONValueKind.OBJECT) {
				const a = actionsArr[i].toObject();
				const liqCall = a.get("Liquidate");
				if (liqCall) {
					if (liqCall.kind == JSONValueKind.OBJECT) {
						/* -------------------------------------------------------------------------- */
						/*                       Repaid asset: id & amount                            */
						/* -------------------------------------------------------------------------- */
						const in_assets = liqCall.toObject().get("in_assets");
						const in_assets_array = in_assets!.toArray();
							for(let i = 0; i < in_assets_array.length; i++){
								const asset = in_assets_array[i].toObject();
								const asset_id = asset.get("token_id")!.toString();
								const asset_amt = asset.get("amount")!.toString();
								token_in.push(asset_id);
								token_in_amount.push(asset_amt);
							}
							
						}
						/* -------------------------------------------------------------------------- */
						/*                            Collateral asset: id & amount                   */
						/* -------------------------------------------------------------------------- */
						const out_assets = liqCall.toObject().get("out_assets");
						const out_assets_array = out_assets!.toArray();
						for(let i = 0; i < out_assets_array.length; i++){
								const asset = out_assets_array[i].toObject();
								const asset_id = asset.get("token_id");
								const asset_amt = asset.get("amount");
								token_out.push(asset_id!.toString());
								token_out_amount.push(asset_amt!.toString());
						}
					}
				}
			}
		}
	

	for(let i = 0; i < token_in.length; i++){
		const liq = getOrCreateLiquidation(
			receipt.outcome.id
				.toBase58()
				.concat("-")
				.concat(i.toString()),
			receipt
		);
		liq.liquidator = liquidator.id;
		liq.liquidatee = liquidatee.id;
		

		liq.logIndex = logIndex as i32;
		const repaidMarket = getOrCreateMarket(token_in[i]);
		const dailySnapshot = getOrCreateMarketDailySnapshot(
			repaidMarket,
			receipt
		);
		const hourlySnapshot = getOrCreateMarketHourlySnapshot(
			repaidMarket,
			receipt
		);
		const repaidCounterID = liquidatee.id
			.concat("-")
			.concat(repaidMarket.id)
			.concat("-")
			.concat("BORROWER");
		const repaidCounter = _PositionCounter.load(repaidCounterID);
		if (!repaidCounter) {
			log.warning("[subtractPosition] position counter {} not found", [
				repaidCounterID,
			]);
			return;
		}
		const repaidPosition = getOrCreatePosition(
			liquidatee,
			repaidMarket,
			"BORROWER",
			receipt,
			repaidCounter.nextCount
		);
		repaidPosition.balance = repaidPosition.balance.minus(
			BigInt.fromString(token_in_amount[i])
		);
		if (repaidPosition.balance.lt(BI_ZERO)) {
			repaidPosition.hashClosed = receipt.receipt.id.toBase58();
			repaidPosition.blockNumberClosed = BigInt.fromU64(
				receipt.block.header.height
			);
			repaidPosition.timestampClosed = BigInt.fromU64(
				NANOSEC_TO_SEC(receipt.block.header.timestampNanosec)
			);
			repaidCounter.nextCount += 1;
			// closing borrowed position
			repaidMarket.openPositionCount -= 1;
			repaidMarket.closedPositionCount += 1;
		}
		repaidPosition.save();

		const repaidUSD = BigDecimal.fromString(token_in_amount[i]).times(
			repaidMarket.inputTokenPriceUSD
		);

		repaidMarket.cumulativeLiquidateUSD = repaidMarket.cumulativeLiquidateUSD.plus(
			repaidUSD
		);
		repaidMarket._totalBorrowed = repaidMarket._totalBorrowed.minus(
			BigDecimal.fromString(token_in_amount[i])
		);
		repaidMarket._totalDeposited = repaidMarket._totalDeposited.minus(
			BigDecimal.fromString(token_in_amount[i])
		);

		liq.amountUSD = repaidUSD;
		liq.profitUSD = repaidUSD.times(discountFactor);
		liq.market = repaidMarket.id;

		liq.save();
		repaidCounter.save();
		repaidPosition.save();
		dailySnapshot.save();
		hourlySnapshot.save();
		repaidMarket.save();
	}

	for(let i = 0; i < token_out.length; i++){
		const collateralMarket = getOrCreateMarket(token_out[i]);
		const collateralCounterID = liquidatee.id
			.concat("-")
			.concat(collateralMarket.id)
			.concat("-")
			.concat("BORROWER");
		const collateralCounter = _PositionCounter.load(collateralCounterID);
		if (!collateralCounter) {
			log.warning("[subtractPosition] position counter {} not found", [
				collateralCounterID,
			]);
			return;
		}
		const collateralPosition = getOrCreatePosition(
			liquidatee,
			collateralMarket,
			"LENDER",
			receipt,
			collateralCounter.nextCount
		);

		collateralPosition.balance = collateralPosition.balance.minus(
			BigInt.fromString(token_out_amount[i])
		);
		if (collateralPosition.balance.lt(BI_ZERO)) {
			collateralPosition.balance = BI_ZERO;
			collateralPosition.hashClosed = receipt.receipt.id.toBase58();
			collateralPosition.blockNumberClosed = BigInt.fromU64(
				receipt.block.header.height
			);
			collateralPosition.timestampClosed = BigInt.fromU64(
				NANOSEC_TO_SEC(receipt.block.header.timestampNanosec)
			);
			collateralCounter.nextCount += 1;
			// closing collateral position
			collateralMarket.openPositionCount -= 1;
			collateralMarket.closedPositionCount += 1;
			liquidatee.openPositionCount -= 1;
		}
		collateralCounter.save();
		collateralPosition.save();
		collateralMarket.save();
	}

	liquidator.save();
	liquidatee.save();
	financialDaily.dailyLiquidateUSD = financialDaily.dailyLiquidateUSD.plus(
		repaid_sum_value
	);
	financialDaily.save();
	protocol.save();
	usageHourly.save();
	usageDaily.save();
	updateProtocol();
}

export function handleForceClose(event: EventData): void {
	const receipt = event.receipt;
	const data = event.data;

	const protocol = getOrCreateProtocol();
	const dailyProtocol = getOrCreateUsageMetricsDailySnapshot(receipt);
	const hourlyProtocol = getOrCreateUsageMetricsHourlySnapshot(receipt);
	const financialDaily = getOrCreateFinancialDailySnapshot(receipt);

	const liquidator = getOrCreateAccount(receipt.receipt.signerId);
	liquidator.liquidateCount += 1;
	liquidator.save();

	const liquidation_account_id = data.get("liquidation_account_id");
	if (!liquidation_account_id) {
		log.info("{} data not found", ["liquidation_account_id"]);
		return;
	}

	const collateral_sum = data.get("collateral_sum");
	if (!collateral_sum) {
		log.info("{} data not found", ["collateral_sum"]);
		return;
	}
	const repaid_sum = data.get("repaid_sum");
	if (!repaid_sum) {
		log.info("{} data not found", ["repaid_sum"]);
		return;
	}

	const liquidatee = getOrCreateAccount(liquidation_account_id.toString());
	if (liquidatee.liquidationCount == 0) {
		protocol.cumulativeUniqueLiquidatees =
			protocol.cumulativeUniqueLiquidatees + 1;
	}
	liquidatee.liquidationCount += 1;
	liquidatee.save();

	protocol.cumulativeLiquidateUSD = protocol.cumulativeLiquidateUSD.plus(
		BigDecimal.fromString(repaid_sum.toString())
	);
	financialDaily.dailyLiquidateUSD = financialDaily.dailyLiquidateUSD.plus(
		BigDecimal.fromString(repaid_sum.toString())
	);
	hourlyProtocol.hourlyLiquidateCount += 1;
	dailyProtocol.dailyLiquidateCount += 1;
	if (liquidator.liquidateCount == 0) {
		protocol.cumulativeUniqueLiquidators += 1;
		dailyProtocol.cumulativeUniqueLiquidators += 1;
	}
	if (liquidator._last_active_timestamp.lt(dailyProtocol.timestamp)) {
		dailyProtocol.dailyActiveLiquidators += 1;
	}
	if (liquidatee.liquidationCount == 0) {
		protocol.cumulativeUniqueLiquidatees += 1;
		dailyProtocol.cumulativeUniqueLiquidatees += 1;
	}
	if (liquidatee._last_active_timestamp.lt(dailyProtocol.timestamp)) {
		dailyProtocol.dailyActiveLiquidatees += 1;
	}
	protocol.save();

	// let all position of liquidatee
	const markets = protocol._marketIds;
	for (let i = 0; i < markets.length; i++) {
		const market = getOrCreateMarket(markets[i]);
		const borrow_position = Position.load(
			markets[i]
				.concat("-")
				.concat(liquidation_account_id.toString())
				.concat("-BORROWER")
		);
		const supply_position = Position.load(
			markets[i]
				.concat("-")
				.concat(liquidation_account_id.toString())
				.concat("-BORROWER")
		);
		if (borrow_position) {
			if (borrow_position.balance.gt(BI_ZERO)) {
				market._totalBorrowed = market._totalBorrowed.minus(
					BI_BD(borrow_position.balance)
				);
				market._totalDeposited = market._totalDeposited.minus(
					BI_BD(borrow_position.balance)
				);
				market._totalReserved = market._totalReserved.plus(
					BI_BD(borrow_position.balance)
				);
				borrow_position.balance = BI_ZERO;
				borrow_position.hashClosed = receipt.receipt.id.toBase58();
				borrow_position.timestampClosed = BigInt.fromU64(
					NANOSEC_TO_SEC(receipt.block.header.timestampNanosec)
				);
				borrow_position.save();
			}
		}
		if (supply_position) {
			if (supply_position.balance.gt(BI_ZERO)) {
				market._totalDeposited = market._totalDeposited.minus(
					BI_BD(supply_position.balance)
				);
				market._totalReserved = market._totalReserved.plus(
					BI_BD(supply_position.balance)
				);
				supply_position.balance = BI_ZERO;
				supply_position.hashClosed = receipt.receipt.id.toBase58();
				supply_position.timestampClosed = BigInt.fromU64(
					NANOSEC_TO_SEC(receipt.block.header.timestampNanosec)
				);
				supply_position.save();
			}
		}
	}
}
