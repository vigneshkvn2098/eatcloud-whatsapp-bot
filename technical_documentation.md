# EatCloud WhatsApp Bot - Technical Documentation

**For:** EatCloud Technical Team  
**Purpose:** Code walkthrough and modification guide  
**Repository:** https://github.com/vigneshkvn2098/eatcloud-whatsapp-bot  
**Version:** 2.0.0

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Code Structure](#code-structure)
3. [How the Bot Works](#how-the-bot-works)
4. [Key Code Sections](#key-code-sections)
5. [Common Modifications](#common-modifications)
6. [Adding New Features](#adding-new-features)
7. [Testing Your Changes](#testing-your-changes)
8. [Deployment After Changes](#deployment-after-changes)

---

## 🎯 Project Overview

### Technology Stack

```
┌─────────────────────────────────────┐
│  WhatsApp (User Interface)          │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Twilio API (Message Gateway)       │
└─────────────┬───────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Express.js Server                  │
│  ├─ server.js (Main Logic)          │
│  └─ languages.js (Translations)     │
└─────────────┬───────────────────────┘
              │
         ┌────┴────┐
         ↓         ↓
    ┌────────┐  ┌──────────────┐
    │ Redis  │  │ EatCloud APIs│
    └────────┘  └──────────────┘
```

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.18+ | Web server framework |
| `twilio` | 4.x | WhatsApp message handling |
| `redis` | 4.x | Session management |
| `axios` | 1.x | HTTP requests to EatCloud APIs |
| `dotenv` | 16.x | Environment configuration |

---

## 📁 Code Structure

```
eatcloud-whatsapp-bot/
│
├── server.js              # Main application logic (1,254 lines)
│   ├── Express server setup
│   ├── Redis connection
│   ├── State machine (conversation flow)
│   ├── EatCloud API integrations
│   └── Message handlers
│
├── languages.js           # Bilingual system (665 lines)
│   ├── Language detection
│   ├── Message translations (EN/ES)
│   └── Command matching
│
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variable template
├── Dockerfile             # Docker container configuration
└── README.md              # Documentation
```

---

## 🔄 How the Bot Works

### 1. Message Flow

```
User sends WhatsApp message
         ↓
Twilio receives message
         ↓
Twilio POST to /whatsapp endpoint
         ↓
Express server receives request
         ↓
Load user session from Redis
         ↓
Determine current conversation step
         ↓
Process message based on step
         ↓
Call EatCloud APIs if needed
         ↓
Update session in Redis
         ↓
Send response via Twilio
         ↓
User receives WhatsApp message
```

### 2. State Machine

The bot uses a **state machine** to track where each user is in the conversation:

```javascript
// Session structure in Redis
{
  lang: 'es',                    // Language: 'en' or 'es'
  step: 'donation_quantity',     // Current conversation step
  email: 'user@example.com',     // User's email
  token: 'jwt_token',            // Authentication token
  userDetails: {...},            // User info from EatCloud
  selectedProduct: {...},        // Currently selected product
  donationItems: [...]           // Products in current donation
}
```

### 3. Conversation Steps

| Step | What Happens | User Input Expected |
|------|--------------|---------------------|
| `idle` | Initial state | "login" or "iniciar" |
| `await_email` | Collecting email | Email address |
| `await_password` | Collecting password | Password |
| `authenticated_at_menu` | Main menu | "1" (donate) or "2" (logout) |
| `select_donor` | Choose donor | Number (1-N) |
| `donation_product_search` | Search products | Product name |
| `donation_product_select` | Select product | Number (1-10) or "0" |
| `create_product_name` | New product name | Product name |
| `create_product_cost` | New product cost | Number |
| `create_product_weight` | New product weight | Number (kg) |
| `create_product_vat` | New product VAT | Number (0-100) |
| `donation_quantity` | Enter quantity | Positive integer |
| `donation_expiration_date` | Enter expiry | YYYY-MM-DD |
| `donation_add_more` | Add more? | "add" or "done" |
| `donation_confirm` | Confirm donation | "confirm" or "cancel" |

---

## 🔑 Key Code Sections

### 1. Server Setup (server.js, lines 1-44)

```javascript
// Import dependencies (lines 2-8)
const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const twilio = require('twilio');
const axios = require('axios');
const crypto = require('crypto');

// Initialize Express (lines 10-12)
const app = express();
const PORT = process.env.PORT || 3000;

// Redis connection (lines 14-30)
const redisClient = redis.createClient({
  url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL
});

// Session TTL configuration (line 43)
const ttlSeconds = (parseInt(process.env.SESSION_TTL_MINUTES || '30', 10)) * 60;

// Connect to Redis (lines 33-38)
await redisClient.connect();
```

**Key Environment Variables:**
- `PORT` - Server port (default: 3000)
- `REDIS_PRIVATE_URL` - Redis connection string
- `EATCLOUD_BASE_URL` - EatCloud API base URL
- `DONATION_BASE_URL` - Donation API base URL
- `SESSION_TTL_MINUTES` - Session timeout (default: 30 minutes)

---

### 2. Session Management (server.js, lines 45-75)

```javascript
// Get session from Redis (lines 45-53)
async function getSession(wa) {
  const key = `session:whatsapp:${wa}`;
  const raw = await redisClient.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// Save session to Redis (lines 56-66)
async function setSession(wa, patch) {
  const key = `session:whatsapp:${wa}`;
  const existing = await getSession(wa);
  const updated = { ...(existing || {}), ...patch };
  
  // Set with TTL (defined on line 43)
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(updated));
  return updated;
}

// Clear session (lines 69-75)
async function clearSession(wa) {
  await redisClient.del(`session:whatsapp:${wa}`);
  await redisClient.del(`cooloff:whatsapp:${wa}`);
}
```

**How Sessions Work:**
- Each WhatsApp number gets a unique session stored in Redis
- Sessions expire after 30-60 minutes (configurable via `SESSION_TTL_MINUTES`)
- Every interaction refreshes the TTL
- Sessions store: language, step, auth token, user data, donation items

---

### 3. Language Detection (languages.js, lines 596-665)

```javascript
// Detect language from user's first message (line 596)
function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  
  // Check for specific login commands first (lines 600-603)
  if (lower === 'iniciar' || lower === 'inicio') return 'es';
  if (lower === 'login' || lower === 'start') return 'en';
  
  // Check for Spanish trigger words (lines 616-626)
  const spanishWords = [
    'hola', 'buenos', 'buenas', 'días', 'tardes', 'noches',
    'gracias', 'por favor', 'disculpa', 'perdón', 'lo siento',
    'ayuda', 'necesito', 'quiero', 'quisiera', 'puedo',
    'donar', 'donación', 'alimento', 'comida', 'producto',
    // ... more words
  ];
  
  for (const word of spanishWords) {
    if (lower.includes(word)) {
      return 'es';
    }
  }
  
  return 'en'; // Default to English
}

// Get messages in user's language (lines 650-652)
function getMessages(lang) {
  return languages[lang] || languages.en;
}
```

**How to Add More Spanish Words:**
Edit `languages.js`, line 616, and add to the `spanishWords` array.

---

### 4. Message Handler (server.js, lines 472-1200)

```javascript
// Main webhook endpoint (line 472)
app.post('/whatsapp', async (req, res) => {
  const from = req.body.From;        // WhatsApp number
  const body = req.body.Body;        // Message text
  
  // Load session (lines 476-477)
  let s = await getSession(from);
  
  // Detect language if new user (lines 480-486)
  if (!s) {
    const lang = detectLanguage(body);
    s = await setSession(from, { lang, step: 'idle' });
  }
  
  const lang = s.lang || 'en';
  const msg = getMessages(lang);
  
  // State machine - handle based on current step
  // Each step checks: if (s.step === 'step_name')
  
  // Examples:
  // Line 555: if (s.step === 'idle')
  // Line 570: if (s.step === 'await_email')
  // Line 593: if (s.step === 'await_password')
  // Line 794: if (s.step === 'donation_product_select')
  // ... more steps
  
  // Send response (lines 1240-1245)
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(responseMessage);
  res.type('text/xml').send(twiml.toString());
});
```

**Flow:**
1. Receive message from Twilio
2. Load user's session
3. Detect language (first time only)
4. Get appropriate message translations
5. Process based on current step
6. Update session
7. Send response

---

### 5. EatCloud API Integration (server.js, lines 208-450)

```javascript
// Search products (line 208)
async function searchProductsForUser(token, codeCuaUser, searchTerm) {
  // Makes GET request to /api/odds (line 220-231)
  const productsResp = await axios.get(
    `${process.env.EATCLOUD_BASE_URL}/api/odds`,
    {
      params: {
        code_cua_user: codeCuaUser,
        name: `_lk${searchTerm}_lk`,  // Fuzzy search
        _limit: 20
      },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  // Ranks and returns top 10 matches (lines 241-253)
  const rankedMatches = apiResults
    .map(p => ({
      ...p,
      score: calculateMatchScore(p.name, searchTerm)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return { success: true, matches: rankedMatches };
}

// Create product (line 426)
async function createProduct(token, codeCuaUser, productData) {
  const response = await axios.post(
    `${process.env.EATCLOUD_BASE_URL}/crd/create/odds`,
    { data: [productData] },  // ⚠️ Must wrap in array!
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data;
}

// Create donation (lines 1103-1130)
// ⚠️ CRITICAL: Line 1103 contains Purdue-specific URL
const donationUrl = `${donationBaseUrl}/perduecreatedonation/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}/perdue`;

const response = await axios.post(
  donationUrl,
  donationData,
  {
    headers: { Authorization: `Bearer ${token}` },
    auth: {
      username: process.env.DONATION_USERNAME,
      password: process.env.DONATION_PASSWORD
    }
  }
);
```

**Important Notes:**
- All API calls use JWT token from login
- Donation API requires basic auth (username/password)
- Product creation requires data wrapped in array: `{ data: [productData] }`
- **Line 1103 MUST be updated for production** (remove Purdue-specific path)

---

### 6. Product Code Generation (server.js, lines 107-163)

```javascript
function generateProductCode(productName, codeCuaUser) {
  // Sanitize name (lines 109-112)
  let sanitized = productName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '_');
  
  // Look for quantity pattern (line 115)
  // Matches: "500ML", "1L", "X12", "2KG", etc.
  const qtyMatch = sanitized.match(/(\d+\s*(ML|L|KG|G|GR|X|UNIDADES?))/);
  
  if (qtyMatch) {
    // Keep quantity at end, truncate prefix (lines 117-134)
    const quantity = qtyMatch[0];
    const prefix = sanitized.substring(0, sanitized.indexOf(quantity));
    const maxPrefixLen = 25 - quantity.length - 1;
    const truncatedPrefix = prefix.substring(0, maxPrefixLen);
    sanitized = truncatedPrefix + '_' + quantity;
  } else {
    // Just truncate to 25 chars (line 136)
    sanitized = sanitized.substring(0, 25);
  }
  
  // Generate 8-char hash from full original name (lines 139-143)
  const hash = crypto.createHash('md5')
    .update(productName)
    .digest('hex')
    .substring(0, 8);
  
  // Build codes (lines 145-146)
  const odd_code = `${sanitized}_${hash}`;
  const code = `${codeCuaUser}_${odd_code}`;
  
  return { odd_code, code };
}
```

**Examples:**
- `"LECHE ENTERA 1L"` → `LECHE_ENTERA_1L_a1b2c3d4`
- `"YOGURT NATURAL 500ML"` → `YOGURT_NATURAL_500ML_e5f6g7h8`
- `"CREMA DE LECHE 200G"` → `CREMA_DE_LECHE_200G_f8a3b1c2`

---

## 🛠 Common Modifications

### 1. Change Session Timeout

**File:** `.env`  
**Line:** `SESSION_TTL_MINUTES=60`

```env
# Change from 60 to 120 minutes
SESSION_TTL_MINUTES=120
```

**Redeploy:** Required

---

### 2. Update Donation API Endpoint ⚠️ CRITICAL

**File:** `server.js`  
**Line:** 1103

**Current (Purdue-specific):**
```javascript
const donationUrl = `${donationBaseUrl}/perduecreatedonation/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}/perdue`;
```

**Change to your production endpoint:**
```javascript
const donationUrl = `${donationBaseUrl}/createdonation/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}`;
```

**Steps:**
1. Open `server.js`
2. Go to line 1103
3. Replace the URL path with your actual endpoint
4. Save file
5. Commit and push:
   ```bash
   git add server.js
   git commit -m "Update donation API endpoint for production"
   git push origin main
   ```
6. Redeploy

---

### 3. Add More Search Results

**File:** `server.js`  
**Line:** 253

**Current (returns 10 results):**
```javascript
const rankedMatches = apiResults
  .map(p => ({
    ...p,
    score: calculateMatchScore(p.name, searchTerm)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);  // Returns top 10
```

**To return 15 results:**
```javascript
.slice(0, 15)  // Changed from 10 to 15
```

**Full change:**
1. Open `server.js`
2. Go to line 253
3. Change `.slice(0, 10)` to `.slice(0, 15)`
4. Save and redeploy

---

### 4. Add New Message/Translation

**File:** `languages.js`

**Example: Add "Search again" prompt**

```javascript
// English section (lines 4-320)
en: {
  // ... existing messages
  searchAgainPrompt: "Type a new search term to search again.",
}

// Spanish section (lines 322-640)
es: {
  // ... existing messages
  searchAgainPrompt: "Escribe un nuevo término para buscar de nuevo.",
}
```

**Use in server.js:**
```javascript
return reply(msg.searchAgainPrompt);
```

**Steps:**
1. Open `languages.js`
2. Add message to English section (around line 300)
3. Add same message to Spanish section (around line 620)
4. Use in `server.js` with `msg.yourMessageName`

---

### 5. Change Product Search Algorithm

**File:** `server.js`  
**Line:** 208-260

**Current fuzzy search:**
```javascript
async function searchProductsForUser(token, codeCuaUser, searchTerm) {
  // Line 225: Fuzzy search with _lk prefix/suffix
  const productsResp = await axios.get(
    `${process.env.EATCLOUD_BASE_URL}/api/odds`,
    {
      params: {
        code_cua_user: codeCuaUser,
        name: `_lk${searchTerm}_lk`,  // Fuzzy search
        _limit: 20
      },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  // Lines 241-253: Ranking and slicing
  const rankedMatches = apiResults
    .map(p => ({ ...p, score: calculateMatchScore(p.name, searchTerm) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return { success: true, matches: rankedMatches };
}
```

**For exact search only:**
```javascript
// Line 225: Remove _lk for exact match
name: searchTerm  // Instead of `_lk${searchTerm}_lk`
```

---

### 6. Disable Product Creation Feature

**To disable the option to create new products:**

**File:** `server.js`

**Line 797 (when search returns results):**
```javascript
// Current: User can type "0" to create product
if (body === '0') {
  await setSession(from, { step: 'create_product_name' });
  return reply(msg.createProductNamePrompt);
}

// To disable: Comment out or remove these lines
```

**Line 813 (when search returns 0 results):**
```javascript
// Current: Shows option to create product
await setSession(from, { 
  step: 'donation_product_not_found',
  searchedProductName: body.trim()
});
return reply(msg.productsNotFound(body));

// To disable: Just ask to search again
if (result.matches.length === 0) {
  return reply(msg.productSearchMinLength);
}
```

**File:** `languages.js`  
**Lines 100-110 (EN) and 410-420 (ES):**  
Update `productsFound` message to remove "type 0" instruction.

---

## 🆕 Adding New Features

### Example: Add "Help" Command

#### Step 1: Add Message Translations

**File:** `languages.js`

```javascript
// English
en: {
  helpMenu: [
    '📋 HELP MENU',
    '',
    'Available commands:',
    '• login - Start login process',
    '• menu - Show main menu',
    '• logout - Sign out',
    '• help - Show this menu',
    '',
    'Need assistance? Contact: support@eatcloud.com'
  ].join('\n'),
}

// Spanish
es: {
  helpMenu: [
    '📋 MENÚ DE AYUDA',
    '',
    'Comandos disponibles:',
    '• iniciar - Comenzar proceso de inicio de sesión',
    '• menu - Mostrar menú principal',
    '• salir - Cerrar sesión',
    '• ayuda - Mostrar este menú',
    '',
    '¿Necesita asistencia? Contacto: support@eatcloud.com'
  ].join('\n'),
}
```

#### Step 2: Add Command Handler

**File:** `server.js`

```javascript
// Add after other command checks (line ~250)
if (matchesCommand(body, 'help', lang) || matchesCommand(body, 'ayuda', lang)) {
  return reply(msg.helpMenu);
}
```
---

### Example: Add Product Category Filter

#### Step 1: Modify Search Function

**File:** `server.js`

```javascript
async function searchProductsForUser(token, codeCuaUser, searchTerm, category = null) {
  const params = {
    code_cua_user: codeCuaUser,
    name: `_lk${searchTerm}_lk`
  };
  
  // Add category filter if provided
  if (category) {
    params.category = category;
  }
  
  const response = await axios.get(
    `${EATCLOUD_BASE_URL}/api/odds`,
    { headers: { Authorization: `Bearer ${token}` }, params }
  );
  
  return {
    success: true,
    matches: response.data.slice(0, 10)
  };
}
```

#### Step 2: Add Category Selection Step

**Add new conversation step before product search:**

```javascript
// At authenticated_at_menu
if (body === '1') {
  await setSession(from, { step: 'select_category' });
  return reply(msg.categoryPrompt);
}

// New step handler
if (s.step === 'select_category') {
  const categories = ['Dairy', 'Meat', 'Vegetables', 'All'];
  const selection = parseInt(body);
  
  if (selection >= 1 && selection <= categories.length) {
    const category = categories[selection - 1];
    await setSession(from, { 
      step: 'donation_product_search',
      selectedCategory: category === 'All' ? null : category
    });
    return reply(msg.productSearchPrompt);
  }
}
```

#### Step 3: Add Messages

**File:** `languages.js`

```javascript
en: {
  categoryPrompt: [
    'Select product category:',
    '1. Dairy',
    '2. Meat', 
    '3. Vegetables',
    '4. All products'
  ].join('\n'),
}
```

---

### Testing Checklist

- [ ] Login flow works
- [ ] Language detection works (test "hola" and "hello")
- [ ] Product search returns results
- [ ] Product creation works
- [ ] Donation submission succeeds
- [ ] Error messages display correctly
- [ ] Session persists across messages
- [ ] Logout clears session

---

## 🔍 Debugging Tips

### Add Console Logs

```javascript
// In server.js, add debug logs
console.log('=== DEBUG ===');
console.log('Step:', s.step);
console.log('Message:', body);
console.log('Session:', JSON.stringify(s, null, 2));
console.log('=============');
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot not responding | Webhook misconfigured | Check Twilio webhook URL |
| Session lost | Redis connection issue | Check REDIS_PRIVATE_URL |
| API errors | Wrong credentials | Check EATCLOUD_BASE_URL |
| Language wrong | Detection failed | Check Spanish words list |

---

## 📝 Quick Reference

### Important Files

| File | Lines | Purpose |
|------|-------|---------|
| `server.js` | 1254 | Main application logic |
| `languages.js` | 665 | Translations and language detection |
| `package.json` | ~50 | Dependencies |
| `.env` | ~15 | Configuration |

### Key Functions in server.js

| Function | Line | Purpose |
|----------|------|---------|
| `getSession()` | 45 | Load user session from Redis |
| `setSession()` | 56 | Save user session to Redis |
| `clearSession()` | 69 | Clear user session |
| `generateProductCode()` | 107 | Generate product codes |
| `searchProductsForUser()` | 208 | Search products with fuzzy matching |
| `createProduct()` | 426 | Create new product via API |
| Main webhook handler | 472 | Process incoming WhatsApp messages |
| Donation creation | 1103 | Submit donation to EatCloud API |

### Environment Variables

```env
PORT=8080
NODE_ENV=production
EATCLOUD_BASE_URL=<api_url>
DONATION_BASE_URL=<donation_url>
DONATION_USERNAME=<username>
DONATION_PASSWORD=<password>
REDIS_PRIVATE_URL=<redis_connection>
SESSION_TTL_MINUTES=60
```

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**For:** EatCloud Technical Team