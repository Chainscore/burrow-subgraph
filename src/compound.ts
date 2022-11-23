import { Market, InterestRate } from "../generated/schema";
import { BigDecimal, BigInt, near, log } from "@graphprotocol/graph-ts";
import { BD_ONE, BD_ZERO, BI_ZERO } from "./const";
import { getOrCreateBorrowRate, getOrCreateToken } from "./helpers";
import { getRate } from "./rates";
import { bigDecimalExponential } from "./utils";

const BI_BD = (n: BigInt): BigDecimal => BigDecimal.fromString(n.toString());
const BD = (n: string): BigDecimal => BigDecimal.fromString(n);

const BIGDECIMAL_ONE = BD("1");
const BIGDECIMAL_TWO = BD("2");
const BIGDECIMAL_THREE = BD("3");
const BIGDECIMAL_TWELVE = BD("12");
const BIGDECIMAL_SIX = BD("6");


export function compound(market: Market, block: near.Block): Market {
	let time_diff_ms = BigInt.fromU64((block.header.timestampNanosec / (1e6 as u64))).minus(market._last_update_timestamp);
	
	if (time_diff_ms.gt(BI_ZERO)) {
		// update timestamp
		market._last_update_timestamp = market._last_update_timestamp.plus(
			time_diff_ms
		);

		let rate = getRate(market);
		let interestScaled = bigDecimalExponential(
			rate.minus(BD_ONE),
			time_diff_ms.toBigDecimal()
		);

		let interest = interestScaled
			.times(BI_BD(market._totalBorrowed))
			.minus(BI_BD(market._totalBorrowed))
			.truncate(0);

		if (interestScaled.gt(BD("1.01"))) {
			log.warning(
				"compound() :: Interest scaled too big {} time {} apr {}",
				[
					interestScaled.toString(),
					time_diff_ms.toString(),
					getOrCreateBorrowRate(market).rate.toString(),
				]
			);
			return market;
		} else if (interestScaled.equals(BD_ONE)) {
			log.warning(
				"compound() :: Interest scaled is zero {} time {} apr {}",
				[
					interestScaled.toString(),
					time_diff_ms.toString(),
					rate.toString(),
				]
			);
			return market;
		} else if (interestScaled.lt(BD_ZERO)) {
			log.warning(
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
			.times(market._reserveRatio.divDecimal(BD("10000")))
			.truncate(0);

		if (market._totalDeposited.ge(BI_ZERO)) {
			market._totalReserved = market._totalReserved.plus(BigInt.fromString(reserved.toString()));
			market._totalDeposited = market._totalDeposited.plus(
				BigInt.fromString(interest.minus(reserved).toString())
			);
		} else {
			market._totalReserved = market._totalReserved.plus(
				BigInt.fromString(interest.toString())
			);
		}
		market._totalBorrowed = market._totalBorrowed.plus(
			BigInt.fromString(interest.toString())
		);
	}
	return market;
}
