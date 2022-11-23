import {
	near,
	BigInt,
	JSONValue,
	TypedMap,
	log,
	BigDecimal,
	JSONValueKind,
	json,
} from '@graphprotocol/graph-ts';
import {
	getOrCreateController,
	getOrCreateToken,
} from './helpers';

export function handleOracleCall(
	method: string,
	args: string, // only for logging: remove afterwards
	data: TypedMap<string, JSONValue>,
	receipt: near.ReceiptWithOutcome
): void {
	let controller = getOrCreateController();
	let eventArgsArr = data.get('data');
	if (!eventArgsArr) {
		log.info('ORACLE::Data not found {}', [args]);
		return;
	}
	if (eventArgsArr.kind != JSONValueKind.OBJECT) {
		log.info('ORACLE::Incorrect type eventArgsArr {}', [
			eventArgsArr.kind.toString(),
		]);
		return;
	}
	let eventArgs = eventArgsArr.toObject();
	let prices = eventArgs.get('prices');
	if (!prices) {
		log.info('ORACLE::Prices not found. Args: {}', [args]);
		return;
	} else if (prices.kind !== JSONValueKind.ARRAY) {
		log.info('ORACLE::Prices kind not array {}', [prices.kind.toString()]);
		return;
	}
	let pricesArr = prices.toArray();

	for (let i = 0; i < pricesArr.length; i++) {
		if (pricesArr[i].kind != JSONValueKind.OBJECT) {
			log.info('ORACLE::Incorrect type pricesArr {}', [
				pricesArr[i].kind.toString(),
			]);
			return;
		}

		/* -------------------------------------------------------------------------- */
		/*                                  Asset ID                                  */
		/* -------------------------------------------------------------------------- */
		let price = pricesArr[i].toObject();
		let token_id = price.get('asset_id');
		if (!token_id) {
			log.info('ORACLE::Token unable to parse {}', ['token_id']);
			return;
		}

		/* -------------------------------------------------------------------------- */
		/*                                    Price                                   */
		/* -------------------------------------------------------------------------- */
		let priceObj = price.get('price');
		if (!priceObj) {
			log.info('ORACLE::Token unable to parse {}', ['priceObj']);
			return;
		}
		if (priceObj.kind != JSONValueKind.OBJECT) {
			log.info('ORACLE::Incorrect type priceObj {}', [
				priceObj.kind.toString(),
			]);
			return;
		}

		/* -------------------------------------------------------------------------- */
		/*                                 Multiplier                                 */
		/* -------------------------------------------------------------------------- */
		let multiplier = priceObj.toObject().get('multiplier');
		let decimals = priceObj.toObject().get('decimals');
		if (!multiplier || !decimals) {
			log.info('ORACLE::Token unable to get {}', [
				'multiplier | decimals',
			]);
			return;
		}

		if (
			multiplier.kind != JSONValueKind.STRING &&
			decimals.kind != JSONValueKind.NUMBER
		) {
			log.info('ORACLE::Incorrect type multiplier {} decimals {}', [
				multiplier.kind.toString(),
				decimals.kind.toString(),
			]);
			return;
		}

		let token = getOrCreateToken(token_id.toString());
		let decimalFactor = decimals.toI64() - token.decimals;
		if (decimalFactor > 254 || decimalFactor < 0) {
			log.warning(
				'ORACLE::Decimal factor {} Token {} OracleDecimals {} TokenDecimals  {} Extradecimals {}',
				[
					decimalFactor.toString(),
					token.id,
					decimals.toI64().toString(),
					token.decimals.toString(),
					token.extraDecimals.toString()
				]
			);
			decimalFactor = 0;
		}

		token.lastPriceUSD = BigDecimal.fromString(multiplier.toString()).div(
			BigInt.fromI32(10)
				.pow(decimalFactor as u8)
				.toBigDecimal()
		);

		token.lastPriceBlockNumber = BigInt.fromString(
			receipt.block.header.height.toString()
		);
		token.save();
	}
}