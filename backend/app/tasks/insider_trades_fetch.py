"""
Fetch SEC insider trades (Form 4 filings) for S&P 500 stocks.
Supports daily incremental and full 30-day backfill.
"""
import asyncio
from datetime import datetime, timedelta, date
from decimal import Decimal

import httpx
from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.sp500 import SP500_TICKERS, SP500Stock, StockDailyHistory
from app.models.insider_trades import InsiderTrade
from app.services.sec_edgar import SECEdgarService

settings = get_settings()


async def calculate_price_impact(
    session: AsyncSession,
    symbol: str,
    transaction_date: date
) -> dict:
    """
    Calculate price impact metrics for an insider trade.
    Uses StockDailyHistory to get prices at trade date, 1W, 1M, 3M after.
    Also calculates S&P 500 (SPY) benchmark returns and alpha.

    Returns dict with:
    - price_at_trade, price_current, price_1w_after, price_1m_after, price_3m_after
    - return_1w_pct, return_1m_pct, return_3m_pct, return_to_current_pct
    - sp500_return_1w_pct, sp500_return_1m_pct, sp500_return_3m_pct
    - alpha_1w_pct, alpha_1m_pct, alpha_3m_pct
    """
    result = {}

    try:
        # Get price at transaction date
        stmt = select(StockDailyHistory).where(
            and_(
                StockDailyHistory.symbol == symbol,
                StockDailyHistory.date == transaction_date
            )
        )
        trade_day = await session.execute(stmt)
        trade_day_row = trade_day.scalar_one_or_none()

        if not trade_day_row:
            # Try to find closest prior trading day (within 5 days)
            stmt = select(StockDailyHistory).where(
                and_(
                    StockDailyHistory.symbol == symbol,
                    StockDailyHistory.date <= transaction_date,
                    StockDailyHistory.date >= transaction_date - timedelta(days=5)
                )
            ).order_by(StockDailyHistory.date.desc()).limit(1)
            trade_day = await session.execute(stmt)
            trade_day_row = trade_day.scalar_one_or_none()

        if not trade_day_row:
            return result

        price_at_trade = trade_day_row.close
        result['price_at_trade'] = price_at_trade

        # Calculate future date thresholds
        date_1w = transaction_date + timedelta(days=7)
        date_1m = transaction_date + timedelta(days=30)
        date_3m = transaction_date + timedelta(days=90)
        today = datetime.utcnow().date()

        # Helper function to get closest price on or after target date
        async def get_price_after(target_date: date, max_days_forward: int = 5) -> Decimal | None:
            stmt = select(StockDailyHistory).where(
                and_(
                    StockDailyHistory.symbol == symbol,
                    StockDailyHistory.date >= target_date,
                    StockDailyHistory.date <= target_date + timedelta(days=max_days_forward)
                )
            ).order_by(StockDailyHistory.date.asc()).limit(1)
            res = await session.execute(stmt)
            row = res.scalar_one_or_none()
            return row.close if row else None

        # Get prices at various intervals
        price_1w_after = await get_price_after(date_1w) if date_1w <= today else None
        price_1m_after = await get_price_after(date_1m) if date_1m <= today else None
        price_3m_after = await get_price_after(date_3m) if date_3m <= today else None

        # Get current/most recent price
        stmt = select(StockDailyHistory).where(
            StockDailyHistory.symbol == symbol
        ).order_by(StockDailyHistory.date.desc()).limit(1)
        current = await session.execute(stmt)
        current_row = current.scalar_one_or_none()
        price_current = current_row.close if current_row else None

        result['price_current'] = price_current
        result['price_1w_after'] = price_1w_after
        result['price_1m_after'] = price_1m_after
        result['price_3m_after'] = price_3m_after

        # Calculate returns
        if price_1w_after:
            result['return_1w_pct'] = ((price_1w_after - price_at_trade) / price_at_trade) * 100
        if price_1m_after:
            result['return_1m_pct'] = ((price_1m_after - price_at_trade) / price_at_trade) * 100
        if price_3m_after:
            result['return_3m_pct'] = ((price_3m_after - price_at_trade) / price_at_trade) * 100
        if price_current:
            result['return_to_current_pct'] = ((price_current - price_at_trade) / price_at_trade) * 100

        # Get SPY (S&P 500) benchmark returns for alpha calculation
        async def get_spy_return(target_date: date, max_days_forward: int = 5) -> Decimal | None:
            # Get SPY price at transaction date
            stmt = select(StockDailyHistory).where(
                and_(
                    StockDailyHistory.symbol == 'SPY',
                    StockDailyHistory.date == transaction_date
                )
            )
            spy_trade = await session.execute(stmt)
            spy_trade_row = spy_trade.scalar_one_or_none()

            if not spy_trade_row:
                # Try closest prior date
                stmt = select(StockDailyHistory).where(
                    and_(
                        StockDailyHistory.symbol == 'SPY',
                        StockDailyHistory.date <= transaction_date,
                        StockDailyHistory.date >= transaction_date - timedelta(days=5)
                    )
                ).order_by(StockDailyHistory.date.desc()).limit(1)
                spy_trade = await session.execute(stmt)
                spy_trade_row = spy_trade.scalar_one_or_none()

            if not spy_trade_row:
                return None

            spy_base_price = spy_trade_row.close

            # Get SPY price at target date
            stmt = select(StockDailyHistory).where(
                and_(
                    StockDailyHistory.symbol == 'SPY',
                    StockDailyHistory.date >= target_date,
                    StockDailyHistory.date <= target_date + timedelta(days=max_days_forward)
                )
            ).order_by(StockDailyHistory.date.asc()).limit(1)
            spy_target = await session.execute(stmt)
            spy_target_row = spy_target.scalar_one_or_none()

            if not spy_target_row:
                return None

            spy_target_price = spy_target_row.close
            return ((spy_target_price - spy_base_price) / spy_base_price) * 100

        # Calculate SPY returns
        if date_1w <= today:
            result['sp500_return_1w_pct'] = await get_spy_return(date_1w)
        if date_1m <= today:
            result['sp500_return_1m_pct'] = await get_spy_return(date_1m)
        if date_3m <= today:
            result['sp500_return_3m_pct'] = await get_spy_return(date_3m)

        # Calculate alpha (stock return - benchmark return)
        if result.get('return_1w_pct') and result.get('sp500_return_1w_pct'):
            result['alpha_1w_pct'] = result['return_1w_pct'] - result['sp500_return_1w_pct']
        if result.get('return_1m_pct') and result.get('sp500_return_1m_pct'):
            result['alpha_1m_pct'] = result['return_1m_pct'] - result['sp500_return_1m_pct']
        if result.get('return_3m_pct') and result.get('sp500_return_3m_pct'):
            result['alpha_3m_pct'] = result['return_3m_pct'] - result['sp500_return_3m_pct']

    except Exception as e:
        print(f"    Error calculating price impact for {symbol}: {e}")

    return result


async def fetch_insider_trades_for_symbol(
    symbol: str,
    start_date: date,
    end_date: date,
    session: AsyncSession,
    edgar_service: SECEdgarService,
    client: httpx.AsyncClient
) -> int:
    """
    Fetch insider trades for a single symbol.
    Returns count of trades added/updated.

    Steps:
    1. Get CIK for symbol
    2. Fetch Form 4 filings list
    3. For each filing:
       - Check if already processed (by accession_number)
       - Fetch XML
       - Parse trades
       - Calculate price impact
       - UPSERT to database
    """
    trades_count = 0

    try:
        # Get CIK for symbol
        cik = await edgar_service.get_company_cik(symbol, client)
        if not cik:
            print(f"  {symbol}: CIK not found")
            return 0

        # Fetch Form 4 filings list
        filings = await edgar_service.fetch_form4_filings_list(
            cik, start_date, end_date, client
        )

        if not filings:
            print(f"  {symbol}: No Form 4 filings found")
            return 0

        print(f"  {symbol}: Found {len(filings)} Form 4 filings")

        # Process each filing
        for filing in filings:
            accession_number = filing['accessionNumber']
            filing_date_str = filing['filingDate']

            # Check if already processed
            stmt = select(InsiderTrade).where(
                InsiderTrade.accession_number == accession_number
            ).limit(1)
            existing = await session.execute(stmt)
            existing_trade = existing.scalar_one_or_none()

            if existing_trade:
                # Already processed, skip
                continue

            # Fetch Form 4 XML
            xml_content = await edgar_service.fetch_form4_xml(cik, accession_number, client)
            if not xml_content:
                print(f"    {symbol}: Could not fetch XML for {accession_number}")
                continue

            # Parse trades from XML
            parsed_trades = edgar_service.parse_form4_xml(xml_content, symbol)

            if not parsed_trades:
                print(f"    {symbol}: No trades parsed from {accession_number}")
                continue

            # Process each trade from the filing
            for trade_data in parsed_trades:
                try:
                    # Extract transaction date
                    transaction_date_str = trade_data.get('transaction_date')
                    if not transaction_date_str:
                        continue

                    transaction_date = date.fromisoformat(transaction_date_str)
                    filing_date = date.fromisoformat(filing_date_str)

                    # Calculate price impact
                    price_impact = await calculate_price_impact(
                        session, symbol, transaction_date
                    )

                    # Build relationship string
                    relationship_parts = []
                    if trade_data.get('is_officer'):
                        relationship_parts.append('Officer')
                    if trade_data.get('is_director'):
                        relationship_parts.append('Director')
                    if trade_data.get('is_ten_percent_owner'):
                        relationship_parts.append('10% Owner')
                    relationship = ', '.join(relationship_parts) if relationship_parts else None

                    # Calculate total value
                    shares = trade_data.get('shares', 0)
                    price = trade_data.get('price_per_share', 0)
                    total_value = None
                    if shares and price:
                        total_value = Decimal(str(shares)) * Decimal(str(price))

                    # Build filing URL
                    accession_no_dashes = accession_number.replace('-', '')
                    filing_url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type=4&dateb=&owner=include&count=100&search_text={accession_no_dashes}"

                    # Prepare record for upsert
                    record = {
                        'accession_number': accession_number,
                        'cik': cik,
                        'symbol': symbol,
                        'company_name': None,  # Could be enriched from SP500Stock
                        'insider_name': trade_data.get('insider_name', 'Unknown'),
                        'insider_cik': trade_data.get('insider_cik'),
                        'insider_title': trade_data.get('officer_title'),
                        'relationship': relationship,
                        'transaction_type': trade_data.get('transaction_type', 'Unknown'),
                        'transaction_code': trade_data.get('transaction_code'),
                        'shares_traded': Decimal(str(shares)) if shares else Decimal('0'),
                        'price_per_share': Decimal(str(price)) if price else None,
                        'total_value': total_value,
                        'shares_owned_after': Decimal(str(trade_data.get('shares_owned_following', 0))) if trade_data.get('shares_owned_following') else None,
                        'ownership_type': trade_data.get('direct_or_indirect'),
                        'transaction_date': transaction_date,
                        'filing_date': filing_date,
                        'filing_url': filing_url,
                    }

                    # Add price impact metrics
                    for key in ['price_at_trade', 'price_current', 'price_1w_after', 'price_1m_after',
                                'price_3m_after', 'return_1w_pct', 'return_1m_pct', 'return_3m_pct',
                                'return_to_current_pct', 'sp500_return_1w_pct', 'sp500_return_1m_pct',
                                'sp500_return_3m_pct', 'alpha_1w_pct', 'alpha_1m_pct', 'alpha_3m_pct']:
                        value = price_impact.get(key)
                        if value is not None:
                            record[key] = Decimal(str(value)) if not isinstance(value, Decimal) else value
                        else:
                            record[key] = None

                    # UPSERT to database
                    stmt = insert(InsiderTrade).values(**record).on_conflict_do_update(
                        constraint='uq_insider_accession_number',
                        set_={k: v for k, v in record.items() if k not in ['accession_number']}
                    )
                    await session.execute(stmt)
                    trades_count += 1

                except Exception as e:
                    print(f"    {symbol}: Error processing trade from {accession_number}: {e}")
                    continue

        return trades_count

    except Exception as e:
        print(f"  {symbol}: Error fetching insider trades: {e}")
        return 0


async def insider_trades_fetch(days_back: int = 3, full_backfill: bool = False):
    """
    Main entry point for fetching insider trades.

    Args:
        days_back: Days to look back (default 3 for daily runs)
        full_backfill: If True, fetch last 30 days for all stocks

    Processing:
    - Get list of S&P 500 symbols from SP500Stock table
    - Process in batches of 5
    - 0.2s delay between symbols, 1s between batches
    - Commit after each batch
    - Log progress
    """
    start_time = datetime.utcnow()

    # Calculate date range
    if full_backfill:
        days_back = 30
        mode = "FULL BACKFILL (30 days)"
    else:
        mode = f"INCREMENTAL ({days_back} days)"

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days_back)

    print(f"[{start_time}] Starting SEC insider trades fetch...")
    print(f"Mode: {mode}")
    print(f"Date range: {start_date} to {end_date}")
    print(f"Processing {len(SP500_TICKERS)} stocks...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    edgar_service = SECEdgarService()
    batch_size = 5
    total_trades = 0
    successful_stocks = 0
    failed_stocks = []

    async with async_session() as session:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(SP500_TICKERS), batch_size):
                batch = SP500_TICKERS[i:i + batch_size]
                batch_num = i // batch_size + 1
                total_batches = (len(SP500_TICKERS) + batch_size - 1) // batch_size
                print(f"\nBatch {batch_num}/{total_batches}: {batch}")

                batch_trades = 0

                for symbol in batch:
                    try:
                        trades_count = await fetch_insider_trades_for_symbol(
                            symbol, start_date, end_date, session, edgar_service, client
                        )

                        if trades_count > 0:
                            batch_trades += trades_count
                            successful_stocks += 1
                            print(f"  {symbol}: Added/updated {trades_count} trades")

                        # Small delay between symbols to respect rate limits
                        await asyncio.sleep(0.2)

                    except Exception as e:
                        print(f"  {symbol}: FAILED - {e}")
                        failed_stocks.append(symbol)
                        await session.rollback()

                # Commit batch
                try:
                    await session.commit()
                    total_trades += batch_trades
                    print(f"  Batch {batch_num}: Committed {batch_trades} trades")
                except Exception as e:
                    print(f"  Batch {batch_num}: Commit failed - {e}")
                    await session.rollback()

                # Longer delay between batches
                await asyncio.sleep(1)

    await engine.dispose()

    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'=' * 60}")
    print(f"Insider trades fetch complete!")
    print(f"Duration: {duration:.1f} seconds")
    print(f"Successful: {successful_stocks}/{len(SP500_TICKERS)} stocks")
    print(f"Total trades: {total_trades}")
    if failed_stocks:
        print(f"Failed stocks ({len(failed_stocks)}): {failed_stocks}")
    print(f"[{end_time}]")


async def update_price_impacts():
    """Update price impact calculations for existing trades with null values."""
    start_time = datetime.utcnow()
    print(f"[{start_time}] Starting price impact update...")

    engine = create_async_engine(settings.database.sqlalchemy_database_uri)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    updated_count = 0

    async with async_session() as session:
        # Find trades with missing price impact data
        stmt = select(InsiderTrade).where(
            InsiderTrade.price_at_trade.is_(None)
        ).order_by(InsiderTrade.transaction_date.desc()).limit(1000)

        result = await session.execute(stmt)
        trades = result.scalars().all()

        print(f"Found {len(trades)} trades with missing price impact data")

        for i, trade in enumerate(trades, 1):
            try:
                # Calculate price impact
                price_impact = await calculate_price_impact(
                    session, trade.symbol, trade.transaction_date
                )

                if price_impact:
                    # Update trade with price impact data
                    for key, value in price_impact.items():
                        if value is not None:
                            setattr(trade, key, Decimal(str(value)) if not isinstance(value, Decimal) else value)

                    updated_count += 1

                    if i % 50 == 0:
                        await session.commit()
                        print(f"  Updated {i}/{len(trades)} trades...")

            except Exception as e:
                print(f"  Error updating trade {trade.id}: {e}")

        await session.commit()

    await engine.dispose()

    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'=' * 60}")
    print(f"Price impact update complete!")
    print(f"Duration: {duration:.1f} seconds")
    print(f"Updated: {updated_count} trades")
    print(f"[{end_time}]")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--full":
            asyncio.run(insider_trades_fetch(full_backfill=True))
        elif sys.argv[1] == "--update-impacts":
            asyncio.run(update_price_impacts())
        else:
            print("Usage: python -m app.tasks.insider_trades_fetch [--full|--update-impacts]")
    else:
        asyncio.run(insider_trades_fetch(days_back=3))
