var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "./idl.json" with { type: "json" };
export var PriceDirection;
(function (PriceDirection) {
    PriceDirection[PriceDirection["Above"] = 0] = "Above";
    PriceDirection[PriceDirection["Below"] = 1] = "Below";
})(PriceDirection || (PriceDirection = {}));
export class SolanaBettingSDK {
    constructor(provider, programId) {
        this.provider = provider;
        this.programId = programId || new PublicKey(idl.address);
        this.program = new Program(idl);
    }
    /**
     * Create a new instance of the SDK
     */
    static connect(connection, wallet, programId) {
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        return new SolanaBettingSDK(provider, programId);
    }
    /**
     * Get the provider
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Find a market account PDA
     */
    findMarketAddress(authority) {
        return __awaiter(this, void 0, void 0, function* () {
            return PublicKey.findProgramAddressSync([Buffer.from("market"), authority.toBuffer()], this.programId);
        });
    }
    /**
     * Find a bet account PDA
     */
    findBetAddress(market, betCount) {
        return __awaiter(this, void 0, void 0, function* () {
            return PublicKey.findProgramAddressSync([
                Buffer.from("bet"),
                market.toBuffer(),
                betCount.toArrayLike(Buffer, "le", 8),
            ], this.programId);
        });
    }
    /**
     * Initialize a new betting market
     */
    initializeMarket(tokenName, oracleAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const authority = this.provider.wallet.publicKey;
            const [marketPda, _] = yield this.findMarketAddress(authority);
            const tx = yield this.program.methods
                .initializeMarket(tokenName, oracleAddress)
                .accounts({
                authority,
            })
                .rpc();
            return tx;
        });
    }
    /**
     * Create a new bet
     */
    createBet(market, betAmount, priceThreshold, priceDirection, settlementTime, mint) {
        return __awaiter(this, void 0, void 0, function* () {
            const better = this.provider.wallet.publicKey;
            // Get the market account to find the bet count
            const marketAccount = yield this.fetchMarket(market);
            // Find the bet PDA
            const [betPda, _] = yield this.findBetAddress(market, marketAccount.betCount);
            // Create a new escrow account
            const betEscrow = Keypair.generate();
            // Get the better's token account
            const betterTokenAccount = yield getAssociatedTokenAddress(mint, better);
            const tx = yield this.program.methods
                .createBet(betAmount, priceThreshold, priceDirection === PriceDirection.Above ? { above: {} } : { below: {} }, settlementTime)
                .accounts({
                better,
                market,
                betEscrow: betEscrow.publicKey,
                betterTokenAccount,
                mint,
            })
                .signers([betEscrow])
                .rpc();
            return tx;
        });
    }
    /**
     * Match a bet
     */
    matchBet(bet, betEscrow, matcherTokenAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const matcher = this.provider.wallet.publicKey;
            const tx = yield this.program.methods
                .matchBet()
                .accounts({
                matcher,
                bet,
                betEscrow,
                matcherTokenAccount,
            })
                .rpc();
            return tx;
        });
    }
    /**
     * Settle a bet
     */
    settleBet(bet, market, priceFeed) {
        return __awaiter(this, void 0, void 0, function* () {
            const authority = this.provider.wallet.publicKey;
            const tx = yield this.program.methods
                .settleBet()
                .accounts({
                authority,
                bet,
                market,
                priceFeed,
            })
                .rpc();
            return tx;
        });
    }
    /**
     * Claim funds from a settled bet
     */
    claimFunds(bet, betEscrow, claimerTokenAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const claimer = this.provider.wallet.publicKey;
            const tx = yield this.program.methods
                .claimFunds()
                .accounts({
                claimer,
                bet,
                betEscrow,
                claimerTokenAccount,
            })
                .rpc();
            return tx;
        });
    }
    /**
     * Fetch a betting market account
     */
    fetchMarket(marketPda) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.program.account.bettingMarket.fetch(marketPda);
        });
    }
    /**
     * Fetch a bet account
     */
    fetchBet(betPda) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.program.account.bet.fetch(betPda);
        });
    }
    /**
     * Fetch all bets for a market
     */
    fetchMarketBets(market) {
        return __awaiter(this, void 0, void 0, function* () {
            const bets = yield this.program.account.bet.all([
                {
                    memcmp: {
                        offset: 8, // After discriminator
                        bytes: market.toBase58(),
                    },
                },
            ]);
            return bets.map((bet) => bet.account);
        });
    }
    /**
     * Fetch all bets for a user
     */
    fetchUserBets(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const bets = yield this.program.account.bet.all([
                {
                    memcmp: {
                        offset: 8 + 32, // After discriminator and market
                        bytes: user.toBase58(),
                    },
                },
            ]);
            return bets.map((bet) => bet.account);
        });
    }
}
