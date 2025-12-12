#!/bin/bash

# Market Data Seeding Script
# Seeds the database with initial market data from Yahoo Finance

set -e  # Exit on error

echo "=============================================="
echo "Market Data Database Initialization"
echo "=============================================="
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env file from .env.example"
    echo ""
    echo "Quick fix:"
    echo "  cp .env.example .env"
    echo "  # Then edit .env and set SECURITY__JWT_SECRET_KEY"
    exit 1
fi

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "WARNING: Virtual environment not detected"
    echo "Make sure you have activated your Python virtual environment"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting database initialization..."
echo ""
echo "This will:"
echo "  1. Seed 4 market indices (S&P 500, NASDAQ, DOW, VIX)"
echo "  2. Seed 11 sector performances (via ETFs)"
echo "  3. Seed 20 popular stock prices"
echo ""
echo "This may take 1-2 minutes due to Yahoo Finance API..."
echo ""

# Run the initialization script
python -m app.tasks.init_data

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✓ Database initialization completed!"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Start the backend server"
    echo "  2. Check the dashboard - data should now load"
    echo "  3. Optionally set up CronJob to run:"
    echo "     python -m app.tasks.market_refresh"
    echo ""
else
    echo ""
    echo "=============================================="
    echo "✗ Database initialization failed!"
    echo "=============================================="
    echo ""
    echo "Common issues:"
    echo "  - Yahoo Finance API may be temporarily unavailable"
    echo "  - Database connection issues"
    echo "  - Missing dependencies"
    echo ""
    echo "Try:"
    echo "  1. Wait 5-10 minutes and run again"
    echo "  2. Check database is running and .env is correct"
    echo "  3. Check logs above for specific errors"
    echo ""
    exit 1
fi
