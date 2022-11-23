import { Market, InterestRate } from "../generated/schema";
import { BigDecimal, BigInt, near, log } from "@graphprotocol/graph-ts";
import { BD_ONE, BD_ZERO, BI_ZERO } from "./const";
import { getOrCreateBorrowRate, getOrCreateSupplyRate, getOrCreateToken } from "./helpers";
import { bigDecimalExponential } from "./utils";

const BI_BD = (n: BigInt): BigDecimal => BigDecimal.fromString(n.toString());
const BD = (n: string): BigDecimal => BigDecimal.fromString(n);


export function getRate(market: Market): BigDecimal {
	if (market._totalDeposited.equals(BI_ZERO)) {
		return BD_ONE;
	}
	let pos = BI_BD(market._totalBorrowed).div(
		BI_BD(market._totalReserved.plus(market._totalDeposited))
	);
	market._utilization = pos;
	let target = BI_BD(market._target_utilization).div(BD("10000"));
	let rate = BD_ZERO;

	if (pos.le(target)) {

		// BigDecimal::one() + pos * (BigDecimal::from(self.target_utilization_rate) - BigDecimal::one())/ target_utilization
		
        let highPos = BI_BD(market._target_utilization_rate)
			.div(BD("1000000000000000000000000000"))
			.minus(BD_ONE)
			.div(target);
		rate = BD_ONE.plus(pos.times(highPos));
	} else {

		// BigDecimal::from(self.target_utilization_rate) + (pos - target_utilization) * (BigDecimal::from(self.max_utilization_rate) - BigDecimal::from(self.target_utilization_rate)) / BigDecimal::from_ratio(MAX_POS - self.target_utilization)

		rate = BI_BD(market._target_utilization_rate)
			.div(BD("1000000000000000000000000000"))
			.plus(
				pos
					.minus(target)
					.times(
						BI_BD(market._max_utilization_rate)
							.minus(BI_BD(market._target_utilization_rate))
							.div(BD("1000000000000000000000000000"))
					)
					.div(BD_ONE.minus(target))
			);
	}

	if (rate.lt(BD_ONE) || rate.gt(BD("1.1"))) {
		log.warning("getRate() :: RATE TOO BIG :: {}", [rate.toString()]);
		rate = BD_ONE;
	}

	return rate;
}

export function updateApr(market: Market): void {
	let rate = getRate(market);
	if (rate.equals(BD_ONE)) return;

	let borrow_apr = bigDecimalExponential(
		rate.minus(BD_ONE),
		BD("31536000000")
	).minus(BD_ONE);
	let annualBorrowInterest = BD(market._totalBorrowed.toString()).times(
		borrow_apr
	);
	let annualSupplyInterest = annualBorrowInterest.times(
		BD_ONE.minus(BI_BD(market._reserveRatio).div(BD("10000")))
	);
	let supply_apr = annualSupplyInterest.div(
		BD(market._totalDeposited.toString())
	);

	/* -------------------------------------------------------------------------- */
	/*                                 Supply Rate                                */
	/* -------------------------------------------------------------------------- */
	let supply_rate = getOrCreateSupplyRate(market);
	supply_rate.rate = supply_apr.times(BD("100"));
	supply_rate.save();

	/* -------------------------------------------------------------------------- */
	/*                                 Borrow Rate                                */
	/* -------------------------------------------------------------------------- */
	let borrow_rate = getOrCreateBorrowRate(market);
	borrow_rate.rate = borrow_apr.times(BD("100"));
	borrow_rate.save();
}