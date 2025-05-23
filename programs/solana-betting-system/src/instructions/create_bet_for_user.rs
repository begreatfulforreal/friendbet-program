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
    settlement_time: i64,
    better_pubkey: Pubkey,
    fund_immediately: bool
)]
pub struct CreateBetForUser<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.oracle_address.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, BettingMarket>,

    #[account(
        init,
        payer = admin,
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
        payer = admin,
        token::mint = usdc_mint,
        token::authority = bet,
    )]
    pub bet_escrow: Account<'info, TokenAccount>,

    /// CHECK: This account is manually validated when fund_immediately is true
    #[account(mut)]
    pub funder_token_account: Option<UncheckedAccount<'info>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_bet_for_user(
    ctx: Context<CreateBetForUser>,
    bet_amount: u64,
    price_threshold: u64,
    price_direction: PriceDirection,
    settlement_time: i64,
    better_pubkey: Pubkey,
    fund_immediately: bool,
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

    // If funding immediately, validate the funder token account
    if fund_immediately {

        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_token_account.as_ref().unwrap().to_account_info(),
            to: ctx.accounts.bet_escrow.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, bet_amount)?;
    }

    // Increment bet count first so we store the accurate count in the bet
    let bet_count = ctx.accounts.market.bet_count + 1;

    // Update bet account
    let bet = &mut ctx.accounts.bet;
    bet.market = ctx.accounts.market.key();
    bet.better = better_pubkey; // Set the actual better's pubkey, not the admin's
    bet.amount = bet_amount;
    bet.price_threshold = price_threshold;
    bet.price_direction = price_direction;
    bet.settlement_time = settlement_time;
    bet.is_matched = false;
    bet.is_settled = false;
    bet.is_funded = fund_immediately; // Set funded status based on whether we funded immediately
    bet.created_by_admin = true; // Mark as created by admin
    bet.winner = None;
    bet.matcher = None;
    bet.escrow = ctx.accounts.bet_escrow.key();
    bet.bet_count = bet_count; // Store the bet count in the bet
    bet.bump = ctx.bumps.bet;

    // Update market stats
    let market = &mut ctx.accounts.market;
    market.bet_count = bet_count;

    // Only add to total_volume if funded immediately
    if fund_immediately {
        market.total_volume = market.total_volume.checked_add(bet_amount).unwrap();
    }

    let funding_status = if fund_immediately {
        "FUNDED"
    } else {
        "UNFUNDED"
    };
    msg!(
        "Bet created by admin for {}: {} USDC that {} will be trading {} {} ({})",
        bet.better,
        bet.amount / 1_000_000,
        market.token_name,
        if price_direction == PriceDirection::Above {
            "above"
        } else {
            "below"
        },
        price_threshold,
        funding_status
    );

    Ok(())
}
