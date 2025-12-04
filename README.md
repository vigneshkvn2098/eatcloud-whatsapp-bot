# EatCloud WhatsApp Donation Bot

A production-ready, bilingual (English/Spanish) WhatsApp chatbot for managing food donations through the EatCloud platform. Built with Node.js, Express, Twilio, and Redis.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Status](https://img.shields.io/badge/status-production%20ready-success)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Setup Redis on Azure](#4-setup-redis-on-azure)
  - [5. Setup Twilio WhatsApp Business API](#5-setup-twilio-whatsapp-business-api)
- [Docker Deployment](#docker-deployment)
- [Azure Deployment](#azure-deployment)
- [Bot Usage Guide](#bot-usage-guide)
- [Architecture](#architecture)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The EatCloud WhatsApp Bot enables food donors in Colombia to create donations directly through WhatsApp. The bot provides a conversational interface for managing the complete donation workflow.

### Key Capabilities

- **Secure Authentication**: Login with EatCloud credentials via email/password
- **Product Search**: Search through 200,000+ products with intelligent fuzzy matching
- **Create New Products**: Add new products to the catalog when not found 
- **Multi-Product Donations**: Bundle multiple products in a single donation
- **Product Customization**: Edit cost, weight, and VAT based on permissions
- **Bilingual Support**: Automatic English/Spanish language detection
- **Multi-Donor Support**: Handle organizations with multiple donor entities

**Target Users**: 2,000+ food donors in Colombia  
**Launch Date**: December 2025  
**Session Timeout**: 60 minutes (configurable)

---

## ✨ Features

### 🌐 Bilingual Interface
- **Automatic Language Detection**: Detects Spanish or English from first message
- **50+ Spanish Trigger Words**: Accurate language identification
- **Persistent Language**: Language choice maintained throughout session
- **All Commands Translated**: Every message available in both languages

### 🔍 Smart Product Search
- **200,000+ Products**: Search across entire EatCloud catalog
- **Fuzzy Matching**: Finds products even with typos or partial names
- **Intelligent Ranking**: Best matches shown first (top 10 results)
- **Progressive Search**: Automatically tries shorter terms if no results

### ➕ Create New Products 
- **When Not Found**: Option to create product when search returns no results
- **When Results Shown**: Type "0" to create product even if results exist
- **Smart Code Generation**: Automatic product codes with readable identifiers
- **Immediate Availability**: Created products ready to use instantly
- **Collects Required Data**:
  - Product name (user-specified)
  - Unit cost (in pesos)
  - Unit weight (in kilograms)
  - VAT percentage (0-100%)

### 📦 Multi-Product Donations
- **Unlimited Products**: Add as many products as needed per donation
- **Complete Tracking**: Quantity, weight, cost, and expiration per product
- **Review Before Submit**: See full donation details before confirmation
- **Edit or Cancel**: Modify or cancel donation before final submission

### 🔐 Security & Reliability
- **HTTPS Only**: All communications encrypted
- **Password Protection**: Secure transmission, immediately deleted after use
- **JWT Authentication**: Token-based API access
- **Session Management**: Redis-backed with automatic expiration
- **Input Validation**: Email, dates, and numbers validated
- **Spam Protection**: Cooloff periods prevent abuse

---

## 📦 Prerequisites

### Required Software

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Node.js** | v18+ | Application runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | v8+ | Package manager | Included with Node.js |
| **Docker** | Latest | Container deployment | [docker.com](https://www.docker.com/get-started) |
| **Azure CLI** | Latest | Azure management | [Install Guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/downloads) |

### Required Accounts & Credentials

✅ **EatCloud API Access**
- Base URL
- API credentials for authentication

✅ **EatCloud Donation API Access**
- Base URL
- Username and password

✅ **Twilio WhatsApp Business API**
- Active Twilio account
- WhatsApp Business API approved 
- WhatsApp-enabled phone number

✅ **Microsoft Azure Account**
- Active subscription
- Sufficient credits for App Service + Redis

---

## 📖 Setup Guide

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/eatcloud-whatsapp-bot.git

# Navigate to project directory
cd eatcloud-whatsapp-bot

# Verify files
ls -la
# You should see: server.js, languages.js, package.json, Dockerfile, etc.
```

---

### 2. Install Dependencies

```bash
# Install all Node.js packages
npm install

# Verify installation
npm list --depth=0
```

**Installed packages:**
- `express` - Web framework
- `twilio` - WhatsApp integration
- `redis` - Session storage
- `axios` - HTTP client for APIs
- `dotenv` - Environment configuration
- `body-parser` - Request parsing

---

### 3. Configure Environment Variables

Create your production configuration file:

```bash
# Create .env file from template
cp .env.example .env
```

Open `.env` and configure the following:

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=8080
NODE_ENV=production

# ============================================
# EATCLOUD API CONFIGURATION
# ============================================
# Main EatCloud API base URL
EATCLOUD_BASE_URL=<eatcloud_base_url>

# Donation API base URL
DONATION_BASE_URL=<eatcloud_donation_url>

# Donation API credentials
DONATION_USERNAME=your_production_username
DONATION_PASSWORD=your_production_password

# ============================================
# REDIS CONFIGURATION (Azure)
# ============================================
# Azure Redis with SSL (recommended for production)
REDIS_PRIVATE_URL=rediss://eatcloud-redis.redis.cache.windows.net:6380

# ============================================
# SESSION CONFIGURATION
# ============================================
# Session timeout in minutes
SESSION_TTL_MINUTES=60
```

**⚠️ Security Notes:**
- Never commit `.env` to version control
- Use strong passwords for all credentials
- Rotate credentials regularly
- Keep API keys confidential

---

### 4. Setup Redis on Azure

Redis is required for session management. Follow these steps to set up Azure Redis Cache.

#### Step 4.1: Login to Azure

```bash
az login
```

#### Step 4.2: Create Resource Group

```bash
az group create \
  --name eatcloud-rg \
  --location eastus
```

#### Step 4.3: Create Azure Redis Cache

```bash
az redis create \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

**This will take 5-10 minutes to complete.**

#### Step 4.4: Get Redis Connection String

```bash
# Get primary key
az redis list-keys \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query primaryKey \
  --output tsv
```

#### Step 4.5: Construct Connection String

Format: `rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_PRIMARY_KEY`

#### Step 4.6: Update .env File

```env
REDIS_PRIVATE_URL=rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_PRIMARY_KEY_HERE
```

#### Step 4.7: Verify Redis Connection

```bash
# Test connection
az redis show \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query provisioningState
# Should return: "Succeeded"
```

**Redis Configuration Complete ✅**

---

### 5. Setup Twilio WhatsApp Business API

#### Step 5.1: Create Twilio Account

1. Go to [Twilio Sign Up](https://www.twilio.com/try-twilio)
2. Create account with business email
3. Verify email and phone number
4. Complete business profile

#### Step 5.2: Request WhatsApp Business API Access

**⚠️ Important:** The Twilio Sandbox is for testing only. Production requires WhatsApp Business API.

1. **Navigate to WhatsApp:**
   - Login to [Twilio Console](https://console.twilio.com)
   - Go to **Messaging** → **Try it out** → **Send a WhatsApp message**

2. **Request Production Access:**
   - Click **"Request Access"** for WhatsApp Business API
   - Fill out the business information form:

3. **Submit Business Documentation:**
   - Business registration certificate
   - Tax ID or VAT number
   - Proof of business address
   - ID of business owner/representative

4. **Wait for Approval:**
   - Approval typically takes 1-3 business days
   - Twilio will email you when approved
   - You may receive follow-up questions

#### Step 5.3: Configure Business Profile

Once approved:

1. **Set Business Profile:**

2. **Upload Profile Photo:**

#### Step 5.4: Activate WhatsApp Number

1. **Get Phone Number:**
   - Go to **Messaging** → **WhatsApp** → **Senders**
   - Click **"Activate WhatsApp Sender"**
   - Twilio will provide a WhatsApp-enabled phone number
   - Example: `+1 415 123 4567`

2. **Save Your Number:**
   - This is the number users will message to interact with the bot
   - Document this number for user communications

#### Step 5.5: Configure Webhook (After Deployment)

**⚠️ Complete this step AFTER deploying the bot to Azure**

1. **Navigate to Webhook Settings:**
   - Go to **Messaging** → **WhatsApp** → **Senders**
   - Click on your WhatsApp number
   - Scroll to **Webhook** section

2. **Configure Incoming Messages:**
   - **When a message comes in**: `https://eatcloud-bot.azurewebsites.net/whatsapp`
   - **HTTP Method**: POST
   - **Status Callback URL**: (Leave empty)

3. **Save Configuration**

**Twilio Setup Complete ✅**

---

## 🐳 Docker Deployment

### Build Docker Image

```bash
# Navigate to project directory
cd eatcloud-whatsapp-bot

# Build the image
docker build -t eatcloud-bot:latest .

# Verify build
docker images | grep eatcloud-bot
```

### Test Docker Image Locally (Optional)

```bash
# Run container
docker run -d \
  -p 3000:3000 \
  --name eatcloud-bot-test \
  --env-file .env \
  eatcloud-bot:latest

# Check logs
docker logs eatcloud-bot-test

# Expected output:
# ✅ Connected to Redis
# ✅ WhatsApp bot listening on port 3000
# 🌐 Languages: English (en), Español (es)

# Stop and remove test container
docker stop eatcloud-bot-test
docker rm eatcloud-bot-test
```

### Push to Azure Container Registry

```bash
# Create Azure Container Registry
az acr create \
  --resource-group eatcloud-rg \
  --name eatcloudregistry \
  --sku Basic

# Login to registry
az acr login --name eatcloudregistry

# Tag image for Azure
docker tag eatcloud-bot:latest \
  eatcloudregistry.azurecr.io/eatcloud-bot:latest

# Push to Azure Container Registry
docker push eatcloudregistry.azurecr.io/eatcloud-bot:latest

# Verify push
az acr repository list --name eatcloudregistry --output table
```

**Docker Image Ready ✅**

---

## ☁️ Azure Deployment

### Option A: Deploy with Azure App Service (Recommended)

#### Step A1: Create App Service Plan

```bash
# Create App Service plan
az appservice plan create \
  --name eatcloud-plan \
  --resource-group eatcloud-rg \
  --sku B1 \
  --is-linux
```

#### Step A2: Create Web App

```bash
az webapp create \
  --resource-group eatcloud-rg \
  --plan eatcloud-plan \
  --name eatcloud-bot \
  --runtime "NODE|18-lts"
```

#### Step A3: Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    EATCLOUD_BASE_URL="<eatcloud_base_url>" \
    DONATION_BASE_URL="<eatcloud_donation_url>" \
    DONATION_USERNAME="your_username" \
    DONATION_PASSWORD="your_password" \
    REDIS_PRIVATE_URL="rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_KEY" \
    SESSION_TTL_MINUTES=60
```

#### Step A4: Deploy Code

**Method 1: Deploy from Git Repository**

```bash
# Configure deployment source
az webapp deployment source config \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --repo-url https://github.com/your-org/eatcloud-whatsapp-bot \
  --branch main \
  --manual-integration

# Trigger deployment
az webapp deployment source sync \
  --name eatcloud-bot \
  --resource-group eatcloud-rg
```

**Method 2: Deploy ZIP File**

```bash
# Create deployment package
zip -r app.zip . -x "*.git*" "node_modules/*" ".env"

# Deploy ZIP
az webapp deployment source config-zip \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --src app.zip
```

#### Step A5: Get Application URL

```bash
# Get your bot URL
az webapp show \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --query defaultHostName \
  --output tsv
```

**Output:** `eatcloud-bot.azurewebsites.net`

**Your bot is now accessible at:** `https://eatcloud-bot.azurewebsites.net`

#### Step A6: Configure Twilio Webhook

Now that your bot is deployed, configure Twilio:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **WhatsApp** → **Senders**
3. Click on your WhatsApp number
4. Set webhook URL: `https://eatcloud-bot.azurewebsites.net/whatsapp`
5. Method: **POST**
6. **Save**

#### Step A7: Verify Deployment

```bash
# Check health endpoint
curl https://eatcloud-bot.azurewebsites.net/health

# Expected response:
{
  "status": "healthy",
  "redis": "connected",
  "uptime": 123,
  "timestamp": "2025-12-01T...",
  "environment": "production"
}

# View application logs
az webapp log tail \
  --name eatcloud-bot \
  --resource-group eatcloud-rg
```

#### Step A8: Test the Bot

1. Open WhatsApp on your phone
2. Send a message to your Twilio WhatsApp number
3. Send: `Hello` or `Hola`
4. Expected response:
   ```
   Welcome to EatCloud! Type "login" to sign in.
   ```
   or
   ```
   ¡Bienvenido a EatCloud! Escribe "iniciar" para ingresar.
   ```

**Deployment Complete! 🎉**

---

### Option B: Deploy with Azure Container Instances

If you prefer containerized deployment:

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name eatcloudregistry \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name eatcloudregistry \
  --query passwords[0].value \
  --output tsv)

# Create container instance
az container create \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --image eatcloudregistry.azurecr.io/eatcloud-bot:latest \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label eatcloud-bot \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    EATCLOUD_BASE_URL="<eatcloud_base_url>" \
    DONATION_BASE_URL="<eatcloud_donation_url>" \
    DONATION_USERNAME="your_username" \
    DONATION_PASSWORD="your_password" \
    REDIS_PRIVATE_URL="rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_KEY" \
    SESSION_TTL_MINUTES=60

# Get container URL
az container show \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --query ipAddress.fqdn \
  --output tsv
```

---

## 📱 Bot Usage Guide

### User Flow Overview

```
1. User sends "Hello" or "Hola" to WhatsApp number
2. Bot detects language and prompts for login
3. User enters email and password
4. If multiple donors: User selects donor entity
5. User searches for product or creates new product
6. User enters quantity and expiration date
7. User can add more products or proceed to review
8. User reviews and confirms donation
9. Donation created successfully
```

### Detailed User Instructions

#### 1. Starting a Conversation

**English Users:**
```
Send: Hello
Bot: Welcome to EatCloud! Type "login" to sign in.
```

**Spanish Users:**
```
Send: Hola
Bot: ¡Bienvenido a EatCloud! Escribe "iniciar" para ingresar.
```

#### 2. Login Process

```
User: login (or "iniciar" in Spanish)
Bot: Please enter your registered email address.

User: donor@company.com
Bot: Thanks. Now enter your password for d***r@company.com

     SECURITY REMINDER:
     After sending your password, immediately:
     • Long-press your password message
     • Tap "Delete" -> "Delete for me"

User: [password]
Bot: Login successful! Welcome, d***r@company.com.
     
     === MAIN MENU ===
     1. Make a Donation
     2. Logout
```

#### 3. Select Donor (If Applicable)

For organizations with multiple donor entities:

```
Bot: Which entity are you donating as?
     
     1. Main Company
     2. Subsidiary A
     3. Subsidiary B
     
     Reply with the number.

User: 1
Bot: Selected: Main Company
     Donation point: Distribution Center North
```

#### 4. Search for Product

```
Bot: What product would you like to donate?
     
     Tip: Type part of the product name (e.g., "crema", "yogurt")

User: leche
Bot: Found 10 matching products:
     
     1. LECHE ENTERA 1L
     2. LECHE DESCREMADA 1L
     3. LECHE ENTERA BOLSA 900ML
     ...
     10. LECHE DESLACTOSADA 1L
     
     Reply with the number to select,
     Type a new search term to search again,
     Or type "0" to create a new product.
```

#### 5a. Select Existing Product

```
User: 1
Bot: Selected: LECHE ENTERA 1L
     
     How many units would you like to donate?
     (Enter a number)

User: 50
Bot: Quantity: 50 units
     
     What is the expiration date?
     Format: YYYY-MM-DD (e.g., 2025-12-31)

User: 2025-12-31
Bot: ✅ Product added to donation:
     
     LECHE ENTERA 1L
     Quantity: 50 units
     Weight: 52.50 kg
     Expiration: 2025-12-31
     
     Total products in donation: 1
     
     Type "add" to add another product.
     Type "done" to review and confirm donation.
```

#### 5b. Create New Product ⭐ NEW

```
User: 0
Bot: Enter the product name:
     
     Example: LECHE ENTERA 1L

User: LECHE CHOCOLATADA PREMIUM 500ML
Bot: Creating new product: "LECHE CHOCOLATADA PREMIUM 500ML"
     
     Enter the unit cost (price per unit):
     Example: 2500.50

User: 3500
Bot: Enter the unit weight in kilograms:
     Example: 0.5

User: 0.55
Bot: Enter the VAT percentage:
     Example: 19

User: 5
Bot: ✅ Product created successfully!
     
     Name: LECHE CHOCOLATADA PREMIUM 500ML
     
     Now continuing with donation...
     
     How many units would you like to donate?
     (Enter a number)

User: 30
Bot: Quantity: 30 units
     
     What is the expiration date?
     Format: YYYY-MM-DD

User: 2025-12-25
Bot: ✅ Product added to donation:
     
     LECHE CHOCOLATADA PREMIUM 500ML
     Quantity: 30 units
     Weight: 16.50 kg
     Expiration: 2025-12-25
     
     Total products in donation: 1
     
     Type "add" to add another product.
     Type "done" to review and confirm donation.
```

#### 6. Add More Products or Finish

```
User: add
Bot: What product would you like to add?
     [Search process repeats]

OR

User: done
Bot: === REVIEW YOUR DONATION ===
     
     Donor: Main Company
     Donation Point: Distribution Center North
     
     --- PRODUCTS ---
     1. LECHE ENTERA 1L
        Quantity: 50 units
        Weight: 52.50 kg
        Cost: $225,000.00
        Expiration: 2025-12-31
     
     2. LECHE CHOCOLATADA PREMIUM 500ML
        Quantity: 30 units
        Weight: 16.50 kg
        Cost: $105,000.00
        Expiration: 2025-12-25
     
     --- TOTALS ---
     Total Products: 2
     Total Weight: 69.00 kg
     Total Cost: $330,000.00
     
     Type "confirm" to create this donation.
     Type "cancel" to cancel.
```

#### 7. Confirm Donation

```
User: confirm
Bot: ✅ Donation created successfully!
     
     Total Products: 2
     Total Weight: 69.00 kg
     
     Type "menu" to make another donation or see options.
```

### Available Commands Reference

| Action | English Command | Spanish Command |
|--------|----------------|-----------------|
| Start login | `login` | `iniciar` |
| Show menu | `menu` | `menu` |
| Logout | `logout` | `salir` |
| Confirm | `ok` | `ok` |
| Edit product | `edit` | `editar` |
| Skip field | `skip` | `saltar` |
| Add product | `add` | `agregar` |
| Finish adding | `done` | `listo` |
| Confirm donation | `confirm` | `confirmar` |
| Cancel donation | `cancel` | `cancelar` |
| Create new product | `0` | `0` |

---

## 🏗 Architecture

### System Overview

```
┌─────────────────┐
│  WhatsApp User  │
│   (Food Donor)  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│      Twilio WhatsApp API            │
│   POST /whatsapp webhook            │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│   Azure App Service                 │
│   ┌─────────────────────────────┐   │
│   │  Express.js Application     │   │
│   │  - server.js (main logic)   │   │
│   │  - languages.js (i18n)      │   │
│   └─────────────────────────────┘   │
└───┬──────────────────────┬──────────┘
    │                      │
    ↓                      ↓
┌──────────────┐    ┌─────────────────────┐
│ Azure Redis  │    │  EatCloud APIs      │
│              │    │                     │
│ - Sessions   │    │ - Authentication    │
│ - Timeouts   │    │ - User Management   │
│ - 60min TTL  │    │ - Product Search    │
└──────────────┘    │ - Product Creation  │
                    │ - Donation Submit   │
                    └─────────────────────┘
```

### State Machine

The bot uses a state machine to manage conversation flow:

```
IDLE → AWAIT_EMAIL → AWAIT_PASSWORD → AUTHENTICATED_AT_MENU
                                              ↓
                                       SELECT_DONOR (if multiple)
                                              ↓
                                       PRODUCT_SEARCH
                                              ↓
                                       PRODUCT_SELECT or CREATE_PRODUCT
                                              ↓
                                       DONATION_QUANTITY
                                              ↓
                                       EXPIRATION_DATE
                                              ↓
                                       ADD_MORE (loop back or continue)
                                              ↓
                                       CONFIRM_DONATION
                                              ↓
                                       AUTHENTICATED (complete)
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 18 | Application execution |
| **Framework** | Express.js | Web server |
| **Messaging** | Twilio WhatsApp API | WhatsApp integration |
| **Session Store** | Azure Redis Cache | User sessions |
| **Cloud Platform** | Microsoft Azure | Hosting |
| **Containerization** | Docker | Deployment packaging |

### API Integrations

**EatCloud APIs:**
1. `POST /auth/login` - User authentication
2. `GET /api/users` - User details
3. `GET /api/decrypt/cua_users` - Donor information
4. `GET /api/decrypt/multiple_cua_users` - Multiple donors
5. `GET /api/pods` - Donation points
6. `GET /api/cua_users` - User permissions
7. `GET /api/odds` - Product search
8. `POST /crd/create/odds` - Create new product ⭐ NEW
9. `POST /perduecreatedonation/{cua_master}/{cua_user}/perdue` - Create donation

### Security Features

✅ **HTTPS Encryption**: All communications encrypted  
✅ **Password Security**: Not stored, deleted after use  
✅ **JWT Authentication**: Token-based API access  
✅ **Session Expiration**: Auto-logout after 60 minutes  
✅ **Input Validation**: Email, dates, numbers validated  
✅ **Environment Variables**: Secrets in .env file  
✅ **Redis AUTH**: Optional password protection  

---

## 📊 Monitoring & Maintenance

### Health Monitoring

**Health Check Endpoint:**
```bash
curl https://eatcloud-bot.azurewebsites.net/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "redis": "connected",
  "uptime": 86400,
  "timestamp": "2025-12-01T12:00:00.000Z",
  "environment": "production"
}
```

### View Application Logs

```bash
# Stream live logs
az webapp log tail \
  --name eatcloud-bot \
  --resource-group eatcloud-rg

# Download logs
az webapp log download \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --log-file logs.zip
```

### Monitor Redis

```bash
# Check Redis status
az redis show \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query provisioningState

# View Redis metrics
az monitor metrics list \
  --resource /subscriptions/.../providers/Microsoft.Cache/Redis/eatcloud-redis \
  --metric-names "connectedclients" "usedmemory"
```

### Performance Metrics

**Key Performance Indicators:**
- **Response Time**: < 2 seconds per message
- **Success Rate**: > 95% for donations
- **Uptime**: > 99.5%
- **Active Sessions**: Monitor via Redis
- **API Errors**: Track in logs

### Regular Maintenance Tasks

**Weekly:**
- [ ] Check application health endpoint
- [ ] Review error logs
- [ ] Monitor Redis memory usage
- [ ] Verify Twilio webhook is active

**Monthly:**
- [ ] Update Node.js dependencies
- [ ] Review and rotate API credentials
- [ ] Check Azure costs
- [ ] Backup configuration

**Quarterly:**
- [ ] Review user feedback
- [ ] Optimize search algorithm if needed
- [ ] Update documentation
- [ ] Security audit

---

## 🔧 Troubleshooting

### Issue 1: Redis Connection Timeout

**Symptoms:**
```
Redis Client Error: ConnectionTimeoutError
```

**Solutions:**

1. **Check Redis is running:**
   ```bash
   az redis show \
     --name eatcloud-redis \
     --resource-group eatcloud-rg \
     --query provisioningState
   # Should return: "Succeeded"
   ```

2. **Verify connection string:**
   ```bash
   # Get connection string
   az redis list-keys \
     --name eatcloud-redis \
     --resource-group eatcloud-rg
   
   # Update .env or Azure app settings
   ```

3. **Check firewall rules:**
   - Ensure Azure App Service can access Redis
   - Check Redis firewall settings in Azure Portal

4. **Restart Redis:**
   ```bash
   az redis force-reboot \
     --name eatcloud-redis \
     --resource-group eatcloud-rg \
     --reboot-type AllNodes
   ```

### Issue 2: Twilio Webhook Not Working

**Symptoms:**
- Messages sent but no response
- Webhook errors in Twilio console

**Solutions:**

1. **Verify webhook URL:**
   - Must be HTTPS (not HTTP)
   - Correct format: `https://eatcloud-bot.azurewebsites.net/whatsapp`
   - No trailing slash

2. **Check app is running:**
   ```bash
   curl https://eatcloud-bot.azurewebsites.net/health
   # Should return: {"status":"healthy"}
   ```

3. **Test webhook:**
   ```bash
   curl -X POST https://eatcloud-bot.azurewebsites.net/whatsapp \
     -d "Body=hello" \
     -d "From=whatsapp:+1234567890"
   ```

4. **Check Twilio logs:**
   - Go to Twilio Console → Monitor → Logs → Errors
   - Look for webhook failures and error messages

### Issue 3: Language Detection Issues

**Symptoms:**
- Spanish users get English responses
- Language doesn't match expected

**Solutions:**

1. **Use correct greeting:**
   - Spanish: `hola`, `buenos días`, `iniciar`
   - English: `hello`, `hi`, `login`

2. **Language persists per session:**
   - Language detected from first message only
   - User must logout and re-login to change language

3. **Check logs:**
   ```bash
   az webapp log tail --name eatcloud-bot --resource-group eatcloud-rg
   # Look for: "Lang: es" or "Lang: en"
   ```

### Issue 4: Product Creation Fails

**Symptoms:**
```
❌ Error creating product
```

**Solutions:**

1. **Verify API credentials:**
   ```bash
   az webapp config appsettings list \
     --name eatcloud-bot \
     --resource-group eatcloud-rg \
     --query "[?name=='EATCLOUD_BASE_URL' || name=='DONATION_USERNAME'].{Name:name, Value:value}"
   ```

2. **Check user permissions:**
   - User must have `canCreateProducts` permission
   - Verify in EatCloud admin panel

3. **Test API directly:**
   ```bash
   curl -X POST "$EATCLOUD_BASE_URL/crd/create/odds" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"data":[{"code":"TEST","name":"Test","odd_code":"TEST","odd_unit_cost":100,"odd_unit_weight_kg":1,"odd_vat_percentage":5,"code_cua_user":"CUA123"}]}'
   ```

### Issue 5: Donation Submission Fails

**Symptoms:**
```
❌ Error creating donation
```

**Solutions:**

1. **Check donation API credentials:**
   ```bash
   az webapp config appsettings list \
     --name eatcloud-bot \
     --resource-group eatcloud-rg \
     --query "[?name=='DONATION_BASE_URL' || name=='DONATION_USERNAME'].{Name:name, Value:value}"
   ```

2. **Verify data format:**
   - Date format: YYYY-MM-DD
   - Quantity: Positive integer
   - Cost/Weight: Valid numbers

3. **Check logs for error details:**
   ```bash
   az webapp log tail --name eatcloud-bot --resource-group eatcloud-rg | grep "Donation"
   ```

### Getting More Help

**Check Documentation:**
- Twilio WhatsApp API: https://www.twilio.com/docs/whatsapp
- Azure App Service: https://docs.microsoft.com/azure/app-service
- Azure Redis: https://docs.microsoft.com/azure/azure-cache-for-redis

**Contact Support:**
- Twilio Support: https://www.twilio.com/help/contact
---

## 📄 License

Copyright © 2025 EatCloud. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## ✅ Deployment Checklist

Use this checklist to ensure successful deployment:

- [ ] Node.js 18+ installed
- [ ] Azure CLI installed and logged in
- [ ] Repository cloned and dependencies installed
- [ ] `.env` file configured with all credentials
- [ ] Azure Redis Cache created and connection string obtained
- [ ] Twilio WhatsApp Business API approved (not sandbox)
- [ ] WhatsApp business profile configured
- [ ] Docker image built successfully
- [ ] Azure App Service created
- [ ] Environment variables configured in Azure
- [ ] Code deployed to Azure
- [ ] Health endpoint returns 200 OK
- [ ] Twilio webhook configured with Azure URL
- [ ] Test message sent successfully
- [ ] Confirmed donation creation works end-to-end
- [ ] Monitoring and logging enabled
- [ ] Support contacts documented
- [ ] User documentation provided to donors

---

**Version**: 2.0.0  
**Last Updated**: December 2025  
**Status**: Production Ready 🚀  
**Deployment Target**: Colombia  
**Expected Users**: 2,000+  

---