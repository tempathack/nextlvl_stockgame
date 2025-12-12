"""S&P 500 stock data models - Daily Historical and Hourly Current."""
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import String, Numeric, DateTime, Date, BigInteger, Index, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdentifierMixin


# Full S&P 500 ticker list (503 stocks including dual-class shares)
SP500_TICKERS = [
    "MMM", "AOS", "ABT", "ABBV", "ACN", "ADBE", "AMD", "AES", "AFL", "A", "APD", "ABNB", "AKAM", "ALB", "ARE",
    "ALGN", "ALLE", "LNT", "ALL", "GOOGL", "GOOG", "MO", "AMZN", "AMCR", "AEE", "AEP", "AXP", "AIG", "AMT",
    "AWK", "AMP", "AME", "AMGN", "APH", "ADI", "AON", "APA", "APO", "AAPL", "AMAT", "APTV", "ACGL", "ADM",
    "ANET", "AJG", "AIZ", "T", "ATO", "ADSK", "ADP", "AZO", "AVB", "AVY", "AXON", "BKR", "BALL", "BAC", "BAX",
    "BDX", "BRK.B", "BBY", "TECH", "BIIB", "BLK", "BX", "BK", "BA", "BKNG", "BSX", "BMY", "AVGO", "BR", "BRO",
    "BF.B", "BLDR", "BG", "BXP", "CHRW", "CDNS", "CZR", "CPT", "CPB", "COF", "CAH", "KMX", "CCL", "CARR", "CAT",
    "CBOE", "CBRE", "CDW", "COR", "CNC", "CNP", "CF", "CRL", "SCHW", "CHTR", "CVX", "CMG", "CB", "CHD", "CI",
    "CINF", "CTAS", "CSCO", "C", "CFG", "CLX", "CME", "CMS", "KO", "CTSH", "COIN", "CL", "CMCSA", "CAG", "COP",
    "ED", "STZ", "CEG", "COO", "CPRT", "GLW", "CPAY", "CTVA", "CSGP", "COST", "CTRA", "CRWD", "CCI", "CSX",
    "CMI", "CVS", "DHR", "DRI", "DDOG", "DVA", "DAY", "DECK", "DE", "DELL", "DAL", "DVN", "DXCM", "FANG", "DLR",
    "DG", "DLTR", "D", "DPZ", "DASH", "DOV", "DOW", "DHI", "DTE", "DUK", "DD", "EMN", "ETN", "EBAY", "ECL",
    "EIX", "EW", "EA", "ELV", "EMR", "ENPH", "ETR", "EOG", "EPAM", "EQT", "EFX", "EQIX", "EQR", "ERIE", "ESS",
    "EL", "EG", "EVRG", "ES", "EXC", "EXE", "EXPE", "EXPD", "EXR", "XOM", "FFIV", "FDS", "FICO", "FAST", "FRT",
    "FDX", "FIS", "FITB", "FSLR", "FE", "FI", "F", "FTNT", "FTV", "FOXA", "FOX", "BEN", "FCX", "GRMN", "IT",
    "GE", "GEHC", "GEV", "GEN", "GNRC", "GD", "GIS", "GM", "GPC", "GILD", "GPN", "GL", "GDDY", "GS", "HAL",
    "HIG", "HAS", "HCA", "DOC", "HSIC", "HSY", "HPE", "HLT", "HOLX", "HD", "HON", "HRL", "HST", "HWM", "HPQ",
    "HUBB", "HUM", "HBAN", "HII", "IBM", "IEX", "IDXX", "ITW", "INCY", "IR", "PODD", "INTC", "ICE", "IFF", "IP",
    "IPG", "INTU", "ISRG", "IVZ", "INVH", "IQV", "IRM", "JBHT", "JBL", "JKHY", "J", "JNJ", "JCI", "JPM", "K",
    "KVUE", "KDP", "KEY", "KEYS", "KMB", "KIM", "KMI", "KKR", "KLAC", "KHC", "KR", "LHX", "LH", "LRCX", "LW",
    "LVS", "LDOS", "LEN", "LII", "LLY", "LIN", "LYV", "LKQ", "LMT", "L", "LOW", "LULU", "LYB", "MTB", "MPC",
    "MKTX", "MAR", "MMC", "MLM", "MAS", "MA", "MTCH", "MKC", "MCD", "MCK", "MDT", "MRK", "META", "MET", "MTD",
    "MGM", "MCHP", "MU", "MSFT", "MAA", "MRNA", "MHK", "MOH", "TAP", "MDLZ", "MPWR", "MNST", "MCO", "MS", "MOS",
    "MSI", "MSCI", "NDAQ", "NTAP", "NFLX", "NEM", "NWSA", "NWS", "NEE", "NKE", "NI", "NDSN", "NSC", "NTRS",
    "NOC", "NCLH", "NRG", "NUE", "NVDA", "NVR", "NXPI", "ORLY", "OXY", "ODFL", "OMC", "ON", "OKE", "ORCL",
    "OTIS", "PCAR", "PKG", "PLTR", "PANW", "PH", "PAYX", "PAYC", "PYPL", "PNR", "PEP", "PFE", "PCG", "PM",
    "PSX", "PNW", "PNC", "POOL", "PPG", "PPL", "PFG", "PG", "PGR", "PLD", "PRU", "PEG", "PTC", "PSA", "PHM",
    "PWR", "QCOM", "DGX", "RL", "RJF", "RTX", "O", "REG", "REGN", "RF", "RSG", "RMD", "RVTY", "ROK", "ROL",
    "ROP", "ROST", "RCL", "SPGI", "CRM", "SBAC", "SLB", "STX", "SRE", "NOW", "SHW", "SPG", "SWKS", "SJM", "SW",
    "SNA", "SOLV", "SO", "LUV", "SWK", "SBUX", "STT", "STLD", "STE", "SYK", "SMCI", "SYF", "SNPS", "SYY",
    "TMUS", "TROW", "TTWO", "TPR", "TRGP", "TGT", "TEL", "TDY", "TER", "TSLA", "TXN", "TPL", "TXT", "TMO",
    "TJX", "TKO", "TTD", "TSCO", "TT", "TDG", "TRV", "TRMB", "TFC", "TYL", "TSN", "USB", "UBER", "UDR", "ULTA",
    "UNP", "UAL", "UPS", "URI", "UNH", "UHS", "VLO", "VTR", "VLTO", "VRSN", "VRSK", "VZ", "VRTX", "VTRS",
    "VICI", "V", "VST", "VMC", "WRB", "GWW", "WAB", "WBA", "WMT", "DIS", "WBD", "WM", "WAT", "WEC", "WFC",
    "WELL", "WST", "WDC", "WY", "WSM", "WMB", "WTW", "WDAY", "WYNN", "XEL", "XYL", "YUM", "ZBRA", "ZBH", "ZTS"
]


class SP500Stock(Base, IdentifierMixin):
    """S&P 500 stock metadata."""

    __tablename__ = "sp500_stocks"

    symbol: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(50), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_daily_fetch: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_hourly_fetch: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StockDailyHistory(Base, IdentifierMixin):
    """
    Daily historical stock prices for S&P 500 - for Technical Analysis.
    Updated once per day with full historical data.
    """

    __tablename__ = "stock_daily_history"
    __table_args__ = (
        UniqueConstraint("symbol", "date", name="uq_stock_daily_symbol_date"),
        Index("ix_stock_daily_symbol", "symbol"),
        Index("ix_stock_daily_date", "date"),
        Index("ix_stock_daily_symbol_date", "symbol", "date"),
    )

    symbol: Mapped[str] = mapped_column(String(12), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    adj_close: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Technical Indicators (calculated during ingestion)
    sma_5: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    sma_10: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    sma_20: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    sma_50: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    sma_200: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    ema_12: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    ema_26: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    rsi_14: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    macd: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    macd_signal: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    macd_histogram: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    bollinger_upper: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    bollinger_middle: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    bollinger_lower: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    atr_14: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    obv: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    vwap: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)

    # Daily change metrics
    change: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    change_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)


class StockHourlyData(Base, IdentifierMixin):
    """
    Hourly stock prices for S&P 500 - for real-time dashboard.
    Updated every hour via CronJob. Keeps 7 days of hourly data.
    """

    __tablename__ = "stock_hourly_data"
    __table_args__ = (
        UniqueConstraint("symbol", "timestamp", name="uq_stock_hourly_symbol_timestamp"),
        Index("ix_stock_hourly_symbol", "symbol"),
        Index("ix_stock_hourly_timestamp", "timestamp"),
        Index("ix_stock_hourly_symbol_timestamp", "symbol", "timestamp"),
    )

    symbol: Mapped[str] = mapped_column(String(12), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Short-term indicators for hourly data
    sma_20: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    rsi_14: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    vwap: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)

    # Change from previous hour
    change: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    change_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
