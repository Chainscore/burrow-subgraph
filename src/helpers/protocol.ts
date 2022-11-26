import { dataSource, log } from "@graphprotocol/graph-ts";
import { LendingProtocol, Market } from "../../generated/schema";
import { BD_ZERO } from "../utils/const";

export function getOrCreateProtocol(): LendingProtocol {
	let protocol = LendingProtocol.load(dataSource.address().toString());
	if (!protocol) {
		protocol = new LendingProtocol(dataSource.address().toString());
		protocol.name = "Burrow Cash";
		protocol.slug = "BURROW";
		protocol.schemaVersion = "1.0.0";
		protocol.subgraphVersion = "1.0.0";
		protocol.methodologyVersion = "1.0.0";
		protocol.network = "NEAR_MAINNET";
		protocol.type = "LENDING";
		protocol.totalValueLockedUSD = BD_ZERO;
		protocol.protocolControlledValueUSD = BD_ZERO;
		protocol.cumulativeUniqueUsers = 0;
		protocol.cumulativeSupplySideRevenueUSD = BD_ZERO;
		protocol.cumulativeProtocolSideRevenueUSD = BD_ZERO;
		protocol.cumulativeTotalRevenueUSD = BD_ZERO;
		protocol.totalPoolCount = 0;
		protocol._marketIds = new Array<string>();
		protocol.save();
	}
	return protocol;
}
