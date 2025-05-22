import { AnchorProvider, BN, IdlAccounts } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SolanaBettingSystem } from "./solana_betting_system";
type BettingMarket = IdlAccounts<SolanaBettingSystem>["bettingMarket"];
type Bet = IdlAccounts<SolanaBettingSystem>["bet"];
export declare enum PriceDirection {
    Above = 0,
    Below = 1
}
export declare class SolanaBettingSDK {
    private provider;
    private program;
    private programId;
    constructor(provider: AnchorProvider, programId?: PublicKey);
    /**
     * Create a new instance of the SDK
     */
    static connect(connection: Connection, wallet: any, programId?: PublicKey): SolanaBettingSDK;
    /**
     * Get the provider
     */
    getProvider(): AnchorProvider;
    /**
     * Find a market account PDA
     */
    findMarketAddress(authority: PublicKey): Promise<[PublicKey, number]>;
    /**
     * Find a bet account PDA
     */
    findBetAddress(market: PublicKey, betCount: BN): Promise<[PublicKey, number]>;
    /**
     * Initialize a new betting market
     */
    initializeMarket(tokenName: string, oracleAddress: PublicKey): Promise<string>;
    /**
     * Create a new bet
     */
    createBet(market: PublicKey, betAmount: BN, priceThreshold: BN, priceDirection: PriceDirection, settlementTime: BN, mint: PublicKey): Promise<string>;
    /**
     * Match a bet
     */
    matchBet(bet: PublicKey, betEscrow: PublicKey, matcherTokenAccount: PublicKey): Promise<string>;
    /**
     * Settle a bet
     */
    settleBet(bet: PublicKey, market: PublicKey, priceFeed: PublicKey): Promise<string>;
    /**
     * Claim funds from a settled bet
     */
    claimFunds(bet: PublicKey, betEscrow: PublicKey, claimerTokenAccount: PublicKey): Promise<string>;
    /**
     * Fetch a betting market account
     */
    fetchMarket(marketPda: PublicKey): Promise<BettingMarket>;
    /**
     * Fetch a bet account
     */
    fetchBet(betPda: PublicKey): Promise<Bet>;
    /**
     * Fetch all bets for a market
     */
    fetchMarketBets(market: PublicKey): Promise<Bet[]>;
    /**
     * Fetch all bets for a user
     */
    fetchUserBets(user: PublicKey): Promise<Bet[]>;
}
export {};
