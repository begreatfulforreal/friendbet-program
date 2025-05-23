use crate::errors::ErrorCode;
use crate::state::{Bet, BettingMarket};
use crate::USDC_MINT;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::str::FromStr;

#[derive(Accounts)]
pub struct FundBet<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.oracle_address.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, BettingMarket>,

    #[account(
        mut,
        seeds = [b"bet", bet.market.as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump,
        constraint = !bet.is_funded @ ErrorCode::BetAlreadyFunded,
        constraint = !bet.is_matched @ ErrorCode::BetAlreadyMatched,
        constraint = !bet.is_settled @ ErrorCode::BetAlreadySettled,
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        constraint = usdc_mint.key() == Pubkey::from_str(USDC_MINT).unwrap()
    )]
    pub usdc_mint: Account<'info, token::Mint>,

    #[account(
        mut,
        constraint = bet_escrow.key() == bet.escrow,
        constraint = bet_escrow.mint == usdc_mint.key(),
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = funder_token_account.mint == usdc_mint.key(),
    )]
    pub funder_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn fund_bet(ctx: Context<FundBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    // Check if settlement time hasn't passed
    let current_time = Clock::get()?.unix_timestamp;
    require!(current_time < bet.settlement_time, ErrorCode::BetExpired);

    // Transfer USDC from funder to bet escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.funder_token_account.to_account_info(),
        to: ctx.accounts.bet_escrow.to_account_info(),
        authority: ctx.accounts.funder.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, bet.amount)?;

    // Mark bet as funded
    bet.is_funded = true;

    // Update market stats (add to total volume now that it's funded)
    market.total_volume = market.total_volume.checked_add(bet.amount).unwrap();

    msg!(
        "Bet {} funded by {} with {} USDC",
        bet.key(),
        ctx.accounts.funder.key(),
        bet.amount / 1_000_000
    );

    Ok(())
}
