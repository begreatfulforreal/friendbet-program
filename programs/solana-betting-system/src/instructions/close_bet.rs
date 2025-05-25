use crate::errors::ErrorCode;
use crate::state::{Bet, BettingMarket};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct CloseBet<'info> {
    #[account(mut)]
    pub better: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.better == better.key(),
        constraint = !bet.is_matched @ ErrorCode::BetAlreadyMatched,
        close = better
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
        close = better,
        constraint = bet_escrow.key() == bet.escrow
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    #[account(mut)]
    pub better_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn close_bet(ctx: Context<CloseBet>) -> Result<()> {
    let bet = &ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    // Create signing authority for the bet PDA
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"bet".as_ref(),
        bet.market.as_ref(),
        &bet.bet_count.to_le_bytes(),
        &[bet.bump],
    ]];

    // Return the funds to the better
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bet_escrow.to_account_info(),
                to: ctx.accounts.better_token_account.to_account_info(),
                authority: ctx.accounts.bet.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.bet_escrow.amount,
    )?;

    // Update market stats
    market.total_volume = market.total_volume.checked_sub(bet.amount).unwrap();

    msg!(
        "Bet closed by creator {}: {} USDC returned from bet on {}. Token account and bet account closed.",
        ctx.accounts.better.key(),
        bet.amount / 1_000_000,
        market.token_name
    );

    Ok(())
}
