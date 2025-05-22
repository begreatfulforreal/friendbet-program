import { AnchorProvider, BN, Idl, IdlAccounts, Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "./idl.json" with { type: "json" };
import type {SolanaBettingSystem} from "./solana_betting_system";
type BettingMarket = IdlAccounts<SolanaBettingSystem>["bettingMarket"];
type Bet = IdlAccounts<SolanaBettingSystem>["bet"];

export enum PriceDirection {
  Above,
  Below,
}

export class SolanaBettingSDK {
  private program: Program<SolanaBettingSystem>;
  private programId: PublicKey;

  constructor(private provider: AnchorProvider, programId?: PublicKey) {
    this.programId = programId || new PublicKey(idl.address);
    this.program = new Program<SolanaBettingSystem>(idl as Idl);
  }

  /**
   * Create a new instance of the SDK
   */
  static connect(
    connection: Connection,
    wallet: any,
    programId?: PublicKey
  ): SolanaBettingSDK {
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    return new SolanaBettingSDK(provider, programId);
  }

  /**
   * Get the provider
   */
  getProvider(): AnchorProvider {
    return this.provider;
  }

  /**
   * Find a market account PDA
   */
  async findMarketAddress(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Find a bet account PDA
   */
  async findBetAddress(
    market: PublicKey,
    betCount: BN
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        market.toBuffer(),
        betCount.toArrayLike(Buffer, "le", 8),
      ],
      this.programId
    );
  }

  /**
   * Initialize a new betting market
   */
  async initializeMarket(
    tokenName: string,
    oracleAddress: PublicKey
  ): Promise<string> {
    const authority = this.provider.wallet.publicKey;
    const [marketPda, _] = await this.findMarketAddress(authority);

    const tx = await this.program.methods
      .initializeMarket(tokenName, oracleAddress)
      .accounts({
        authority,
      })
      .rpc();

    return tx;
  }

  /**
   * Create a new bet
   */
  async createBet(
    market: PublicKey,
    betAmount: BN,
    priceThreshold: BN,
    priceDirection: PriceDirection,
    settlementTime: BN,
    mint: PublicKey
  ): Promise<string> {
    const better = this.provider.wallet.publicKey;

    // Get the market account to find the bet count
    const marketAccount = await this.fetchMarket(market);

    // Find the bet PDA
    const [betPda, _] = await this.findBetAddress(
      market,
      marketAccount.betCount
    );

    // Create a new escrow account
    const betEscrow = Keypair.generate();

    // Get the better's token account
    const betterTokenAccount = await getAssociatedTokenAddress(mint, better);

    const tx = await this.program.methods
      .createBet(
        betAmount,
        priceThreshold,
        priceDirection === PriceDirection.Above ? { above: {} } : { below: {} },
        settlementTime
      )
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
  }

  /**
   * Match a bet
   */
  async matchBet(
    bet: PublicKey,
    betEscrow: PublicKey,
    matcherTokenAccount: PublicKey
  ): Promise<string> {
    const matcher = this.provider.wallet.publicKey;

    const tx = await this.program.methods
      .matchBet()
      .accounts({
        matcher,
        bet,
        betEscrow,
        matcherTokenAccount,
      })
      .rpc();

    return tx;
  }

  /**
   * Settle a bet
   */
  async settleBet(
    bet: PublicKey,
    market: PublicKey,
    priceFeed: PublicKey
  ): Promise<string> {
    const authority = this.provider.wallet.publicKey;

    const tx = await this.program.methods
      .settleBet()
      .accounts({
        authority,
        bet,
        market,
        priceFeed,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim funds from a settled bet
   */
  async claimFunds(
    bet: PublicKey,
    betEscrow: PublicKey,
    claimerTokenAccount: PublicKey
  ): Promise<string> {
    const claimer = this.provider.wallet.publicKey;

    const tx = await this.program.methods
      .claimFunds()
      .accounts({
        claimer,
        bet,
        betEscrow,
        claimerTokenAccount,
      })
      .rpc();

    return tx;
  }

  /**
   * Fetch a betting market account
   */
  async fetchMarket(marketPda: PublicKey): Promise<BettingMarket> {
    return this.program.account.bettingMarket.fetch(
      marketPda
    ) as unknown as BettingMarket;
  }

  /**
   * Fetch a bet account
   */
  async fetchBet(betPda: PublicKey): Promise<Bet> {
    return this.program.account.bet.fetch(betPda) as unknown as Bet;
  }

  /**
   * Fetch all bets for a market
   */
  async fetchMarketBets(market: PublicKey): Promise<Bet[]> {
    const bets = await this.program.account.bet.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: market.toBase58(),
        },
      },
    ]);
    return bets.map((bet) => bet.account) as unknown as Bet[];
  }

  /**
   * Fetch all bets for a user
   */
  async fetchUserBets(user: PublicKey): Promise<Bet[]> {
    const bets = await this.program.account.bet.all([
      {
        memcmp: {
          offset: 8 + 32, // After discriminator and market
          bytes: user.toBase58(),
        },
      },
    ]);
    return bets.map((bet) => bet.account) as unknown as Bet[];
  }
}
