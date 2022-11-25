import { BigInt, log, BigDecimal, near } from "@graphprotocol/graph-ts";
import { Token, Market } from "../../generated/schema";
import { compound } from "../compound";
import { assets, BI_ZERO, BD_ZERO, ADDRESS_ZERO } from "../const";
import { updateApr } from "../rates";
import { getOrCreateProtocol } from "./protocol";

export function getOrCreateToken(id: string): Token {
	let token = Token.load(id);
	if (!token) {
		token = new Token(id);
		token.name = "";
		token.decimals = 0;
		token.symbol = "";
		token.extraDecimals = 0;
		token.lastPriceUSD = BD_ZERO;
		token.lastPriceBlockNumber = BI_ZERO;

		let metadata = assets.get(id);
		if (metadata) {
			token.name = metadata.name;
			token.decimals = metadata.decimals as i32;
			token.symbol = metadata.symbol;
		} else {
			log.info("Token metadata not found {}", [id]);
		}

		token.save();
	}
	return token;
}
