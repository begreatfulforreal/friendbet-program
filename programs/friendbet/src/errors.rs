use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Settlement time must be in the future")]
    InvalidSettlementTime,
    #[msg("Bet is already matched")]
    BetAlreadyMatched,
    #[msg("Bet is already settled")]
    BetAlreadySettled,
    #[msg("Bet is not matched yet")]
    BetNotMatched,
    #[msg("Current time is before settlement time")]
    SettlementTimeTooEarly,
    #[msg("Bet is not settled yet")]
    BetNotSettled,
    #[msg("Only the winner can claim funds")]
    NotWinner,
    #[msg("Bet has expired and can no longer be matched")]
    BetExpired,
    #[msg("Settlement time must be at least 1 hour in the future")]
    SettlementTimeTooClose,
    #[msg("Oracle data is stale")]
    StaleOracleData,
    #[msg("Error converting price data")]
    PriceConversionError,
    #[msg("Failed to load price feed")]
    PriceFeedLoadError,
    #[msg("Invalid USDC mint address")]
    InvalidUsdcMint,
    #[msg("Failed to close token account")]
    TokenAccountCloseFailed,
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    #[msg("Invalid price threshold")]
    InvalidPriceThreshold,
    #[msg("Only the admin can call this function")]
    OnlyAdmin,
    #[msg("Bet is already funded")]
    BetAlreadyFunded,
    #[msg("Bet is not funded yet")]
    BetNotFunded,
}
