use crate::errors::ErrorCode;
use crate::state::PriceDirection;
use crate::state::{Bet, BettingMarket};
use crate::USDC_MINT;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(
    bet_amount: u64,
    price_threshold: u64,
    price_direction: PriceDirection,
    settlement_time: i64
)]
pub struct CreateBet<'info> {
    #[account(mut)]
    pub better: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.oracle_address.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, BettingMarket>,

    #[account(
        init,
        payer = better,
        space = Bet::LEN,
        seeds = [b"bet", market.key().as_ref(), &(market.bet_count + 1).to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        constraint = usdc_mint.key() == Pubkey::from_str(USDC_MINT).unwrap()
    )]
    pub usdc_mint: Account<'info, token::Mint>,

    #[account(
        init,
        payer = better,
        token::mint = usdc_mint,
        token::authority = bet,
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = better_token_account.mint == usdc_mint.key(),
        constraint = better_token_account.owner == better.key()
    )]
    pub better_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_bet(
    ctx: Context<CreateBet>,
    bet_amount: u64,
    price_threshold: u64,
    price_direction: PriceDirection,
    settlement_time: i64,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    require!(
        settlement_time > current_time,
        ErrorCode::InvalidSettlementTime
    );
    require!(
        settlement_time - current_time >= 3600,
        ErrorCode::SettlementTimeTooClose
    );
    require!(
        bet_amount > 1_000_000, // 1 USDC
        ErrorCode::InvalidBetAmount
    );
    require!(price_threshold > 0, ErrorCode::InvalidPriceThreshold);

    // Transfer USDC from better to bet escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.better_token_account.to_account_info(),
        to: ctx.accounts.bet_escrow.to_account_info(),
        authority: ctx.accounts.better.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, bet_amount)?;

    // Increment bet count first so we store the accurate count in the bet
    let bet_count = ctx.accounts.market.bet_count + 1;

    // Update bet account
    let bet = &mut ctx.accounts.bet;
    bet.market = ctx.accounts.market.key();
    bet.better = ctx.accounts.better.key();
    bet.amount = bet_amount;
    bet.price_threshold = price_threshold;
    bet.price_direction = price_direction;
    bet.settlement_time = settlement_time;
    bet.is_matched = false;
    bet.is_settled = false;
    bet.winner = None;
    bet.matcher = None;
    bet.escrow = ctx.accounts.bet_escrow.key();
    bet.bet_count = bet_count; // Store the bet count in the bet
    bet.bump = ctx.bumps.bet;

    // Update market stats
    let market = &mut ctx.accounts.market;
    market.bet_count = bet_count;
    market.total_volume = market.total_volume.checked_add(bet_amount).unwrap();

    msg!(
        "Bet created by {}: {} USDC that {} will be trading {} {}",
        bet.better,
        bet.amount / 1_000_000,
        market.token_name,
        if price_direction == PriceDirection::Above {
            "above"
        } else {
            "below"
        },
        price_threshold
    );

    Ok(())
}
