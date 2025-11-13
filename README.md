# EatCloud WhatsApp Bot

WhatsApp chatbot for the EatCloud food donation platform in Colombia.

## Features

- 🔐 Secure email/password authentication
- 📦 Product search with fuzzy matching
- 🏢 Multi-donor support
- 📊 Permission-based product editing
- 🎯 Multiple products per donation
- 💾 Redis-based session management
- 🔄 Auto-expiring sessions (30 min default)

## Tech Stack

- **Backend:** Node.js + Express
- **Messaging:** Twilio WhatsApp API
- **Session Storage:** Redis
- **Deployment:** Docker + Railway/Azure

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Twilio account with WhatsApp enabled
- Redis (local or cloud)

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/eatcloud-whatsapp-bot.git
cd eatcloud-whatsapp-bot
```

### 2. Set up environment variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
EATCLOUD_BASE_URL=https://devservice.eatcloud.info
SESSION_TTL_MINUTES=30
DONATION_BASE_URL=https://devdonantes.eatcloud.info
DONATION_USERNAME=your_username
DONATION_PASSWORD=your_password
NODE_ENV=development

# Redis Configuration (for docker-compose)
REDIS_HOST=redis
REDIS_PORT=6379
```

### 3. Run with Docker Compose

```bash
# Start all services (bot + redis)
docker compose -f docker-compose.dev.yml up --build

# Or run in background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

### 4. Test locally

- Health check: http://localhost:3000/health
- Configure Twilio webhook to your ngrok URL (for local testing)

## Production Deployment

### Railway

1. Push to GitHub
2. Connect Railway to your repository
3. Add Redis database
4. Set environment variables
5. Deploy!


## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `EATCLOUD_BASE_URL` | EatCloud API base URL | Yes |
| `DONATION_BASE_URL` | Donation API base URL | Yes |
| `DONATION_USERNAME` | Donation API username | Yes |
| `DONATION_PASSWORD` | Donation API password | Yes |
| `SESSION_TTL_MINUTES` | Session expiration time | No (default: 30) |
| `REDIS_URL` | Redis connection string (Railway) | Conditional |
| `REDIS_HOST` | Redis hostname (docker-compose) | Conditional |
| `REDIS_PORT` | Redis port (docker-compose) | Conditional |

## Project Structure

```
├── server.js                      # Main application
├── package.json                   # Dependencies
├── Dockerfile                     # Docker image definition
├── docker-compose.dev.yml         # Local development setup
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

## Bot Workflow

1. User sends "login" to WhatsApp
2. Bot requests email and password
3. Authenticates with EatCloud API
4. User selects donor (if multiple)
5. User searches for products
6. User selects products and quantities
7. User confirms donation
8. Bot creates donation via API

## Security Notes

- ⚠️ Never commit `.env` file
- ⚠️ Never commit credentials to GitHub
- ✅ Use environment variables for all secrets
- ✅ Redis sessions auto-expire after 30 minutes
- ✅ Passwords are never stored, only transmitted

### Bot not responding

1. Check Railway logs
2. Verify Twilio webhook URL is correct
3. Test health endpoint: `/health`
4. Check Redis connection in logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

