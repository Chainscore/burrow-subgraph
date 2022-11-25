import { dataSource, log } from "@graphprotocol/graph-ts";
import { LendingProtocol, Market } from "../../generated/schema";
import { BD_ZERO } from "../const";

export function getOrCreateProtocol(): LendingProtocol {
	let protocol = LendingProtocol.load(dataSource.address().toHex());
	if (!protocol) {
		protocol = new LendingProtocol(dataSource.address().toBase58());
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
		protocol._marketIds = new Array<string>(0);
		protocol.save();
	}
	return protocol;
}

export function updateProtocol(): void {
	let protocol = getOrCreateProtocol();

	protocol.totalValueLockedUSD = BD_ZERO;
	protocol.cumulativeSupplySideRevenueUSD = BD_ZERO;
	protocol.cumulativeProtocolSideRevenueUSD = BD_ZERO;
	protocol.cumulativeTotalRevenueUSD = BD_ZERO;
	protocol.totalDepositBalanceUSD = BD_ZERO;
	protocol.cumulativeDepositUSD = BD_ZERO;
	protocol.totalBorrowBalanceUSD = BD_ZERO;
	protocol.cumulativeBorrowUSD = BD_ZERO;
	protocol.cumulativeLiquidateUSD = BD_ZERO;
	protocol.openPositionCount = 0;
	protocol.cumulativePositionCount = 0;

	for (let i = 0; i < protocol._marketIds.length; i++) {
		let market = Market.load(protocol._marketIds[i]);
		if (market) {
			// totalValueLockedUSD
			protocol.totalValueLockedUSD = protocol.totalValueLockedUSD.plus(
				market.totalValueLockedUSD
			);
			// cumulativeSupplySideRevenueUSD
			protocol.cumulativeSupplySideRevenueUSD = protocol.cumulativeSupplySideRevenueUSD.plus(
				market.cumulativeSupplySideRevenueUSD
			);
			// cumulativeProtocolSideRevenueUSD
			protocol.cumulativeProtocolSideRevenueUSD = protocol.cumulativeProtocolSideRevenueUSD.plus(
				market.cumulativeProtocolSideRevenueUSD
			);
			// cumulativeTotalRevenueUSD
			protocol.cumulativeTotalRevenueUSD = protocol.cumulativeTotalRevenueUSD.plus(
				market.cumulativeTotalRevenueUSD
			);
			// totalDepositBalanceUSD
			protocol.totalDepositBalanceUSD = protocol.totalDepositBalanceUSD.plus(
				market.totalDepositBalanceUSD
			);
			// cumulativeDepositUSD
			protocol.cumulativeDepositUSD = protocol.cumulativeDepositUSD.plus(
				market.cumulativeDepositUSD
			);
			// totalBorrowBalanceUSD
			protocol.totalBorrowBalanceUSD = protocol.totalBorrowBalanceUSD.plus(
				market.totalBorrowBalanceUSD
			);
			// cumulativeBorrowUSD
			protocol.cumulativeBorrowUSD = protocol.cumulativeBorrowUSD.plus(
				market.cumulativeBorrowUSD
			);
			// cumulativeLiquidateUSD
			protocol.cumulativeLiquidateUSD = protocol.cumulativeLiquidateUSD.plus(
				market.cumulativeLiquidateUSD
			);
			// openPositionCount
			protocol.openPositionCount =
				protocol.openPositionCount + market.openPositionCount;
			// cumulativePositionCount
			protocol.cumulativePositionCount =
				protocol.cumulativePositionCount +
				market.openPositionCount +
				market.closedPositionCount;
		}
	}

	protocol.save();
}
