import {
	near,
	BigInt,
	JSONValue,
	TypedMap,
	log,
	JSONValueKind,
} from '@graphprotocol/graph-ts';
import {
	getOrCreateController,
	getOrCreateToken,
	getOrCreateMarket,
} from './helpers';
import { assets } from './const';

export function handleNew(
	method: string,
	args: string, // only for logging: remove afterwards
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome
): void {
	let controller = getOrCreateController();
	let eventArgsArr = data.get('config');
	if (!eventArgsArr) return;
	let eventArgs = eventArgsArr.toObject();
	let oracle = eventArgs.get('oracle_account_id');
	if (!oracle) return;
	let owner = eventArgs.get('owner_id');
	if (!owner) return;
	let booster = eventArgs.get('booster_token_id');
	if (!booster) return;
	let booster_decimals = eventArgs.get('booster_decimals');
	if (!booster_decimals) return;
	let max_num_assets = eventArgs.get('max_num_assets');
	if (!max_num_assets) return;
	let multiplier = eventArgs.get(
		'x_booster_multiplier_at_maximum_staking_duration'
	);
	if (!multiplier) return;
	controller.oracle = oracle.toString();
	controller.owner = owner.toString();
	controller.booster = getOrCreateToken(booster.toString()).id;
	controller.boosterMultiplier = multiplier.toBigInt();
	controller.maxAssets = max_num_assets.data as i32;
	controller.save();
}

export function handleNewAsset(
	method: string,
	args: string, // only for logging: remove afterwards
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome
): void {
	let token_id = data.get('token_id');
	if (!token_id) {
		log.info('NEW_ASSET::Token ID not found {}', [args]);
		return;
	}
	let token = getOrCreateToken(token_id.toString());
	let market = getOrCreateMarket(token_id.toString());

	let assetConfigObj = data.get('asset_config');
	if (!assetConfigObj) {
		log.info('NEW_ASSET::Data not found {}', [args]);
		return;
	}
	if (assetConfigObj.kind != JSONValueKind.OBJECT) {
		log.info('NEW_ASSET::Incorrect type assetConfigObj {}', [
			assetConfigObj.kind.toString(),
		]);
		return;
	}
	let assetConfig = assetConfigObj.toObject();
	
    market.name = token.name;

	market.createdBlockNumber = BigInt.fromI32(
		receipt.block.header.height as i32
	);
    market.createdTimestamp = BigInt.fromI32(
        (receipt.block.header.timestampNanosec / 1000000) as i32
    );

	market._last_update_timestamp = BigInt.fromI32(receipt.block.header.timestampNanosec/(1e6 as u64) as i32);
	
	/* -------------------------------------------------------------------------- */
	/*                                reserve_ratio                               */
	/* -------------------------------------------------------------------------- */
	let reserve_ratio = assetConfig.get('reserve_ratio');
	if (!reserve_ratio) {
		log.info('NEW_ASSET::Reserve ratio not found {}', [args]);
		return;
	}
	market._reserveRatio = BigInt.fromI64(reserve_ratio.toI64());

	/* -------------------------------------------------------------------------- */
	/*                             target_utilization                             */
	/* -------------------------------------------------------------------------- */
	let target_utilization = assetConfig.get('target_utilization');
	if (!target_utilization) {
		log.info('NEW_ASSET::Target utilization not found {}', [args]);
		return;
	}
	market._target_utilization = BigInt.fromI64(target_utilization.toI64());

	/* -------------------------------------------------------------------------- */
	/*                          _target_utilization_rate                          */
	/* -------------------------------------------------------------------------- */
	let target_utilization_rate = assetConfig.get('target_utilization_rate');
	if (!target_utilization_rate) {
		log.info('NEW_ASSET::Target utilization rate not found {}', [args]);
		return;
	}
	market._target_utilization_rate = BigInt.fromString(target_utilization_rate.toString());

	/* -------------------------------------------------------------------------- */
	/*                            max_utilization_ratȩ                           */
	/* -------------------------------------------------------------------------- */
	let max_utilization_rate = assetConfig.get('max_utilization_rate');
	if (!max_utilization_rate) {
		log.info('NEW_ASSET::Max utilization rate not found {}', [args]);
		return;
	}
	market._max_utilization_rate = BigInt.fromString(max_utilization_rate.toString());

	/* -------------------------------------------------------------------------- */
	/*                              volatility_ratio                              */
	/* -------------------------------------------------------------------------- */
	let volatility_ratio = assetConfig.get('volatility_ratio');
	if (!volatility_ratio) {
		log.info('NEW_ASSET::Volatility ratio not found {}', [args]);
		return;
	}
	market._volatility_ratio = BigInt.fromI64(volatility_ratio.toI64());

	/* -------------------------------------------------------------------------- */
	/*                              extra_decimals                                */
	/* -------------------------------------------------------------------------- */
	market.inputToken = token.id;
	let extra_decimals = assetConfig.get('extra_decimals');
	if (!extra_decimals) {
		log.info('NEW_ASSET::extra_decimals ratio not found {}', [args]);
		return;
	}
	token.extraDecimals = extra_decimals.toI64() as i32;
    let asset = assets.get(token_id.toString())
    if(asset){
        token.extraDecimals = asset.extraDecimals as i32
    }

	/* -------------------------------------------------------------------------- */
	/*                          can_use_as_collateral                             */
	/* -------------------------------------------------------------------------- */
	let can_use_as_collateral = assetConfig.get('can_use_as_collateral');
	if (!can_use_as_collateral) {
		log.info('NEW_ASSET::can_use_as_collateral not found {}', [args]);
		return;
	}
	market.canUseAsCollateral = can_use_as_collateral.toBool();

	/* -------------------------------------------------------------------------- */
	/*                                 can_borrow                                 */
	/* -------------------------------------------------------------------------- */
	let can_borrow = assetConfig.get('can_borrow');
	if (!can_borrow) {
		log.info('NEW_ASSET::can_borrow not found {}', [args]);
		return;
	}
	market.canBorrowFrom = can_borrow.toBool();


	/* -------------------------------------------------------------------------- */
	/*                       can_deposit && can_withdraw                          */
	/* -------------------------------------------------------------------------- */
	let can_deposit = assetConfig.get('can_deposit');
	if (!can_deposit) {
		log.info('NEW_ASSET::can_deposit not found {}', [args]);
		return;
	}
	let can_withdraw = assetConfig.get('can_withdraw');
	if (!can_withdraw) {
		log.info('NEW_ASSET::can_withdraw not found {}', [args]);
		return;
	}
	market.isActive = can_deposit.toBool() && can_withdraw.toBool();

	// Save
	token.save();
	market.save();
}
