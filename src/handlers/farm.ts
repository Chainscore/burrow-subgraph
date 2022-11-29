import { JSONValue, JSONValueKind, log, near, TypedMap, BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { getOrCreateMarket } from "../helpers/market";
import { getOrCreateRewardToken, getOrCreateToken } from '../helpers/token';

/**
 * {
 *      \"farm_id\":{\"Supplied\":\"aurora\"},
 *      \"reward_token_id\":\"token.burrow.near\",
 *      \"new_reward_per_day\":\"864000\",
 *      \"new_booster_log_base\":\"0\",
 *      \"reward_amount\":\"864000000\"
 * }
 */
export function handleAddAssetFarmReward(
    method: string,
	args: string, // only for logging: remove afterwards
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome
): void {
    let farm_id = data.get('farm_id');
    if (!farm_id) {
		log.warning("handleAddAssetFarmReward() :: farm_id not found {}", [args]);
        return;
    }
    if (farm_id.kind != JSONValueKind.OBJECT) {
		log.info("handleAddAssetFarmReward() :: Incorrect type farm_id {}", [
			farm_id.kind.toString(),
		]);
		return;
	}
    let farm_id_obj = farm_id.toObject();
    let farm_id_asset = farm_id_obj.get('Supplied');
    let farmType = 'Supplied';
    if (!farm_id_asset) {
        farm_id_asset = farm_id_obj.get('Borrowed');
        farmType = 'Borrowed';
        if(!farm_id_asset) {
            log.warning("handleAddAssetFarmReward() :: farm_id_asset not found {}", [args]);
            return;
        }
    }
    let farm = farm_id_asset.toString();

    let reward_token_id = data.get('reward_token_id');
    if (!reward_token_id) {
        log.warning("handleAddAssetFarmReward() :: reward_token_id not found {}", [args]);
        return;
    }
    let reward_token = reward_token_id.toString();

    let new_reward_per_day_ = data.get('new_reward_per_day');
    if (!new_reward_per_day_) {
        log.warning("handleAddAssetFarmReward() :: new_reward_per_day not found {}", [args]);
        return;
    }
    let new_reward_per_day = new_reward_per_day_.toString();

    let new_booster_log_base = data.get('new_booster_log_base');
    if (!new_booster_log_base) {
        log.warning("handleAddAssetFarmReward() :: new_booster_log_base not found {}", [args]);
        return;
    }

    let reward_amount = data.get('reward_amount');
    if (!reward_amount) {
        log.warning("handleAddAssetFarmReward() :: reward_amount not found {}", [args]);
        return;
    }

    let rewardToken = getOrCreateRewardToken(reward_token, farmType);

    let market = getOrCreateMarket(farm);
    let reward_tokens = market.rewardTokens!;
    // push if reward token does not exists, get index
    let reward_token_index = reward_tokens.indexOf(rewardToken.id);
    if (reward_token_index == -1) {
        reward_tokens.push(rewardToken.id);
        market.rewardTokens = reward_tokens;
        reward_token_index = reward_tokens.length - 1;
    }
    
    // _reward_remaining_amounts
    if(!market._reward_remaining_amounts){
        market._reward_remaining_amounts = new Array<BigInt>();
    }
    if(!market._reward_remaining_amounts[reward_token_index]) {
        market._reward_remaining_amounts[reward_token_index] = BigInt.fromString(reward_amount.toString());
    } else {
        market._reward_remaining_amounts[reward_token_index] = market._reward_remaining_amounts[reward_token_index].plus(BigInt.fromString(reward_amount.toString()));
    }
    
    // rewardTokenEmissionsAmount
    if(!market.rewardTokenEmissionsAmount) {
        market.rewardTokenEmissionsAmount = new Array<BigInt>();
    }
    market.rewardTokenEmissionsAmount![reward_token_index] = BigInt.fromString(new_reward_per_day.toString());
   
    // rewardTokenEmissionsUSD
    if(!market.rewardTokenEmissionsUSD) {
        market.rewardTokenEmissionsUSD = new Array<BigDecimal>();
    }
    market.rewardTokenEmissionsUSD![reward_token_index] = BigDecimal.fromString(new_reward_per_day.toString()).div(getOrCreateToken(rewardToken.token).lastPriceUSD!);

    market.save();
}