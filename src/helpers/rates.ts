import { Market, InterestRate } from "../../generated/schema";

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
