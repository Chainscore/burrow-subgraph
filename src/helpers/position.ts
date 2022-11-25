import { Market, Position } from "../../generated/schema";
import { assets, BI_ZERO, BD_ZERO, ADDRESS_ZERO } from "../const";
import { getOrCreateAccount } from "./account";
import { getOrCreateMarket } from "./market";

export function getOrCreatePosition(account: string, market: string, side: string): Position {
	let id = account.concat("-").concat(market).concat("-").concat(side).concat('-0');
	let r = Position.load(id);
	if (!r) {
		r = new Position(id);
		r.account = getOrCreateAccount(account).id;
		r.market = getOrCreateMarket(market).id;
		r.hashOpened = "";
		r.hashClosed = null;
		r.blockNumberOpened = BI_ZERO;
		r.blockNumberClosed = null;
		r.timestampOpened = BI_ZERO;
		r.timestampClosed = null;
		r.side = side;
		r.isCollateral = true;
		r.balance = BI_ZERO;
		r.depositCount = 0;
		r.withdrawCount = 0;
		r.borrowCount = 0;
		r.repayCount = 0;
		r.liquidationCount = 0;
		r.save();
	}
	return r;
}

export function updatePosition(position: Position, market: Market): void {}