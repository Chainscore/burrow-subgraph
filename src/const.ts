import { BigInt, BigDecimal, TypedMap } from '@graphprotocol/graph-ts';

export const BI_ZERO = BigInt.fromString("0")
export const BI_ONE = BigInt.fromString("1")

export const BD_ZERO = BigDecimal.fromString("0")
export const BD_ONE = BigDecimal.fromString("1")
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"
export const assets = new TypedMap<string, TokenMetadata>()

class TokenMetadata {
    constructor(
    public name: string,
    public symbol: string,
    public decimals: number,
    public extraDecimals: number,
    ){}
}

assets.set("meta-pool.near", new TokenMetadata(
    "Staked NEAR",
    "stNEAR",
    24,
    0
))

assets.set("usn", new TokenMetadata(
    "USN Stablecoin",
    "USN",
    24,
    0
))

assets.set("token.burrow.near", new TokenMetadata(
    "Burrow",
    "BRRR",
    18,
    0
))

assets.set("wrap.near", new TokenMetadata(
    "Wrapped Near",
    "wNEAR",
    24,
    0
))

assets.set("dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near", new TokenMetadata(
    "Tether USD",
    "USDT",
    6,
    12
))

assets.set("a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near", new TokenMetadata(
    "USD Coin",
    "USDC",
    6,
    12
))

assets.set("6b175474e89094c44da98b954eedeac495271d0f.factory.bridge.near", new TokenMetadata(
    "DAI Stablecoin",
    "DAI",
    18,
    0
))

assets.set("2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near", new TokenMetadata(
    "Wrapped BTC",
    "wBTC",
    8,
    10
))

assets.set("aurora", new TokenMetadata(
    "Ethereum",
    "ETH",
    18,
    0
))

assets.set("linear-protocol.near", new TokenMetadata(
    "LiNEAR",
    "liNEAR",
    24,
    0
))