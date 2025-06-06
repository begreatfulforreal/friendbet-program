import {
  AnchorProvider,
  BN,
  Idl,
  IdlAccounts,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idl from "../../target/idl/friendbet.json";
import type { Friendbet } from "../../target/types/friendbet";
import * as fs from "fs";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const ADMIN_ADDRESS = new PublicKey(
  "8kvqgxQG77pv6RvEou8f2kHSWi3rtx8F7MksXUqNLGmn"
);

export enum PriceDirection {
  Above,
  Below,
}

export function getKeypairFromFile(filePath: String): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        process.env.KEYPAIR || fs.readFileSync(filePath.toString(), "utf-8")
      )
    )
  );
}
export class FriendbetSDK {
  private program: Program<Friendbet>;
  private programId: PublicKey;
  private userWallet: Wallet;
  private provider: AnchorProvider;
  private connection: Connection;

  constructor(connection: Connection, wallet: Keypair, programId?: PublicKey) {
    this.programId = programId || new PublicKey(idl.address);
    this.provider = new AnchorProvider(
      connection,
      new Wallet(wallet),
      AnchorProvider.defaultOptions()
    );
    this.connection = connection;
    this.program = new Program<Friendbet>(idl as Idl, this.provider);
    this.userWallet = new Wallet(wallet);
  }

  /**
   * Get the provider
   */
  getProvider(): AnchorProvider {
    return this.provider;
  }

  /**
   * Get the program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Find a market account PDA
   */
  async findMarketAddress(feedIdHex: string): Promise<[PublicKey, number]> {
    // Convert hex string to bytes and take first 8 bytes for PDA derivation
    const feedIdBytes = Buffer.from(feedIdHex.replace("0x", ""), "hex");
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), feedIdBytes.subarray(0, 8)],
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
    feeClaimer: PublicKey,
    feedIdHex: string,
    priceUpdate: PublicKey
  ): Promise<string> {
    const authority = this.provider.wallet.publicKey;
    const [marketPda, _] = await this.findMarketAddress(feedIdHex);

    const tx = await this.program.methods
      .initializeMarket(tokenName, feeClaimer, feedIdHex)
      .accounts({
        authority,
        market: marketPda,
        priceUpdate,
      })
      .rpc();

    return tx;
  }

  async getBettingData(bettingId: string) {
    const betting = await this.program.account.bet.fetch(
      new PublicKey(bettingId)
    );
    return betting;
  }

  async findBetCountForMarket(marketId: PublicKey) {
    const market = await this.program.account.bettingMarket.fetch(marketId);
    return market.betCount;
  }

  // create bet
  async createBet(marketId: PublicKey, amount: number, feedIdHex: string) {
    const betCount = (await this.findBetCountForMarket(marketId)).toNumber();

    const [bet] = await this.findBetAddress(marketId, new BN(betCount + 1));

    const betterTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      this.userWallet.publicKey
    );
    const betEscrow = getAssociatedTokenAddressSync(USDC_MINT, bet);

    const createBetIx = await this.program.methods
      .createBet(new BN(amount), new BN(0), { above: {} }, new BN(0))
      .accounts({
        market: marketId,
        betterTokenAccount,
        bet,
        usdcMint: USDC_MINT,
        betEscrow,
      })
      .instruction();

    const createBetMessage = new TransactionMessage({
      payerKey: this.userWallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 100_000,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 200_000,
        }),
        createBetIx,
      ],
    }).compileToV0Message();
    const createBetTx = new VersionedTransaction(createBetMessage);
    this.userWallet.signTransaction(createBetTx);
    const signature = await this.provider.sendAndConfirm(createBetTx);

    return signature;
  }

  async matchBet(marketId: PublicKey, amount: number) {
    const betCount = (await this.findBetCountForMarket(marketId)).toNumber();

    const [bet] = await this.findBetAddress(marketId, new BN(betCount));

    const betEscrow = getAssociatedTokenAddressSync(USDC_MINT, bet);

    const matcherTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      this.userWallet.publicKey
    );

    const matchBetIx = await this.program.methods
      .matchBet()
      .accounts({
        market: marketId,
        betEscrow,
        matcherTokenAccount,
      })
      .instruction();

    const matchBetMessage = new TransactionMessage({
      payerKey: this.userWallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 100_000,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 200_000,
        }),
        matchBetIx,
      ],
    }).compileToV0Message();
    const matchBetTx = new VersionedTransaction(matchBetMessage);
    this.userWallet.signTransaction(matchBetTx);
    const signature = await this.provider.sendAndConfirm(matchBetTx);

    return signature;
  }

  async claimFunds(marketId: PublicKey) {
    const betCount = (await this.findBetCountForMarket(marketId)).toNumber();

    const [bet] = await this.findBetAddress(marketId, new BN(betCount));

    const betEscrow = getAssociatedTokenAddressSync(USDC_MINT, bet);

    const claimerTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      this.userWallet.publicKey
    );

    const feeRecipientTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      ADMIN_ADDRESS
    );

    const claimBetIx = await this.program.methods
      .claimFunds()
      .accounts({
        market: marketId,
        betEscrow,
        claimerTokenAccount,
        feeRecipientTokenAccount,
        claimer: ADMIN_ADDRESS,
      })
      .instruction();

    const claimBetMessage = new TransactionMessage({
      payerKey: this.userWallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [claimBetIx],
    }).compileToV0Message();

    const claimBetTx = new VersionedTransaction(claimBetMessage);
    this.userWallet.signTransaction(claimBetTx);
    const signature = await this.provider.sendAndConfirm(claimBetTx);

    return signature;
  }

  async closeBet(marketId: PublicKey, better: PublicKey) {
    const betCount = (await this.findBetCountForMarket(marketId)).toNumber();

    const [bet] = await this.findBetAddress(marketId, new BN(betCount));
    const betEscrow = getAssociatedTokenAddressSync(USDC_MINT, bet, true);
    const betterTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      better
    );

    const closeBetIx = await this.program.methods
      .closeBet()
      .accountsPartial({
        bet,
        better,
        closer: this.userWallet.publicKey,
        market: marketId,
        betEscrow,
        betterTokenAccount,
      })
      .instruction();

    const closeBetMessage = new TransactionMessage({
      payerKey: this.userWallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [closeBetIx],
    }).compileToV0Message();

    const closeBetTx = new VersionedTransaction(closeBetMessage);

    this.userWallet.signTransaction(closeBetTx);
    const signature = await this.provider.sendAndConfirm(closeBetTx);

    return signature;
  }
}
