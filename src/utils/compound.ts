import { Market, InterestRate } from "../../generated/schema";
import { BigDecimal, BigInt, near, log } from "@graphprotocol/graph-ts";
import { BD_ONE, BD_ZERO, BI_ZERO } from "./const";
import { getOrCreateBorrowRate } from "../helpers/rates";

import { getRate } from "./rates";
import { bigDecimalExponential } from "./math";

const BD = (n: string): BigDecimal => BigDecimal.fromString(n);

export function compound(market: Market, receipt: near.ReceiptWithOutcome): Market {
	let time_diff_ms = BigInt.fromU64((receipt.block.header.timestampNanosec / 1000000)).minus(market._last_update_timestamp);
	
	if (time_diff_ms.gt(BI_ZERO)) {
		
		let rate = getRate(market);
		let interestScaled = bigDecimalExponential(
			rate.minus(BD_ONE),
			time_diff_ms.toBigDecimal()
		);

		let interest = interestScaled
			.times(market._totalBorrowed.toBigDecimal())
			.minus(market._totalBorrowed.toBigDecimal())
			.truncate(0);

		if (interestScaled.gt(BD("2"))) {
			log.critical(
				"compound() :: Interest scaled too big {} time {} rate {} utilization {}",
				[
					interestScaled.toString(),
					time_diff_ms.toString(),
					rate.toString(),
					market._utilization.toString()
				]
			);
			return market;
		} else if (interestScaled.equals(BD_ONE)) {
			return market;
		} else if (interestScaled.lt(BD_ZERO)) {
			log.critical(
				"compound() :: Interest scaled is negative {} time {} apr {} {} {}",
				[
					interestScaled.toString(),
					time_diff_ms.toString(),
					rate.toString(),
					rate.minus(BD_ONE).toString(),
					time_diff_ms.toBigDecimal().toString(),
				]
			);
			return market;
		}

		// TODO: Split interest based on ratio between reserved and supplied?
		let reserved = interest
			.times(market._reserveRatio.toBigDecimal()).div(BD("10000"))
			.truncate(0);

		market._totalReserved = market._totalReserved.plus(BigInt.fromString(reserved.toString()));
		market.inputTokenBalance = market.inputTokenBalance.plus(
			BigInt.fromString(interest.minus(reserved).toString())
		);
		market._totalBorrowed = market._totalBorrowed.plus(
			BigInt.fromString(interest.toString())
		);

		// update timestamp
		market._last_update_timestamp = market._last_update_timestamp.plus(time_diff_ms);
	}
	return market;
}
