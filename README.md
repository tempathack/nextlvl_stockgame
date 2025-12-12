# 180-Day Stock Trading Game

A competitive stock trading simulation where players start with $100,000 virtual cash and compete over 180 days to achieve the highest returns.

## Features

- Real-time stock prices via Yahoo Finance API
- Buy, Sell, Short, and Cover positions
- 0.1% trading fee on all transactions
- Live leaderboard with rankings
- Activity feed showing all trades
- Portfolio comparison between players
- S&P 500 sector heatmap and market indices
- SEC insider trades tracking

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tempathack/nextlvl_stockgame.git
   cd nextlvl_stockgame
   ```

2. **Configure the game**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your game start date:
   ```
   GAME_START_DATE=2025-01-15
   ```

3. **Start the application**
   ```bash
   ./scripts/start-stock-game.sh
   ```

4. **Start the ingress tunnel** (in a separate terminal)
   ```bash
   minikube tunnel
   ```

5. **Access the game**
   - Frontend: http://stock-game.local
   - API Docs: http://stock-game.local/api/docs

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GAME_START_DATE` | Yes | - | Competition start date (YYYY-MM-DD) |
| `GAME_DURATION_DAYS` | No | 180 | Competition length in days |
| `STARTING_CAPITAL` | No | 100000 | Initial cash per player |
| `JWT_SECRET_KEY` | No | auto | JWT signing key (auto-generated if empty) |
| `POSTGRES_PASSWORD` | No | stock_game_secret_change_me | Database password |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │
│  React + MUI    │     │    FastAPI      │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ PostgreSQL│ │  Redis   │ │  Yahoo   │
              │    DB     │ │  Cache   │ │ Finance  │
              └──────────┘ └──────────┘ └──────────┘
```

## Useful Commands

```bash
# View running pods
kubectl get pods -n stock-game

# View backend logs
kubectl logs -f deployment/backend -n stock-game

# Access database
kubectl port-forward svc/postgres-service 5432:5432 -n stock-game

# Stop the game
./scripts/stop-stock-game.sh
```

## Game Rules

1. Each player starts with $100,000 virtual cash
2. Trading is only allowed between the start and end dates
3. All trades incur a 0.1% fee
4. All trades are public and visible to other players
5. Short selling is allowed
6. Winner is determined by total portfolio value at end date

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI, ECharts
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Deployment**: Kubernetes (Minikube)

## License

MIT
