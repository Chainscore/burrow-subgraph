import { BigInt, log, BigDecimal, near } from "@graphprotocol/graph-ts";
import { Token, Market } from "../../generated/schema";
import { compound } from "../compound";
import { assets, BI_ZERO, BD_ZERO, ADDRESS_ZERO } from "../const";
import { updateApr } from "../rates";
import { getOrCreateProtocol } from "./protocol";
import { getOrCreateToken } from "./token";

export function getOrCreateMarket(id: string): Market {
	let r = Market.load(id);
	if (!r) {
		let token = getOrCreateToken(id);
        let protocol = getOrCreateProtocol();

		r = new Market(id);
		r.protocol = protocol.id;
		r.name = token.name;
		r.isActive = false;
		r.canUseAsCollateral = false;
		r.canBorrowFrom = false;
		r.maximumLTV = BD_ZERO;
		r.liquidationThreshold = BD_ZERO;
		r.liquidationPenalty = BD_ZERO;
		r.inputToken = token.id;
		r.outputToken = ADDRESS_ZERO;

		// quants
		r.rates = [
			"SUPPLY-VARIABLE-".concat(id),
			"BORROW-VARIABLE-".concat(id),
		];
		r.totalValueLockedUSD = BD_ZERO;
		r.cumulativeSupplySideRevenueUSD = BD_ZERO;
		r.cumulativeProtocolSideRevenueUSD = BD_ZERO;
		r.cumulativeTotalRevenueUSD = BD_ZERO;
		r.totalDepositBalanceUSD = BD_ZERO;
		r.cumulativeDepositUSD = BD_ZERO;
		r.totalBorrowBalanceUSD = BD_ZERO;
		r.cumulativeBorrowUSD = BD_ZERO;
		r.cumulativeLiquidateUSD = BD_ZERO;
		// token balances
		r.inputTokenBalance = BI_ZERO;
		r.inputTokenPriceUSD = BD_ZERO;
		r.outputTokenSupply = BI_ZERO;
		r.outputTokenPriceUSD = BD_ZERO;
		r.exchangeRate = BD_ZERO;

		r.createdTimestamp = BigInt.fromI32(0);
		r.createdBlockNumber = BigInt.fromI32(0);
		r.positionCount = 0;
		r.openPositionCount = 0;
		r.closedPositionCount = 0;
		r.lendingPositionCount = 0;
		r.borrowingPositionCount = 0;

		r._last_update_timestamp = BigInt.fromI32(0);

		r._reserveRatio = BI_ZERO;
		r._target_utilization = BI_ZERO;
		r._target_utilization_rate = BI_ZERO;
		r._max_utilization_rate = BI_ZERO;
		r._volatility_ratio = BI_ZERO;

		r._totalWithrawnHistory = BI_ZERO;
		r._totalDepositedHistory = BI_ZERO;

		r._totalBorrowed = BI_ZERO;
		r._totalBorrowedHistory = BI_ZERO;
		r._totalRepaidHistory = BI_ZERO;

		r.save();
	}
	return r;
}

export function updateMarket(
	market: Market,
	receipt: near.ReceiptWithOutcome
): void {
	let token = getOrCreateToken(market.inputToken);

	/*** update apr and compound values ***/
	updateApr(market);
	compound(market, receipt.block);

	// inputTokenPriceUSD
	market.inputTokenPriceUSD = token.lastPriceUSD!;
	// totalDepositBalanceUSD
	market.totalDepositBalanceUSD = market.inputTokenBalance
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(market.inputTokenPriceUSD);
	// cumulativeDepositUSD
	market.cumulativeDepositUSD = market._totalDepositedHistory
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(market.inputTokenPriceUSD);
	// totalValueLockedUSD
	market.totalValueLockedUSD = market.totalDepositBalanceUSD;
	// cumulativeSupplySideRevenueUSD, cumulativeTotalRevenueUSD
	market.cumulativeSupplySideRevenueUSD = market._totalReserved
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(market.inputTokenPriceUSD);

	market.cumulativeTotalRevenueUSD = market.cumulativeSupplySideRevenueUSD;
	// totalBorrowBalanceUSD
	market.totalBorrowBalanceUSD = market._totalBorrowed
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(market.inputTokenPriceUSD);
	// cumulativeBorrowUSD
	market.cumulativeBorrowUSD = market._totalBorrowedHistory
		.toBigDecimal()
		.div(
			BigInt.fromI32(10)
				.pow((token.decimals + token.extraDecimals) as u8)
				.toBigDecimal()
		)
		.times(market.inputTokenPriceUSD);

	// TODO: cumulativeLiquidateUSD

	// exchangeRate
	market.exchangeRate = market.inputTokenBalance
		.toBigDecimal()
		.div(market.outputTokenSupply.toBigDecimal());
	// outputTokenPriceUSD
	market.outputTokenPriceUSD = market.exchangeRate!.times(
		market.inputTokenPriceUSD
	);
}

