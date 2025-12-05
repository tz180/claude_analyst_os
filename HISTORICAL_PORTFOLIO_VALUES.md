# Historical Portfolio Values System

## Overview

This system calculates and stores daily portfolio values based on:
1. **Transactions** from `portfolio_transactions` table
2. **Historical stock prices** from `historical_stock_prices` table
3. **Cash calculations** including interest earned

## Database Schema

### Table: `historical_portfolio_values`

Stores pre-calculated daily portfolio values:

- `id` - UUID primary key
- `portfolio_id` - References portfolios table
- `date` - Date of the calculation
- `cash` - Base cash amount on that date
- `positions_value` - Total value of all positions (shares × historical price)
- `total_value` - Cash + positions_value
- `interest_earned` - Cumulative interest earned up to that date
- `created_at` / `updated_at` - Timestamps

**Unique constraint**: `(portfolio_id, date)` - one record per portfolio per day

## How It Works

### Calculation Process

1. **Get all transactions** for the portfolio, sorted by date
2. **Get historical prices** for all tickers involved in transactions
3. **For each day** from first transaction to today:
   - Process transactions that occurred on or before that date
   - Track shares owned for each ticker
   - Calculate cash (starting_cash - purchases + sales)
   - Calculate interest earned (4.2% annual rate)
   - Look up historical stock price for each ticker on that date
   - Calculate positions value = sum(shares × historical_price)
   - Calculate total value = cash + positions_value + interest
   - Store in database

### Example

If you bought 100,000 shares of INTA on 7/19 at $42.54:
- **7/19**: 
  - Cash: $50,000,000 - $4,254,000 = $45,746,000
  - Positions: 100,000 × $42.54 = $4,254,000
  - Total: $50,000,000

- **7/20** (if INTA price moves to $43.00):
  - Cash: $45,746,000 + interest
  - Positions: 100,000 × $43.00 = $4,300,000
  - Total: $45,746,000 + interest + $4,300,000

## Usage

### Automatic Calculation

Historical portfolio values are **automatically recalculated** after:
- Buying shares (`buyShares`)
- Selling shares (`sellShares`)

The recalculation runs asynchronously and doesn't block the transaction.

### Manual Calculation

You can manually trigger a recalculation:

```javascript
import { historicalPortfolioValueServices } from './supabaseServices';

// Recalculate all historical values for a portfolio
const result = await historicalPortfolioValueServices.calculateAndStoreHistoricalValues(portfolioId);
if (result.success) {
  console.log(`Stored ${result.recordsStored} daily values`);
}
```

### Retrieving Historical Values

```javascript
import { historicalPortfolioValueServices } from './supabaseServices';

// Get all historical values
const result = await historicalPortfolioValueServices.getHistoricalValues(portfolioId);

// Get values for a date range
const result = await historicalPortfolioValueServices.getHistoricalValues(
  portfolioId,
  '2025-07-01', // startDate
  '2025-12-31'  // endDate
);

if (result.success) {
  result.data.forEach(day => {
    console.log(`${day.date}: $${day.totalValue.toLocaleString()}`);
  });
}
```

## Setup

1. **Run the SQL migration**:
   ```sql
   -- Execute create-historical-portfolio-values-table.sql in Supabase SQL editor
   ```

2. **Initial calculation**: After running the migration, trigger an initial calculation for existing portfolios:
   ```javascript
   // In browser console or component
   const portfolio = await portfolioServices.getPortfolio();
   await historicalPortfolioValueServices.calculateAndStoreHistoricalValues(portfolio.id);
   ```

## Notes

- **Weekends/Holidays**: If a date falls on a non-trading day, the system uses the most recent trading day's price
- **Missing Prices**: If historical price data is missing, the system falls back to average cost basis
- **Interest Calculation**: Uses 4.2% annual rate (80% of Fed Funds Rate), calculated daily
- **Performance**: Values are stored in batches of 100 records for efficiency

## Integration with Chart

The `PortfolioValueChart` component can be updated to use this pre-calculated data instead of calculating on-the-fly, which will improve performance and ensure consistency.

