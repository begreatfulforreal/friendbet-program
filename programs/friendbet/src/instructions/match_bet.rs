use crate::errors::ErrorCode;
use crate::state::Bet;
use crate::state::BettingMarket;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct MatchBet<'info> {
    #[account(mut)]
    pub matcher: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump
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
        constraint = bet_escrow.key() == bet.escrow
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    #[account(mut)]
    pub matcher_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn match_bet(ctx: Context<MatchBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    // Ensure bet is not already matched
    require!(!bet.is_matched, ErrorCode::BetAlreadyMatched);

    // Ensure bet is not settled
    require!(!bet.is_settled, ErrorCode::BetAlreadySettled);

    // Ensure bet is funded before it can be matched
    require!(bet.is_funded, ErrorCode::BetNotFunded);

    // Ensure the current time is before settlement time
    let current_time = Clock::get()?.unix_timestamp;
    require!(current_time < bet.settlement_time, ErrorCode::BetExpired);

    // Transfer USDC from matcher to bet escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.matcher_token_account.to_account_info(),
        to: ctx.accounts.bet_escrow.to_account_info(),
        authority: ctx.accounts.matcher.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, bet.amount)?;

    // Update bet
    bet.is_matched = true;
    bet.matcher = Some(ctx.accounts.matcher.key());

    // Update market statistics
    market.total_volume = market.total_volume.checked_add(bet.amount).unwrap();
    market.total_matched_count = market.total_matched_count.checked_add(1).unwrap();

    msg!(
        "Bet matched by {}: {} USDC on {}",
        ctx.accounts.matcher.key(),
        bet.amount,
        market.get_token_name()
    );

    Ok(())
}
