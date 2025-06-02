use crate::errors::ErrorCode;
use crate::state::{Bet, BettingMarket, FEE_DENOMINATOR, FEE_PERCENTAGE};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ClaimFunds<'info> {
    /// CHECK: Already checked bet.winner.unwrap() == claimer.key()
    #[account(mut)]
    pub claimer: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.winner.unwrap() == claimer.key(),
        close = claimer
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        mut,
        seeds = [b"market", &market.feed_id[..8]],
        bump = market.bump,
        constraint = market.key() == bet.market
    )]
    pub market: Account<'info, BettingMarket>,

    #[account(
        mut,
        close = claimer,
        constraint = bet_escrow.key() == bet.escrow
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = claimer_token_account.owner == claimer.key()
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    // Fee recipient account
    #[account(
        mut,
        constraint = fee_recipient_token_account.owner == market.fee_claimer
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn claim_funds(ctx: Context<ClaimFunds>) -> Result<()> {
    let bet = &ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    // Ensure bet is settled
    require!(bet.is_settled, ErrorCode::BetNotSettled);

    // Get escrow balance (should be 2 * bet amount)
    let escrow_balance = ctx.accounts.bet_escrow.amount;

    // Calculate fee (3% of the total winnings)
    let fee_amount = escrow_balance
        .checked_mul(FEE_PERCENTAGE)
        .unwrap()
        .checked_div(FEE_DENOMINATOR)
        .unwrap();

    // Winnings after fee deduction
    let winner_amount = escrow_balance.checked_sub(fee_amount).unwrap();

    // Update market stats for fees
    market.total_fees_collected = market.total_fees_collected.checked_add(fee_amount).unwrap();

    // Create signing authority for the bet PDA
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"bet".as_ref(),
        bet.market.as_ref(),
        &bet.bet_count.to_le_bytes(),
        &[bet.bump],
    ]];

    // Transfer the fee to the fee recipient
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bet_escrow.to_account_info(),
                to: ctx.accounts.fee_recipient_token_account.to_account_info(),
                authority: ctx.accounts.bet.to_account_info(),
            },
            signer_seeds,
        ),
        fee_amount,
    )?;

    // Transfer the winner amount to the claimer
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bet_escrow.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: ctx.accounts.bet.to_account_info(),
            },
            signer_seeds,
        ),
        winner_amount,
    )?;

    msg!(
        "Funds claimed by winner {}: {} USDC (with {} USDC fee) from bet on {}.",
        ctx.accounts.claimer.key(),
        winner_amount,
        fee_amount,
        market.get_token_name()
    );

    Ok(())
}
