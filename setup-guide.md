# EatCloud WhatsApp Bot - Setup Guide

**Repository:** https://github.com/vigneshkvn2098/eatcloud-whatsapp-bot  

This guide provides step-by-step instructions for the EatCloud team to deploy the WhatsApp donation bot to production.

---

## ⚠️ CRITICAL: Code Modification Required

Before deploying, you **MUST** update the donation API endpoint in the code:

### Current Code (Purdue-specific):

In `server.js` around line 1103, you'll find:

```javascript
const donationUrl = `${donationBaseUrl}/perduecreatedonation/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}/perdue`;
```

### What You Need To Do:

**Replace** this line with your production donation API endpoint.

**Example format:**
```javascript
const donationUrl = `${donationBaseUrl}/your-actual-endpoint/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}`;
```

**How to modify:**

1. Open `server.js` in a text editor
2. Search for: `perduecreatedonation`
3. Replace the URL path with your actual production endpoint
4. Save the file
5. Commit and push changes to GitHub:
   ```bash
   git add server.js
   git commit -m "Update donation API endpoint for production"
   git push origin main
   ```

**⚠️ Without this change, donation submissions will fail in production!**

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] EatCloud API base URL and credentials
- [ ] EatCloud Donation API base URL, username, and password
- [ ] Twilio account with WhatsApp Business API approved
- [ ] Azure subscription with sufficient credits
- [ ] Azure CLI installed on your computer
- [ ] Git installed on your computer
- [ ] Node.js 18+ installed (for local testing only)

---

## 🚀 Setup Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/vigneshkvn2098/eatcloud-whatsapp-bot.git

# Navigate to the project directory
cd eatcloud-whatsapp-bot

# Verify you have all files
ls -la
# You should see: server.js, languages.js, package.json, Dockerfile, .env.example
```

---

### Step 2: Create Environment Configuration

```bash
# Create .env file from template
cp .env.example .env
```

Open `.env` file and fill in your credentials:

```env
# Server Configuration
PORT=8080
NODE_ENV=production

# EatCloud API Configuration
EATCLOUD_BASE_URL=<your_eatcloud_api_url>
DONATION_BASE_URL=<your_donation_api_url>
DONATION_USERNAME=<your_donation_username>
DONATION_PASSWORD=<your_donation_password>

# Redis Configuration (will be filled after Step 3)
REDIS_PRIVATE_URL=<will_be_filled_in_step_3>

# Session Configuration
SESSION_TTL_MINUTES=60
```

**⚠️ Important:** 
- Replace all `<your_...>` placeholders with actual values
- Never commit this `.env` file to Git
- Keep these credentials secure

---

### Step 3: Setup Azure Redis Cache

Redis is required for managing user sessions.

#### 3.1: Login to Azure

```bash
az login
```

This will open a browser window. Sign in with your Azure credentials.

#### 3.2: Create Resource Group

```bash
az group create \
  --name eatcloud-rg \
  --location eastus
```

**✅ Expected output:** `"provisioningState": "Succeeded"`

#### 3.3: Create Redis Cache

```bash
az redis create \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

**⏱️ This will take 5-10 minutes.** Wait for completion.

#### 3.4: Get Redis Connection String

```bash
# Get the primary key
az redis list-keys \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query primaryKey \
  --output tsv
```

**Copy the output** (it will look like a long random string).

#### 3.5: Update .env File

Construct your Redis connection string:

```
rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_PRIMARY_KEY
```

Replace `YOUR_PRIMARY_KEY` with the key from Step 3.4.

Update your `.env` file:

```env
REDIS_PRIVATE_URL=rediss://eatcloud-redis.redis.cache.windows.net:6380?password=YOUR_PRIMARY_KEY_HERE
```

**✅ Redis setup complete!**

---

### Step 4: Setup Twilio WhatsApp Business API

#### 4.1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up with EatCloud business email
3. Verify email and phone number
4. Complete business profile

#### 4.2: Request WhatsApp Business API Access

**⚠️ Important:** You need WhatsApp Business API, not the sandbox.

1. Login to [Twilio Console](https://console.twilio.com)
2. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Click **"Request Access"** for WhatsApp Business API
4. Fill out the business information:

5. Submit required documentation:
   - Business registration certificate
   - Tax ID / VAT number
   - Proof of business address
   - Business owner ID

6. Wait for approval (typically 1-3 business days)
7. Twilio will email you when approved

#### 4.3: Configure Business Profile (After Approval)

Once approved, set up your profile:

#### 4.4: Get WhatsApp Number

1. Go to **Messaging** → **WhatsApp** → **Senders**
2. Click **"Activate WhatsApp Sender"**
3. Twilio will provide a phone number (e.g., +1 415 123 4567)
4. **Save this number** - users will message this number to use the bot

**Note:** Webhook configuration will be done after deployment (Step 6.3)

**✅ Twilio setup complete!**

---

### Step 5: Build and Push Docker Image

#### 5.1: Build Docker Image

```bash
# Make sure you're in the project directory
cd eatcloud-whatsapp-bot

# Build the Docker image
docker build -t eatcloud-bot:latest .

# Verify the build
docker images | grep eatcloud-bot
```

**✅ Expected output:** You should see `eatcloud-bot` in the list

#### 5.2: Create Azure Container Registry

```bash
az acr create \
  --resource-group eatcloud-rg \
  --name eatcloudregistry \
  --sku Basic
```

#### 5.3: Login to Azure Container Registry

```bash
az acr login --name eatcloudregistry
```

**✅ Expected output:** `Login Succeeded`

#### 5.4: Tag and Push Image

```bash
# Tag the image for Azure
docker tag eatcloud-bot:latest eatcloudregistry.azurecr.io/eatcloud-bot:latest

# Push to Azure Container Registry
docker push eatcloudregistry.azurecr.io/eatcloud-bot:latest
```

**⏱️ This may take a few minutes depending on your internet speed.**

#### 5.5: Verify Push

```bash
az acr repository list --name eatcloudregistry --output table
```

**✅ Expected output:** You should see `eatcloud-bot` in the list

**✅ Docker image ready!**

---

### Step 6: Deploy to Azure App Service

#### 6.1: Create App Service Plan and Web App

```bash
# Create App Service plan
az appservice plan create \
  --name eatcloud-plan \
  --resource-group eatcloud-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group eatcloud-rg \
  --plan eatcloud-plan \
  --name eatcloud-bot \
  --runtime "NODE|18-lts"
```

**✅ Expected output:** JSON response with app details

#### 6.2: Configure Environment Variables

**⚠️ Critical Step:** Replace all placeholder values with your actual credentials.

```bash
az webapp config appsettings set \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    EATCLOUD_BASE_URL="<your_eatcloud_api_url>" \
    DONATION_BASE_URL="<your_donation_api_url>" \
    DONATION_USERNAME="<your_donation_username>" \
    DONATION_PASSWORD="<your_donation_password>" \
    REDIS_PRIVATE_URL="rediss://eatcloud-redis.redis.cache.windows.net:6380?password=<your_redis_key>" \
    SESSION_TTL_MINUTES=60
```

**Double-check all values before running this command!**

#### 6.3: Deploy from GitHub

```bash
az webapp deployment source config \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --repo-url https://github.com/vigneshkvn2098/eatcloud-whatsapp-bot \
  --branch main \
  --manual-integration
```

**⏱️ Deployment will take 2-5 minutes.**

#### 6.4: Verify Deployment

```bash
# Check if the app is running
curl https://eatcloud-bot.azurewebsites.net/health
```

**✅ Expected response:**
```json
{
  "status": "healthy",
  "redis": "connected",
  "uptime": 123,
  "environment": "production"
}
```

If you see this, your bot is running! 🎉

---

### Step 7: Configure Twilio Webhook

Now that your bot is deployed, connect it to Twilio:

#### 7.1: Get Your Bot URL

Your bot is accessible at: `https://eatcloud-bot.azurewebsites.net`

#### 7.2: Configure Webhook in Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **WhatsApp** → **Senders**
3. Click on your WhatsApp number
4. Scroll to **Webhook** section
5. Under **"When a message comes in"**:
   - URL: `https://eatcloud-bot.azurewebsites.net/whatsapp`
   - Method: **POST**
6. Leave **"Status Callback URL"** empty
7. Click **Save**

**✅ Webhook configured!**

---

### Step 8: Test the Bot

#### 8.1: Send Test Message

1. Open WhatsApp on your phone
2. Add your Twilio WhatsApp number to contacts
3. Send a message: `Hello` or `Hola`

#### 8.2: Expected Response

**English:**
```
Welcome to EatCloud! Type "login" to sign in.
```

**Spanish:**
```
¡Bienvenido a EatCloud! Escribe "iniciar" para ingresar.
```

#### 8.3: Test Full Flow

Try creating a complete donation:

1. Send: `login` (or `iniciar`)
2. Enter your EatCloud email
3. Enter your password
4. Search for a product: `leche`
5. Select a product or create new one (type `0`)
6. Enter quantity and expiration date
7. Review and confirm donation

**✅ If donation is created successfully, the bot is working correctly!**

---

## 📊 Post-Deployment

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

### Monitor Bot Health

Set up a monitoring script or service to check:

```bash
curl https://eatcloud-bot.azurewebsites.net/health
```

Run this every 5-10 minutes to ensure the bot is always running.

### Check Redis Status

```bash
az redis show \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query provisioningState
```

Should return: `"Succeeded"`

---

## 🔄 Updating the Bot

When you need to deploy updates:

### Option 1: Redeploy from GitHub

If code changes are pushed to GitHub:

```bash
az webapp deployment source sync \
  --name eatcloud-bot \
  --resource-group eatcloud-rg
```

### Option 2: Deploy New Docker Image

If you built a new Docker image:

```bash
# Build new image
docker build -t eatcloud-bot:latest .

# Tag and push
docker tag eatcloud-bot:latest eatcloudregistry.azurecr.io/eatcloud-bot:latest
docker push eatcloudregistry.azurecr.io/eatcloud-bot:latest

# Restart app to pull new image
az webapp restart \
  --name eatcloud-bot \
  --resource-group eatcloud-rg
```

### Option 3: Deploy ZIP File

```bash
# Create deployment package
zip -r app.zip . -x "*.git*" "node_modules/*" ".env"

# Deploy
az webapp deployment source config-zip \
  --resource-group eatcloud-rg \
  --name eatcloud-bot \
  --src app.zip
```

---

## 🛠 Troubleshooting

### Bot Not Responding

**Check 1: Is the app running?**
```bash
curl https://eatcloud-bot.azurewebsites.net/health
```

**Check 2: View logs**
```bash
az webapp log tail --name eatcloud-bot --resource-group eatcloud-rg
```

**Check 3: Verify Twilio webhook**
- Go to Twilio Console → Messaging → WhatsApp → Senders
- Verify webhook URL is correct: `https://eatcloud-bot.azurewebsites.net/whatsapp`
- Method should be POST

### Redis Connection Error

**Check Redis is running:**
```bash
az redis show \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --query provisioningState
```

**Verify connection string:**
```bash
az webapp config appsettings list \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --query "[?name=='REDIS_PRIVATE_URL'].{Name:name, Value:value}"
```

**Restart Redis if needed:**
```bash
az redis force-reboot \
  --name eatcloud-redis \
  --resource-group eatcloud-rg \
  --reboot-type AllNodes
```

### Product Creation Fails

**Check API credentials:**
```bash
az webapp config appsettings list \
  --name eatcloud-bot \
  --resource-group eatcloud-rg \
  --query "[?name=='EATCLOUD_BASE_URL' || name=='DONATION_USERNAME'].{Name:name, Value:value}"
```

Verify these match your EatCloud API credentials.

### Language Detection Issues

Users must use correct greetings:
- **Spanish:** `hola`, `iniciar`, `buenos días`
- **English:** `hello`, `hi`, `login`

Language is set from the first message and persists throughout the session.

---

### Key Commands

```bash
# Check bot health
curl https://eatcloud-bot.azurewebsites.net/health

# View logs
az webapp log tail --name eatcloud-bot --resource-group eatcloud-rg

# Restart bot
az webapp restart --name eatcloud-bot --resource-group eatcloud-rg

# Check Redis
az redis show --name eatcloud-redis --resource-group eatcloud-rg --query provisioningState
```

---

## ✅ Setup Completion Checklist

Use this checklist to verify everything is set up correctly:

- [ ] **Code modified:** Donation API endpoint updated in `server.js` (removed Purdue-specific URL)
- [ ] Repository cloned successfully
- [ ] `.env` file created with all credentials
- [ ] Azure Redis Cache created and connection string obtained
- [ ] Twilio WhatsApp Business API approved (not sandbox)
- [ ] Twilio business profile configured
- [ ] WhatsApp phone number activated
- [ ] Docker image built and pushed to Azure Container Registry
- [ ] Azure App Service created
- [ ] Environment variables configured in Azure
- [ ] Code deployed from GitHub
- [ ] Bot health check returns `{"status":"healthy","redis":"connected"}`
- [ ] Twilio webhook configured correctly
- [ ] Test message sent and bot responded
- [ ] Full donation flow tested successfully
- [ ] Monitoring set up
- [ ] Team trained on bot usage

---

**Setup Complete! 🎉**

The EatCloud WhatsApp Bot is now live and ready to handle food donations in Columbia.