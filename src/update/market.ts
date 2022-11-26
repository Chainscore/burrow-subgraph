import { BigInt, log, BigDecimal, near } from "@graphprotocol/graph-ts";
import { Token, Market } from "../../generated/schema";
import { compound } from "../utils/compound";
import { updateApr } from "../utils/rates";
import { getOrCreateToken } from "../helpers/token";


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

	market._last_update_timestamp = BigInt.fromU64(
		receipt.block.header.timestampNanosec
	).div(BigInt.fromI32(1000000));
}
