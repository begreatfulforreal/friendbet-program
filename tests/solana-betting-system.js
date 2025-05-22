const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } = require("@solana/spl-token");
const { BN } = require("bn.js");
const { assert } = require("chai");

describe("solana-betting-system", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaBettingSystem;

  // Generate keypairs for our test accounts
  const authority = Keypair.generate();
  const better = Keypair.generate();
  const matcher = Keypair.generate();

  // Mock oracle address
  const oracleAddress = Keypair.generate().publicKey;

  // Setup token mint and accounts
  let mint, betterTokenAccount, matcherTokenAccount;
  let market, bet;
  const tokenAmount = new BN(1000000000); // 1 token with 9 decimals
  const settlementTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  before(async () => {
    // Fund the authority, better, and matcher with SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 10000000000),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(better.publicKey, 10000000000),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(matcher.publicKey, 10000000000),
      "confirmed"
    );

    // Create a new token mint
    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals
    );

    // Create token accounts for better and matcher
    betterTokenAccount = await createAccount(
      provider.connection,
      better,
      mint,
      better.publicKey
    );

    matcherTokenAccount = await createAccount(
      provider.connection,
      matcher,
      mint,
      matcher.publicKey
    );

    // Mint tokens to better and matcher
    await mintTo(
      provider.connection,
      authority,
      mint,
      betterTokenAccount,
      authority.publicKey,
      tokenAmount.toNumber() * 2
    );

    await mintTo(
      provider.connection,
      authority,
      mint,
      matcherTokenAccount,
      authority.publicKey,
      tokenAmount.toNumber() * 2
    );
  });

  it("Initialize a betting market", async () => {
    // Derive PDA for market
    const [marketPDA, _] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), authority.publicKey.toBuffer()],
      program.programId
    );
    market = marketPDA;

    // Initialize the market
    await program.methods
      .initializeMarket("Solana", oracleAddress)
      .accounts({
        authority: authority.publicKey,
        market: marketPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    // Fetch the created market account
    const marketAccount = await program.account.bettingMarket.fetch(marketPDA);

    // Verify the market was created correctly
    assert.equal(marketAccount.authority.toString(), authority.publicKey.toString());
    assert.equal(marketAccount.tokenName, "Solana");
    assert.equal(marketAccount.oracleAddress.toString(), oracleAddress.toString());
    assert.equal(marketAccount.betCount.toString(), "0");
  });

  it("Create a bet", async () => {
    // Get the next bet index
    const marketAccount = await program.account.bettingMarket.fetch(market);
    const betIndex = marketAccount.betCount.addn(1);

    // Derive PDA for bet
    const [betPDA, _betBump] = await PublicKey.findProgramAddress(
      [Buffer.from("bet"), market.toBuffer(), betIndex.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    bet = betPDA;

    // Derive PDA for bet escrow
    const betEscrow = await createAccount(
      provider.connection,
      better,
      mint,
      betPDA
    );

    // Create a new bet
    await program.methods
      .createBet(
        tokenAmount,            // bet amount
        new BN(200000000000),   // price threshold: $200 with 9 decimals
        { above: {} },          // price direction: above
        new BN(settlementTime)  // settlement time
      )
      .accounts({
        better: better.publicKey,
        market: market,
        bet: betPDA,
        betEscrow: betEscrow,
        betterTokenAccount: betterTokenAccount,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([better])
      .rpc();

    // Fetch the created bet account
    const betAccount = await program.account.bet.fetch(betPDA);

    // Verify the bet was created correctly
    assert.equal(betAccount.market.toString(), market.toString());
    assert.equal(betAccount.better.toString(), better.publicKey.toString());
    assert.equal(betAccount.amount.toString(), tokenAmount.toString());
    assert.equal(betAccount.priceThreshold.toString(), "200000000000");
    assert.deepEqual(betAccount.priceDirection, { above: {} });
    assert.equal(betAccount.settlementTime.toString(), new BN(settlementTime).toString());
    assert.equal(betAccount.isMatched, false);
    assert.equal(betAccount.isSettled, false);
  });

  it("Match a bet", async () => {
    // Fetch the bet escrow address
    const betAccount = await program.account.bet.fetch(bet);
    const betEscrow = betAccount.escrow;

    // Match the bet
    await program.methods
      .matchBet()
      .accounts({
        matcher: matcher.publicKey,
        bet: bet,
        betEscrow: betEscrow,
        matcherTokenAccount: matcherTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([matcher])
      .rpc();

    // Fetch the updated bet account
    const updatedBetAccount = await program.account.bet.fetch(bet);

    // Verify the bet was matched correctly
    assert.equal(updatedBetAccount.isMatched, true);
    assert.equal(updatedBetAccount.matcher.toString(), matcher.publicKey.toString());
  });

  it("Settle a bet", async () => {
    // Setup oracle price (e.g., $250 with 9 decimals)
    const currentPrice = new BN(250000000000);

    // Settle the bet
    await program.methods
      .settleBet(currentPrice)
      .accounts({
        authority: authority.publicKey,
        bet: bet,
        market: market,
        oracle: oracleAddress,
      })
      .signers([authority])
      .rpc();

    // Fetch the updated bet account
    const updatedBetAccount = await program.account.bet.fetch(bet);

    // Verify the bet was settled correctly
    assert.equal(updatedBetAccount.isSettled, true);
    assert.equal(updatedBetAccount.winner.toString(), better.publicKey.toString()); // "Above $200" with price $250 means better wins
  });

  it("Claim funds after settlement", async () => {
    // Fetch the bet escrow address
    const betAccount = await program.account.bet.fetch(bet);
    const betEscrow = betAccount.escrow;

    // Get balance before claiming
    const beforeBalance = await provider.connection.getTokenAccountBalance(betterTokenAccount);

    // Claim funds
    await program.methods
      .claimFunds()
      .accounts({
        claimer: better.publicKey,
        bet: bet,
        betEscrow: betEscrow,
        claimerTokenAccount: betterTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([better])
      .rpc();

    // Get balance after claiming
    const afterBalance = await provider.connection.getTokenAccountBalance(betterTokenAccount);

    // Verify the funds were claimed correctly (should have received both bets)
    assert.isAbove(
      parseInt(afterBalance.value.amount),
      parseInt(beforeBalance.value.amount),
      "Balance should have increased after claiming funds"
    );
  });
});
