import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Example usage of admin functions
export class AdminBettingManager {
  private program: anchor.Program;
  private connection: Connection;
  private adminKeypair: Keypair;

  constructor(
    program: anchor.Program,
    connection: Connection,
    adminKeypair: Keypair
  ) {
    this.program = program;
    this.connection = connection;
    this.adminKeypair = adminKeypair;
  }

  /**
   * Admin creates a bet for another user without requiring immediate funding
   */
  async createBetForUser(
    marketPubkey: PublicKey,
    betterPubkey: PublicKey,
    betAmount: number, // in USDC (will be converted to lamports)
    priceThreshold: number,
    priceDirection: "Above" | "Below",
    settlementTime: Date,
    fundImmediately: boolean = false,
    adminUsdcTokenAccount?: PublicKey
  ): Promise<{ betPubkey: PublicKey; escrowPubkey: PublicKey }> {
    // Fetch market to get the bet count
    const market = await this.program.account.bettingMarket.fetch(marketPubkey);
    const betCount = market.betCount.toNumber() + 1;

    // Derive PDA for the bet
    const [betPubkey] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        marketPubkey.toBuffer(),
        new BN(betCount).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );

    // Get USDC mint
    const usdcMint = new PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );

    // Create associated token account for bet escrow
    const escrowPubkey = await getAssociatedTokenAddress(
      usdcMint,
      betPubkey,
      true // allow off-curve
    );

    // If funding immediately but no token account provided, get admin's default USDC token account
    let funderTokenAccount: PublicKey;
    if (fundImmediately) {
      if (adminUsdcTokenAccount) {
        funderTokenAccount = adminUsdcTokenAccount;
      } else {
        funderTokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          this.adminKeypair.publicKey
        );
      }
    } else {
      // Use system program as placeholder when not funding
      funderTokenAccount = anchor.web3.SystemProgram.programId;
    }

    const tx = await this.program.methods
      .createBetForUser(
        new BN(betAmount * 1_000_000), // Convert USDC to lamports
        new BN(priceThreshold),
        priceDirection === "Above" ? { above: {} } : { below: {} },
        new BN(Math.floor(settlementTime.getTime() / 1000)),
        betterPubkey,
        fundImmediately
      )
      .accounts({
        admin: this.adminKeypair.publicKey,
        market: marketPubkey,
        bet: betPubkey,
        usdcMint: usdcMint,
        betEscrow: escrowPubkey,
        funderTokenAccount: funderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([this.adminKeypair])
      .rpc();

    const fundingStatus = fundImmediately ? "FUNDED" : "UNFUNDED";
    console.log(
      `Admin created ${fundingStatus} bet for user. Transaction: ${tx}`
    );
    console.log(`Bet PDA: ${betPubkey.toString()}`);
    console.log(`Escrow Account: ${escrowPubkey.toString()}`);

    return { betPubkey, escrowPubkey };
  }

  /**
   * Admin creates a bet for another user and funds it immediately
   * This is a convenience method that calls createBetForUser with fundImmediately=true
   */
  async createAndFundBetForUser(
    marketPubkey: PublicKey,
    betterPubkey: PublicKey,
    betAmount: number,
    priceThreshold: number,
    priceDirection: "Above" | "Below",
    settlementTime: Date,
    adminUsdcTokenAccount?: PublicKey
  ): Promise<{ betPubkey: PublicKey; escrowPubkey: PublicKey }> {
    return this.createBetForUser(
      marketPubkey,
      betterPubkey,
      betAmount,
      priceThreshold,
      priceDirection,
      settlementTime,
      true, // fundImmediately
      adminUsdcTokenAccount
    );
  }

  /**
   * Fund an existing unfunded bet
   */
  async fundBet(betPubkey: PublicKey, funderKeypair: Keypair): Promise<string> {
    // Fetch bet details
    const bet = await this.program.account.bet.fetch(betPubkey);

    if (bet.isFunded) {
      throw new Error("Bet is already funded");
    }

    // Get market
    const market = await this.program.account.bettingMarket.fetch(bet.market);

    // Get USDC mint
    const usdcMint = new PublicKey(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );

    // Get funder's USDC token account
    const funderTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      funderKeypair.publicKey
    );

    const tx = await this.program.methods
      .fundBet()
      .accounts({
        funder: funderKeypair.publicKey,
        market: bet.market,
        bet: betPubkey,
        usdcMint: usdcMint,
        betEscrow: bet.escrow,
        funderTokenAccount: funderTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([funderKeypair])
      .rpc();

    console.log(`Bet funded. Transaction: ${tx}`);
    return tx;
  }

  /**
   * Get all unfunded bets created by admin
   */
  async getUnfundedBets(): Promise<any[]> {
    const allBets = await this.program.account.bet.all();

    return allBets.filter(
      (bet) => bet.account.createdByAdmin && !bet.account.isFunded
    );
  }

  /**
   * Get bet details by public key
   */
  async getBetDetails(betPubkey: PublicKey): Promise<any> {
    return await this.program.account.bet.fetch(betPubkey);
  }
}

// Example usage:
/*
const connection = new Connection('https://api.devnet.solana.com');
const adminKeypair = Keypair.fromSecretKey(new Uint8Array([...])); // Admin's secret key
const program = anchor.Program<YourProgramType>(...);

const adminManager = new AdminBettingManager(program, connection, adminKeypair);

// Method 1: Admin creates unfunded bet for user (original functionality)
const { betPubkey } = await adminManager.createBetForUser(
  marketPubkey,
  userPublicKey,
  100, // 100 USDC
  50000, // $50,000 price threshold
  'Above',
  new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  false, // Don't fund immediately
  undefined
);

// Later, someone funds the bet
const funderKeypair = Keypair.fromSecretKey(new Uint8Array([...]));
await adminManager.fundBet(betPubkey, funderKeypair);

// Method 2: Admin creates and funds bet immediately (new functionality)
const { betPubkey: fundedBetPubkey } = await adminManager.createBetForUser(
  marketPubkey,
  userPublicKey,
  200, // 200 USDC
  45000, // $45,000 price threshold
  'Below',
  new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
  true, // Fund immediately
  adminUsdcTokenAccount // Optional: specify which admin USDC account to use
);
// This bet is immediately ready for matching!

// Method 3: Using the convenience method for immediate funding
const { betPubkey: anotherFundedBet } = await adminManager.createAndFundBetForUser(
  marketPubkey,
  userPublicKey,
  150, // 150 USDC
  52000, // $52,000 price threshold
  'Above',
  new Date(Date.now() + 36 * 60 * 60 * 1000) // 36 hours from now
);
*/
