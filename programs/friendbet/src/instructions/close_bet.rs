use crate::errors::ErrorCode;
use crate::state::{Bet, BettingMarket};
use crate::ADMIN;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::str::FromStr;

#[derive(Accounts)]
pub struct CloseBet<'info> {
    /// CHECK: The account of the original bettor.
    #[account(mut)]
    pub better: UncheckedAccount<'info>,

    /// The account closing the bet. Must be either the original 'better' or the market admin.
    pub closer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), &bet.bet_count.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.better == better.key() @ ErrorCode::InvalidBetter,
        constraint = !bet.is_matched @ ErrorCode::BetAlreadyMatched,
        close = better // Rent from bet account closure goes to the original better
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

    #[account(mut,
        constraint = &better_token_account.owner == &better.key()
    )]
    pub better_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn close_bet(ctx: Context<CloseBet>) -> Result<()> {
    // Verify that the 'better' account provided matches the one stored in the Bet state.
    // This is already guaranteed by the constraint `bet.better == better.key()` on the `bet` account.

    // Authorize the closer: must be the original better or the market admin.
    // This assumes your BettingMarket account (ctx.accounts.market) has an 'admin' field.
    let is_original_better = ctx.accounts.closer.key() == ctx.accounts.better.key();
    let is_admin = ctx.accounts.closer.key() == Pubkey::from_str(ADMIN).unwrap();

    if !is_original_better && !is_admin {
        return err!(ErrorCode::UnauthorizedCloser);
    }

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

    // Close the bet account
    ctx.accounts
        .bet
        .close(ctx.accounts.better.to_account_info())?;

    // Update market stats
    market.total_volume = market.total_volume.checked_sub(bet.amount).unwrap();

    msg!(
        "Bet closed by {}: {} USDC returned to {} from bet on {}. Bet account and token escrow account closed.",
        ctx.accounts.closer.key(), // Log who initiated the close
        bet.amount / 1_000_000,
        ctx.accounts.better.key(), // Log who received the funds and rent
        market.get_token_name()
    );

    Ok(())
}
