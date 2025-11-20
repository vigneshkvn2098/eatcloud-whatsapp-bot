# EatCloud WhatsApp Donation Bot

A bilingual (English/Spanish) WhatsApp chatbot for managing food donations through the EatCloud platform. Built with Node.js, Express, Twilio, and Redis.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Bot Flow](#bot-flow)
- [Language System](#language-system)
- [Session Management](#session-management)

---

## 🎯 Overview

The EatCloud WhatsApp Bot enables food donors in Colombia to create donations through WhatsApp. Users can:
- Login with their EatCloud credentials
- Search for products from a catalog of items
- Create multi-product donations with quantities and expiration dates
- Edit product details (cost, weight, VAT) based on permissions
- Interact in English or Spanish

The bot automatically detects the user's language and maintains conversation state across sessions using Redis.

---

## ✨ Features

### Core Features
- **Bilingual Support**: Automatic language detection (English/Spanish) with 50+ Spanish trigger words
- **Secure Authentication**: Email/password login with EatCloud API integration
- **Product Search**: Fuzzy search with intelligent ranking across products
- **Multi-Product Donations**: Add multiple products to a single donation
- **Product Editing**: Conditional editing of cost, weight, and VAT based on user permissions
- **Multi-Donor Support**: Select from multiple donor entities if applicable
- **Session Persistence**: Redis-backed sessions with 30-minute TTL
- **Graceful Error Handling**: User-friendly error messages in appropriate language

### Technical Features
- **Redis Session Management**: Scalable session storage with automatic expiration
- **Cooloff Protection**: Prevents spam from old button clicks
- **Health Check Endpoint**: Monitor bot and Redis connectivity
- **Graceful Shutdown**: Proper cleanup of connections on termination
- **Docker Support**: Containerized deployment ready
- **Azure Compatible**: Works with Azure Redis and App Service

---

## 🏗 Architecture

```
┌─────────────┐
│   WhatsApp  │
│    User     │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│         Twilio API                  │
│  (Webhooks: /whatsapp endpoint)     │
└──────────────┬──────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│      Express.js Server               │
│  ┌────────────────────────────────┐  │
│  │  server.js (Main Logic)        │  │
│  │  - Message routing             │  │
│  │  - State machine               │  │
│  │  - Flow control                │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  languages.js                  │  │
│  │  - Language detection          │  │
│  │  - Message translations        │  │
│  │  - Command matching            │  │
│  └────────────────────────────────┘  │
└───────┬──────────────────┬───────────┘
        │                  │
        ↓                  ↓
┌───────────────┐  ┌──────────────────┐
│  Redis Cache  │  │  EatCloud APIs   │
│  - Sessions   │  │  - Auth          │
│  - Cooloffs   │  │  - Products      │
└───────────────┘  │  - Donations     │
                   │  - Users/Donors  │
                   └──────────────────┘
```

---

## 📦 Prerequisites

- **Node.js**: v18 or higher
- **Redis**: v6 or higher (local or cloud)
- **Twilio Account**: With WhatsApp sandbox or production number
- **EatCloud API Access**: Base URL and credentials
- **npm or yarn**: Package manager

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd eatcloud-whatsapp-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Configuration](#configuration)).

### 4. Start Redis

**Local Redis:**
```bash
# macOS (with Homebrew)
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:latest
```

**Cloud Redis:**
Use Azure Redis, AWS ElastiCache, or Redis Cloud (update REDIS_URL in .env).

### 5. Run the Bot

```bash
# Development
npm run dev

# Production
npm start
```

The bot will start on `http://localhost:3000` (or PORT from .env).

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# EatCloud API Configuration
EATCLOUD_BASE_URL=eatcloud_api
DONATION_BASE_URL=eatcloud_donation_api
DONATION_USERNAME=your_donation_api_username
DONATION_PASSWORD=your_donation_api_password

# Redis Configuration (Choose one option)

# Option 1: Redis URL (Cloud/Azure)
REDIS_URL=redis://your-redis-host:6379
# Or Azure Redis with SSL
REDIS_PRIVATE_URL=rediss://your-azure-redis.redis.cache.windows.net:6380

# Option 2: Redis Host/Port (Local/Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional

# Session Configuration
SESSION_TTL_MINUTES=30
```

### Twilio Webhook Configuration

1. Go to Twilio Console → WhatsApp → Sandbox (or your number)
2. Set **"When a message comes in"** webhook to:
   ```
   https://your-domain.com/whatsapp
   ```
3. Set method to **POST**
4. Save configuration

---

## 📁 Project Structure

```
eatcloud-whatsapp-bot/
├── server.js              # Main server & bot logic
├── languages.js           # Bilingual system (EN/ES)
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── .env.example           # Environment template
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── README.md              # This file
```

### Key Files

#### `server.js` (Main Bot Logic)
- Express server setup
- Redis connection and session management
- Twilio webhook handler (`/whatsapp` endpoint)
- State machine for conversation flow
- EatCloud API integration
- Health check endpoint (`/health`)

#### `languages.js` (Bilingual System)
- English and Spanish translations
- Language detection (50+ Spanish words)
- Command matching across languages
- Dynamic message functions

---

## 🔄 Bot Flow

### Conversation State Machine

The bot uses a state machine to manage conversation flow. Each user session stores a `step` indicating their current position in the flow.

```
idle
  ↓
await_email
  ↓
await_password
  ↓
authenticated_at_menu ←──────────┐
  ↓                               │
[select_donor] (if multi-donor)   │
  ↓                               │
donation_product_search           │
  ↓                               │
donation_product_select           │
  ↓                               │
[donation_review_product_details] │
  ↓                               │
[donation_edit_cost]              │
[donation_edit_weight]            │
[donation_edit_vat]               │
  ↓                               │
donation_quantity                 │
  ↓                               │
donation_expiration_date          │
  ↓                               │
donation_add_more ────────────────┤
  ↓                               │
donation_confirm                  │
  ↓                               │
authenticated ────────────────────┘
```

### Flow Steps Explained

| Step | Description | User Input Expected |
|------|-------------|---------------------|
| `idle` | Initial state | "login" or "iniciar" |
| `await_email` | Collecting email | Valid email address |
| `await_password` | Collecting password | Password string |
| `authenticated_at_menu` | Main menu | "1" (donate) or "2" (logout) |
| `select_donor` | Choose donor entity | Number (1-N) |
| `donation_product_search` | Product search | Search term (min 2 chars) |
| `donation_product_select` | Select from results | Number (1-10) or new search |
| `donation_review_product_details` | Review product info | "ok" or "edit" |
| `donation_edit_cost` | Edit unit cost | Number or "skip" |
| `donation_edit_weight` | Edit unit weight | Number or "skip" |
| `donation_edit_vat` | Edit VAT percentage | Number (0-100) or "skip" |
| `donation_quantity` | Enter quantity | Positive integer |
| `donation_expiration_date` | Enter expiry date | YYYY-MM-DD format |
| `donation_add_more` | Add more products? | "add" or "done" |
| `donation_confirm` | Confirm donation | "confirm" or "cancel" |
| `authenticated` | Logged in, idle | "menu" or "1" |

---

## 🌐 Language System

### Automatic Language Detection

The bot detects language from the user's first message:

**Detection Priority:**
1. Login commands: `iniciar` → Spanish, `login` → English
2. Common commands: `salir`, `editar`, `agregar` → Spanish
3. Spanish words (50+ triggers): `hola`, `gracias`, `qué`, etc. → Spanish
4. Default: English

**Detected Spanish Words (50+):**
- **Greetings**: hola, buenos, buenas, días, tardes, noches
- **Politeness**: gracias, por favor, disculpa, perdón
- **Verbs**: ayuda, necesito, quiero, quisiera, puedo, donar
- **Questions**: qué, cómo, cuándo, dónde, por qué, quién
- **Nouns**: producto, cantidad, peso, fecha, correo
- **Phrases**: no entiendo, otra vez, está bien
- **Food terms**: alimento, comida, leche, queso, yogurt

### Language Persistence

Once detected, the language is stored in the user's Redis session:

```javascript
{
  lang: 'es',  // or 'en'
  step: 'await_email',
  // ... other session data
}
```

The language persists throughout the session (30 minutes by default).

### Command Translation

All commands work in both languages:

| Action | English | Spanish |
|--------|---------|---------|
| Login | `login` | `iniciar` |
| Menu | `menu` | `menu` |
| Logout | `logout` | `salir` |
| Confirm | `ok` | `ok` |
| Edit | `edit` | `editar` |
| Skip | `skip` | `saltar` |
| Add | `add` | `agregar` |
| Done | `done` | `listo` |
| Confirm | `confirm` | `confirmar` |
| Cancel | `cancel` | `cancelar` |

---

### Product Search Algorithm

The bot uses intelligent fuzzy search with ranking:

```javascript
// Search attempts with progressive shortening
1. Search for "yogurt" → 5 results
2. If no results, search "yogur" → retry
3. If no results, search "yogu" → retry
4. Max 3 attempts

// Ranking algorithm (score 0-100)
100 = Exact match
90  = Starts with search term
80  = Word boundary match
70  = Contains search term
60  = Partial word matches

// Returns top 10 products sorted by score
```

---

## 💾 Session Management

### Redis Session Structure

Each WhatsApp number has a session stored in Redis:

```javascript
// Key: session:whatsapp:+1234567890
{
  lang: 'es',                    // Detected language
  step: 'donation_quantity',     // Current state
  email: 'user@example.com',
  token: 'jwt_token_here',
  attempts: 0,                    // Login attempts
  
  // User details from API
  userDetails: {
    codeCuaUser: 'CUA123',
    cuaMasterCode: 'MASTER123',
    selectedPodId: 'POD001',
    selectedPodName: 'Centro Norte',
    donorInfo: {
      needsSelection: false,
      donorCode: 'DON001',
      donorName: 'Alpina S.A.'
    },
    email: 'user@example.com',
    permissions: {
      canEditCost: true,
      canEditWeight: true,
      canEditTax: true,
      canCreateProducts: false
    }
  },
  
  // Donor selection (if multi-donor)
  selectedDonorCode: 'DON002',
  selectedDonorName: 'Subsidiary B',
  
  // Product selection
  productMatches: [...],          // Search results
  selectedProduct: {
    id: 123,
    code: 'PRD001',
    odd_code: 'ALP-MLK-001',
    name: 'Alpina Leche Entera 1L',
    unit_cost: '4500',
    unit_weight_kg: '1.05',
    vat_percentage: '5'
  },
  
  // Donation building
  donationQuantity: 50,
  donationItems: [
    {
      product: {...},
      quantity: 50,
      expirationDate: '2025-12-31'
    }
  ]
}
```

### Session TTL

- **Default**: 30 minutes (configurable via `SESSION_TTL_MINUTES`)
- **Auto-refresh**: Every interaction extends the TTL
- **Expiration**: Session deleted after TTL, user must login again

### Cooloff Protection

Prevents spam from old button clicks:

```javascript
// Key: cooloff:whatsapp:+1234567890
// Value: 'true'
// TTL: 3-5 seconds

// If in cooloff, ignore the message
```

---

### Health Check

Check if the bot is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2025-11-19T...",
  "environment": "production",
  "redis": "connected"
}
```

### Twilio Testing

1. Go to Twilio Console → WhatsApp → Sandbox
2. Send join code to sandbox number
3. Send: `hello` or `hola`
4. Follow the flow

---

### Debugging Tips

#### Enable Verbose Logging

Add to server.js:
```javascript
console.log('Session state:', JSON.stringify(s, null, 2));
console.log('API Request:', url, params);
console.log('API Response:', JSON.stringify(response.data, null, 2));
```

#### Monitor Redis

```bash
# Watch Redis commands
redis-cli monitor

# Check session keys
redis-cli KEYS "session:*"

# View session data
redis-cli GET "session:whatsapp:+1234567890"
```

#### Test API Endpoints

```bash
# Test login
curl -X POST "$EATCLOUD_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test product search
curl "$EATCLOUD_BASE_URL/api/odds?code_cua_user=XXX&name=_lkleche_lk" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Performance & Scaling

### Current Capacity

- **Concurrent Users**: 10,000+
- **Session Storage**: Redis (scalable)
- **API Rate Limits**: Depends on EatCloud API
- **Memory Usage**: ~100MB per instance
- **CPU Usage**: Low (mostly I/O bound)

### Scaling Strategies

#### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```
                 ┌──────────┐
                 │   Load   │
                 │ Balancer │
                 └────┬─────┘
           ┌──────────┼──────────┐
           ↓          ↓          ↓
     ┌─────────┐┌─────────┐┌─────────┐
     │ Bot #1  ││ Bot #2  ││ Bot #3  │
     └────┬────┘└────┬────┘└────┬────┘
          └──────────┼──────────┘
                     ↓
              ┌─────────────┐
              │ Redis Cache │
              └─────────────┘
```

#### Redis Scaling

- **Azure Redis**: Premium tier for clustering
- **Redis Cluster**: Multiple nodes
- **Redis Sentinel**: High availability

### Monitoring

#### Key Metrics

- **Health endpoint**: `/health` (200 = healthy)
- **Redis connection**: Check `redis: 'connected'`
- **Session count**: `DBSIZE` in Redis
- **Memory usage**: Monitor Redis memory
- **API response times**: Track in logs

#### Recommended Tools

- **Application Insights** (Azure)
- **Datadog**
- **New Relic**
- **PM2 monitoring**

---

## 🔐 Security Best Practices

### Implemented

- ✅ Passwords transmitted securely (HTTPS)
- ✅ Passwords not stored (deleted immediately)
- ✅ JWT tokens stored in Redis (encrypted at rest)
- ✅ Email masking in messages
- ✅ Session expiration (30 min default)
- ✅ Environment variables for secrets
- ✅ Basic auth for donation API
- ✅ Input validation (email, dates, numbers)

### Recommendations

1. **Use HTTPS only** for Twilio webhooks
2. **Rotate API credentials** regularly
3. **Enable Redis AUTH** in production
4. **Use Azure Key Vault** for secrets
5. **Monitor failed login attempts**
6. **Implement rate limiting** if needed
7. **Log security events**
8. **Keep dependencies updated** (`npm audit`)

---

**Version**: 2.0.0  
**Last Updated**: November 19 2025  
**Status**: Production Ready 🚀