require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { MessagingResponse } = require('twilio').twiml;
const redis = require('redis');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

/* -------------------- Redis Client -------------------- */
// Support both Railway's REDIS_URL and docker-compose REDIS_HOST/PORT
let redisConfig;
if (process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL) {
  // Railway/Render format (connection string)
  redisConfig = {
    url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL
  };
} else {
  // Docker-compose format (host/port)
  redisConfig = {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    }
  };
  
  // Add password if provided (Railway Redis requires auth)
  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }
}

const redisClient = redis.createClient(redisConfig);

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

/* -------------------- Session Management with Redis -------------------- */
const ttlSeconds = (parseInt(process.env.SESSION_TTL_MINUTES || '30', 10)) * 60;

async function getSession(wa) {
  try {
    const data = await redisClient.get(`session:${wa}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('Error getting session:', err);
    return null;
  }
}

async function setSession(wa, patch) {
  try {
    const prev = await getSession(wa) || {};
    const next = { ...prev, ...patch };
    await redisClient.setEx(`session:${wa}`, ttlSeconds, JSON.stringify(next));
    return next;
  } catch (err) {
    console.error('Error setting session:', err);
    return patch;
  }
}

async function clearSession(wa) {
  try {
    await redisClient.del(`session:${wa}`);
  } catch (err) {
    console.error('Error clearing session:', err);
  }
}

/* -------------------- Cooloff with Redis -------------------- */
async function setCooloff(wa, ms = 3000) {
  try {
    await redisClient.setEx(`cooloff:${wa}`, Math.ceil(ms / 1000), 'true');
  } catch (err) {
    console.error('Error setting cooloff:', err);
  }
}

async function inCooloff(wa) {
  try {
    const exists = await redisClient.exists(`cooloff:${wa}`);
    return exists === 1;
  } catch (err) {
    console.error('Error checking cooloff:', err);
    return false;
  }
}

/* -------------------- Helpers -------------------- */
function maskEmail(e) {
  if (!e || !e.includes('@')) return '***';
  const [u, d] = e.split('@');
  const mu = u.length > 2 ? `${u[0]}*****${u[u.length - 1]}` : `${u[0]}*`;
  return `${mu}@${d}`;
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function welcomeText() {
  return 'Welcome to EatCloud! Type "login" to sign in.';
}

function calculateMatchScore(productName, searchTerm) {
  const name = productName.toLowerCase();
  const term = searchTerm.toLowerCase();
  
  if (name === term) return 100;
  if (name.startsWith(term)) return 90;
  if (name.includes(' ' + term + ' ') || name.startsWith(term + ' ') || name.endsWith(' ' + term)) {
    return 80;
  }
  if (name.includes(term)) return 70;
  
  const nameWords = name.split(/\s+/);
  const termWords = term.split(/\s+/);
  let matchingWords = 0;
  
  termWords.forEach(termWord => {
    if (nameWords.some(nameWord => nameWord.includes(termWord))) {
      matchingWords++;
    }
  });
  
  return (matchingWords / termWords.length) * 60;
}

/* -------------------- Formatting Helpers -------------------- */
function formatDonorList(donors) {
  return donors.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
}

function getMainMenuText() {
  return [
    '=== MAIN MENU ===',
    '',
    '1. Make a Donation',
    '2. Logout',
    '',
    'Reply with 1 or 2'
  ].join('\n');
}

function getProductSearchPrompt() {
  return [
    'What product would you like to donate?',
    '',
    'Tip: Type part of the product name (e.g., "crema", "yogurt")'
  ].join('\n');
}

function shouldShowProductReview(permissions) {
  return permissions.canEditCost || permissions.canEditWeight || permissions.canEditTax;
}

function getProductReviewMessage(product, permissions) {
  let message = [
    `Selected: ${product.name}`,
    '',
    '📦 Product Details:'
  ];
  
  if (permissions.canEditCost) {
    message.push(`• Cost per unit: $${product.unit_cost}`);
  }
  if (permissions.canEditWeight) {
    message.push(`• Weight per unit: ${product.unit_weight_kg} kg`);
  }
  if (permissions.canEditTax) {
    message.push(`• VAT: ${product.vat_percentage}%`);
  }
  
  message.push('');
  
  if (shouldShowProductReview(permissions)) {
    message.push('Type "edit" to modify these values.');
    message.push('Type "ok" to use these values.');
  } else {
    message.push('Type "ok" to continue.');
  }
  
  return message.join('\n');
}

/* -------------------- EatCloud API Functions -------------------- */

async function searchProductsForUser(token, codeCuaUser, searchTerm) {
  const originalTerm = searchTerm;
  let currentTerm = searchTerm;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      console.log(`Search attempt ${attempts}: "${currentTerm}"`);
      
      const productsResp = await axios.get(
        `${process.env.EATCLOUD_BASE_URL}/api/odds`,
        {
          params: {
            code_cua_user: codeCuaUser,
            name: `_lk${currentTerm}_lk`,
            _limit: 20
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }
      );
      
      if (!productsResp.data.ok) {
        return { success: false, matches: [], searchedTerm: originalTerm };
      }
      
      const apiResults = productsResp.data.data || [];
      console.log(`API returned ${apiResults.length} products for "${currentTerm}"`);
      
      if (apiResults.length > 0) {
        const rankedMatches = apiResults
          .map(p => ({
            id: p.id,
            code: p.code,
            odd_code: p.odd_code,
            name: p.name,
            unit_cost: p.odd_unit_cost,
            unit_weight_kg: p.odd_unit_weight_kg,
            vat_percentage: p.odd_vat_percentage,
            score: calculateMatchScore(p.name.toLowerCase(), originalTerm.toLowerCase())
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        return { success: true, matches: rankedMatches, searchedTerm: currentTerm };
      }
      
      if (currentTerm.length > 3) {
        currentTerm = currentTerm.slice(0, -1);
        console.log(`No results found, trying shorter term: "${currentTerm}"`);
      } else {
        console.log(`No results found for "${originalTerm}" (tried down to "${currentTerm}")`);
        return { success: true, matches: [], searchedTerm: originalTerm };
      }
      
    } catch (err) {
      console.error('Product search error:', err.message);
      return { success: false, matches: [], searchedTerm: originalTerm };
    }
  }
  
  return { success: true, matches: [], searchedTerm: originalTerm };
}

async function fetchUserDetails(email, token) {
  try {
    console.log('Fetching user details for:', email);
    
    const userResp = await axios.get(
      `${process.env.EATCLOUD_BASE_URL}/api/users`,
      {
        params: { email, _scmp: 'code_cua_user,code_pod' },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    if (!userResp.data.ok || userResp.data.count === 0) {
      throw new Error('User not found in system');
    }

    const userData = userResp.data.data[0];
    const codeCuaUser = userData.code_cua_user;
    const codePod = userData.code_pod;

    console.log('Got code_cua_user:', codeCuaUser);

    const cuaUserResp = await axios.get(
      `${process.env.EATCLOUD_BASE_URL}/api/decrypt/cua_users`,
      {
        params: { code: codeCuaUser },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    if (!cuaUserResp.data.ok || cuaUserResp.data.count === 0) {
      throw new Error('CUA user not found');
    }

    const cuaUserData = cuaUserResp.data.data[0];
    const multipleDonors = cuaUserData.multiple_donors;
    const cuaMasterCode = cuaUserData.code_cua_master;

    console.log('Multiple donors:', multipleDonors);

    let donorInfo = null;

    if (multipleDonors) {
      const multipleDonorsResp = await axios.get(
        `${process.env.EATCLOUD_BASE_URL}/api/decrypt/multiple_cua_users`,
        {
          params: { code_cua_user: codeCuaUser, _scmp: 'unique_identifier,name' },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (multipleDonorsResp.data.ok && multipleDonorsResp.data.data && multipleDonorsResp.data.data.length > 0) {
        donorInfo = {
          needsSelection: true,
          donors: multipleDonorsResp.data.data
        };
        console.log('Found', donorInfo.donors.length, 'donors');
      } else {
        console.log('WARNING: Multiple donors flag is true but API returned no donors');
        donorInfo = {
          needsSelection: false,
          donorCode: cuaUserData.unique_identifier,
          donorName: cuaUserData.name
        };
      }
    } else {
      donorInfo = {
        needsSelection: false,
        donorCode: cuaUserData.unique_identifier,
        donorName: cuaUserData.name
      };
      console.log('Single donor:', donorInfo.donorName);
    }

    const podsResp = await axios.get(
      `${process.env.EATCLOUD_BASE_URL}/api/pods`,
      {
        params: { code_cua_user: codeCuaUser, _scmp: 'code,code_pod,name' },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    if (!podsResp.data.ok || podsResp.data.count === 0) {
      throw new Error('No donation points found for this account');
    }

    if (!codePod) {
      throw new Error('No donation point assigned to this user account');
    }

    console.log('User code_pod:', codePod);

    const userPod = podsResp.data.data.find(pod => pod.code === codePod);

    if (!userPod) {
      throw new Error(`User's assigned donation point (${codePod}) not found in system`);
    }

    console.log('Found user POD:', userPod.name, '(code_pod:', userPod.code_pod + ')');

    console.log('Fetching user permissions...');
    const permissionsResp = await axios.get(
      `${process.env.EATCLOUD_BASE_URL}/api/cua_users`,
      {
        params: { 
          code: codeCuaUser, 
          _scmp: 'odds_cost,odds_weight,odds_taxes,odds_name' 
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    let permissions = {
      canEditCost: false,
      canEditWeight: false,
      canEditTax: false,
      canCreateProducts: false
    };

    if (permissionsResp.data.ok && permissionsResp.data.count > 0) {
      const perms = permissionsResp.data.data[0];
      permissions = {
        canEditCost: !perms.odds_cost,
        canEditWeight: !perms.odds_weight,
        canEditTax: !perms.odds_taxes,
        canCreateProducts: !perms.odds_name
      };
      console.log('Permissions:', permissions);
    }

    return {
      codeCuaUser,
      cuaMasterCode,
      selectedPodId: userPod.code_pod,
      selectedPodName: userPod.name,
      donorInfo,
      email,
      permissions
    };

  } catch (err) {
    console.error('Error fetching user details:', err.message);
    throw err;
  }
}

/* -------------------- Twilio Functions -------------------- */

function parseInteractiveReply(req) {
  const flatId = req.body?.ButtonPayload;
  const flatTitle = req.body?.ButtonText;
  const nested = req.body?.interactive?.button_reply || {};
  const id = (flatId || nested.id || '').trim();
  const title = (flatTitle || nested.title || '').trim();
  if (!id && !title) return null;
  return (id || title).toLowerCase();
}

/* -------------------- WhatsApp Webhook -------------------- */
app.post('/whatsapp', async (req, res) => {
  const twiml = new MessagingResponse();
  const from = req.body.From;
  const body = (req.body.Body || '').trim();
  const lower = body.toLowerCase();
  
  const reply = (text) => {
    twiml.message(text);
    res.type('text/xml').send(twiml.toString());
  };

  let s = await getSession(from);
  const clicked = parseInteractiveReply(req);

  console.log(`[${from}] Message: "${body}" | Step: ${s?.step || 'none'}`);

  /* ---------- Handle old button clicks ---------- */
  if (clicked) {
    if (!s || s.step !== 'authenticated') {
      if (await inCooloff(from)) {
        return res.type('text/xml').send('<Response/>');
      }
      return reply(welcomeText());
    }
    
    if (clicked.includes('make_donation') || clicked.includes('make a donation')) {
      return reply('Type "1" to make a donation.');
    }
    if (clicked.includes('logout')) {
      await clearSession(from);
      await setCooloff(from, 5000);
      return reply('You have been logged out.\n' + welcomeText());
    }
    return reply('Type "menu" to see options.');
  }

  /* ---------- Login command ---------- */
  if (lower === 'login') {
    await setSession(from, { step: 'await_email', attempts: 0 });
    return reply('Please enter your registered email address.');
  }

  /* ---------- Menu command ---------- */
  if (lower === 'menu') {
    if (s && s.step === 'authenticated') {
      await setSession(from, { step: 'authenticated_at_menu' });
      return reply(getMainMenuText());
    }
    return reply('You need to log in first to access the menu.\nType "login" to sign in.');
  }

  /* ---------- First-time users ---------- */
  if (!s) {
    await setSession(from, { step: 'idle' });
    return reply(welcomeText());
  }

  /* ---------- Collect email ---------- */
  if (s.step === 'await_email') {
    if (!isEmail(body)) {
      return reply('That does not look like a valid email. Please re-enter your email address (e.g., name@example.com).');
    }
    await setSession(from, { step: 'await_password', email: body, attempts: 0 });
    return reply([
      `Thanks. Now enter your password for ${maskEmail(body)}.`,
      '',
      'SECURITY REMINDER:',
      'After sending your password, immediately:',
      '• Long-press your password message',
      '• Tap "Delete" -> "Delete for me"',
      '',
      'Your password is transmitted securely and never stored.'
    ].join('\n'));
  }

  /* ---------- Collect password + authenticate ---------- */
  if (s.step === 'await_password') {
    const attempts = (s.attempts || 0) + 1;
    await setSession(from, { attempts });

    try {
      console.log('Attempting login...');
      const loginUrl = `${process.env.EATCLOUD_BASE_URL}/auth/login`;
      const resp = await axios.post(
        loginUrl, 
        { email: s.email, password: body }, 
        { timeout: 10000 }
      );

      const token = resp?.data?.token || resp?.data?.access_token || resp?.data?.jwt;
      if (!token) throw new Error('No token found in login response');

      console.log('Login successful, fetching user details...');
      
      const userDetails = await fetchUserDetails(s.email, token);
      
      await setSession(from, { 
        step: 'authenticated_at_menu', 
        token, 
        email: s.email,
        userDetails,
        attempts: 0 
      });

      return reply([
        'Login successful!',
        `Welcome, ${maskEmail(s.email)}.`,
        '',
        'Remember to delete your password message above!',
        '',
        getMainMenuText()
      ].join('\n'));

    } catch (err) {
      console.error('Login error:', err.message);
      
      if (attempts >= 3) {
        await clearSession(from);
        return reply('Login failed 3 times. Session reset. Type "login" to try again.');
      }
      
      await setSession(from, { step: 'await_email', email: null });
      return reply('Login failed. Let us try again.\nPlease re-enter your email address.');
    }
  }

  /* ---------- Select donor ---------- */
  if (s.step === 'select_donor') {
    const selection = parseInt(body);
    const donors = s.userDetails?.donorInfo?.donors;
    
    if (!donors || isNaN(selection) || selection < 1 || selection > donors.length) {
      return reply(`Please enter a number between 1 and ${donors?.length || 0}.`);
    }
    
    const selectedDonor = donors[selection - 1];
    
    await setSession(from, {
      selectedDonorCode: selectedDonor.unique_identifier,
      selectedDonorName: selectedDonor.name,
      step: 'donation_product_search'
    });
    
    return reply([
      `Selected: ${selectedDonor.name}`,
      `Donation point: ${s.userDetails.selectedPodName}`,
      '',
      getProductSearchPrompt()
    ].join('\n'));
  }

  /* ---------- Product search ---------- */
  if (s.step === 'donation_product_search') {
    const searchTerm = body.toLowerCase().trim();
    
    if (searchTerm.length < 2) {
      return reply('Please enter at least 2 characters to search for a product.');
    }
    
    try {
      console.log('Searching for product:', searchTerm);
      
      const result = await searchProductsForUser(s.token, s.userDetails.codeCuaUser, searchTerm);
      
      if (!result.success) {
        return reply([
          'No products found in your catalog.',
          '',
          'Type "menu" to go back or try another search term.'
        ].join('\n'));
      }
      
      if (result.matches.length === 0) {
        return reply([
          `No products found matching "${body}".`,
          '',
          'Try:',
          '• Using different keywords',
          '• Checking spelling',
          '• Using shorter search terms',
          '',
          'Or type "menu" to go back.'
        ].join('\n'));
      }
      
      await setSession(from, { 
        step: 'donation_product_select',
        productMatches: result.matches
      });
      
      const productList = result.matches.map((p, i) => 
        `${i + 1}. ${p.name}`
      ).join('\n');
      
      return reply([
        `Found ${result.matches.length} matching product${result.matches.length > 1 ? 's' : ''}:`,
        '',
        productList,
        '',
        'Reply with the number to select.',
        'Or type a new search term to search again.'
      ].join('\n'));
      
    } catch (err) {
      console.error('Product search error:', err.message);
      return reply([
        'Error searching for products. Please try again.',
        '',
        'Type "menu" to go back or try another search term.'
      ].join('\n'));
    }
  }

  /* ---------- Product selection ---------- */
  if (s.step === 'donation_product_select') {
    if (isNaN(parseInt(body))) {
      await setSession(from, { step: 'donation_product_search' });
      const searchTerm = body.toLowerCase().trim();
      
      if (searchTerm.length < 2) {
        return reply('Please enter at least 2 characters to search for a product.');
      }
      
      try {
        console.log('New search for product:', searchTerm);
        
        const result = await searchProductsForUser(s.token, s.userDetails.codeCuaUser, searchTerm);
        
        if (!result.success) {
          return reply([
            'No products found in your catalog.',
            '',
            'Type "menu" to go back or try another search term.'
          ].join('\n'));
        }
        
        if (result.matches.length === 0) {
          return reply([
            `No products found matching "${body}".`,
            '',
            'Try different keywords or type "menu" to go back.'
          ].join('\n'));
        }
        
        await setSession(from, { 
          step: 'donation_product_select',
          productMatches: result.matches
        });
        
        const productList = result.matches.map((p, i) => 
          `${i + 1}. ${p.name}`
        ).join('\n');
        
        return reply([
          `Found ${result.matches.length} matching product${result.matches.length > 1 ? 's' : ''}:`,
          '',
          productList,
          '',
          'Reply with the number to select.',
          'Or type a new search term to search again.'
        ].join('\n'));
        
      } catch (err) {
        console.error('Product search error:', err.message);
        return reply('Error searching for products. Please try again.');
      }
    }
    
    const selection = parseInt(body);
    const matches = s.productMatches;
    
    if (!matches || selection < 1 || selection > matches.length) {
      return reply(`Please enter a number between 1 and ${matches?.length || 0}, or type a new search term.`);
    }
    
    const selectedProduct = matches[selection - 1];
    const permissions = s.userDetails?.permissions || {};
    
    if (shouldShowProductReview(permissions)) {
      await setSession(from, { 
        selectedProduct,
        step: 'donation_review_product_details'
      });
      
      return reply(getProductReviewMessage(selectedProduct, permissions));
    } else {
      await setSession(from, { 
        selectedProduct,
        step: 'donation_quantity'
      });
      
      return reply([
        `Selected: ${selectedProduct.name}`,
        '',
        'How many units would you like to donate?',
        '',
        '(Enter a number)'
      ].join('\n'));
    }
  }

  /* ---------- Review Product Details ---------- */
  if (s.step === 'donation_review_product_details') {
    if (lower === 'ok') {
      await setSession(from, { step: 'donation_quantity' });
      
      return reply([
        'How many units would you like to donate?',
        '',
        '(Enter a number)'
      ].join('\n'));
    }
    
    if (lower === 'edit') {
      const permissions = s.userDetails?.permissions || {};
      
      if (permissions.canEditCost) {
        await setSession(from, { step: 'donation_edit_cost' });
        return reply([
          `Current cost: $${s.selectedProduct.unit_cost}`,
          '',
          'Enter new cost per unit (or type "skip" to keep current):',
          '',
          'Example: 2500.50'
        ].join('\n'));
      } else if (permissions.canEditWeight) {
        await setSession(from, { step: 'donation_edit_weight' });
        return reply([
          `Current weight: ${s.selectedProduct.unit_weight_kg} kg`,
          '',
          'Enter new weight per unit in kg (or type "skip" to keep current):',
          '',
          'Example: 0.5'
        ].join('\n'));
      } else if (permissions.canEditTax) {
        await setSession(from, { step: 'donation_edit_vat' });
        return reply([
          `Current VAT: ${s.selectedProduct.vat_percentage}%`,
          '',
          'Enter new VAT percentage (or type "skip" to keep current):',
          '',
          'Example: 19'
        ].join('\n'));
      }
    }
    
    return reply('Please type "ok" to continue or "edit" to modify values.');
  }

  /* ---------- Edit Cost ---------- */
  if (s.step === 'donation_edit_cost') {
    const permissions = s.userDetails?.permissions || {};
    
    if (lower !== 'skip') {
      const cost = parseFloat(body);
      if (isNaN(cost) || cost < 0) {
        return reply('Please enter a valid cost (e.g., 2500.50) or type "skip".');
      }
      s.selectedProduct.unit_cost = cost.toString();
      await setSession(from, { selectedProduct: s.selectedProduct });
    }
    
    if (permissions.canEditWeight) {
      await setSession(from, { step: 'donation_edit_weight' });
      return reply([
        `Current weight: ${s.selectedProduct.unit_weight_kg} kg`,
        '',
        'Enter new weight per unit in kg (or type "skip" to keep current):',
        '',
        'Example: 0.5'
      ].join('\n'));
    } else if (permissions.canEditTax) {
      await setSession(from, { step: 'donation_edit_vat' });
      return reply([
        `Current VAT: ${s.selectedProduct.vat_percentage}%`,
        '',
        'Enter new VAT percentage (or type "skip" to keep current):',
        '',
        'Example: 19'
      ].join('\n'));
    } else {
      await setSession(from, { step: 'donation_quantity' });
      return reply([
        'How many units would you like to donate?',
        '',
        '(Enter a number)'
      ].join('\n'));
    }
  }

  /* ---------- Edit Weight ---------- */
  if (s.step === 'donation_edit_weight') {
    const permissions = s.userDetails?.permissions || {};
    
    if (lower !== 'skip') {
      const weight = parseFloat(body);
      if (isNaN(weight) || weight <= 0) {
        return reply('Please enter a valid weight in kg (e.g., 0.5) or type "skip".');
      }
      s.selectedProduct.unit_weight_kg = weight.toString();
      await setSession(from, { selectedProduct: s.selectedProduct });
    }
    
    if (permissions.canEditTax) {
      await setSession(from, { step: 'donation_edit_vat' });
      return reply([
        `Current VAT: ${s.selectedProduct.vat_percentage}%`,
        '',
        'Enter new VAT percentage (or type "skip" to keep current):',
        '',
        'Example: 19'
      ].join('\n'));
    } else {
      await setSession(from, { step: 'donation_quantity' });
      return reply([
        'How many units would you like to donate?',
        '',
        '(Enter a number)'
      ].join('\n'));
    }
  }

  /* ---------- Edit VAT ---------- */
  if (s.step === 'donation_edit_vat') {
    if (lower !== 'skip') {
      const vat = parseInt(body);
      if (isNaN(vat) || vat < 0 || vat > 100) {
        return reply('Please enter a valid VAT percentage (0-100) or type "skip".');
      }
      s.selectedProduct.vat_percentage = vat.toString();
      await setSession(from, { selectedProduct: s.selectedProduct });
    }
    
    await setSession(from, { step: 'donation_quantity' });
    return reply([
      'How many units would you like to donate?',
      '',
      '(Enter a number)'
    ].join('\n'));
  }

  /* ---------- Quantity ---------- */
  if (s.step === 'donation_quantity') {
    const quantity = parseInt(body);
    
    if (isNaN(quantity) || quantity < 1) {
      return reply('Please enter a valid number of units (must be 1 or more).');
    }
    
    await setSession(from, { 
      donationQuantity: quantity,
      step: 'donation_expiration_date'
    });
    
    return reply([
      `Quantity: ${quantity} units`,
      '',
      'What is the expiration date?',
      '',
      'Format: YYYY-MM-DD (e.g., 2025-12-31)'
    ].join('\n'));
  }

  /* ---------- Expiration date ---------- */
  if (s.step === 'donation_expiration_date') {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!datePattern.test(body)) {
      return reply([
        'Invalid date format.',
        '',
        'Please use YYYY-MM-DD format.',
        'Example: 2025-12-31'
      ].join('\n'));
    }
    
    const date = new Date(body);
    if (isNaN(date.getTime())) {
      return reply([
        'Invalid date.',
        '',
        'Please enter a valid date in YYYY-MM-DD format.',
        'Example: 2025-12-31'
      ].join('\n'));
    }
    
    const donationItem = {
      product: s.selectedProduct,
      quantity: s.donationQuantity,
      expirationDate: body
    };
    
    const donationItems = s.donationItems || [];
    donationItems.push(donationItem);
    
    await setSession(from, {
      donationItems,
      step: 'donation_add_more'
    });
    
    const totalWeight = (donationItem.quantity * parseFloat(donationItem.product.unit_weight_kg)).toFixed(2);
    
    return reply([
      '✅ Product added to donation:',
      '',
      `${donationItem.product.name}`,
      `Quantity: ${donationItem.quantity} units`,
      `Weight: ${totalWeight} kg`,
      `Expiration: ${donationItem.expirationDate}`,
      '',
      `Total products in donation: ${donationItems.length}`,
      '',
      'Type "add" to add another product.',
      'Type "done" to review and confirm donation.'
    ].join('\n'));
  }

  /* ---------- Add more products ---------- */
  if (s.step === 'donation_add_more') {
    if (lower === 'add') {
      await setSession(from, { step: 'donation_product_search' });
      return reply([
        'What product would you like to add?',
        '',
        getProductSearchPrompt().split('\n')[2]
      ].join('\n'));
    }
    
    if (lower === 'done') {
      await setSession(from, { step: 'donation_confirm' });
      
      const items = s.donationItems;
      const podName = s.userDetails.selectedPodName;
      const donorName = s.selectedDonorName || s.userDetails?.donorInfo?.donorName || 'Your company';
      
      let totalWeight = 0;
      let totalCost = 0;
      
      const itemsList = items.map((item, index) => {
        const itemWeight = item.quantity * parseFloat(item.product.unit_weight_kg);
        const itemCost = item.quantity * parseFloat(item.product.unit_cost);
        totalWeight += itemWeight;
        totalCost += itemCost;
        
        return [
          `${index + 1}. ${item.product.name}`,
          `   Code: ${item.product.odd_code}`,
          `   Quantity: ${item.quantity} units`,
          `   Weight: ${itemWeight.toFixed(2)} kg`,
          `   Cost: $${itemCost.toFixed(2)}`,
          `   Expiration: ${item.expirationDate}`
        ].join('\n');
      }).join('\n\n');
      
      return reply([
        '=== REVIEW YOUR DONATION ===',
        '',
        `Donor: ${donorName}`,
        `Donation Point: ${podName}`,
        '',
        '--- PRODUCTS ---',
        itemsList,
        '',
        `--- TOTALS ---`,
        `Total Products: ${items.length}`,
        `Total Weight: ${totalWeight.toFixed(2)} kg`,
        `Total Cost: $${totalCost.toFixed(2)}`,
        '',
        'Type "confirm" to create this donation.',
        'Type "cancel" to cancel.'
      ].join('\n'));
    }
    
    return reply('Please type "add" to add another product, or "done" to review donation.');
  }

  /* ---------- Confirmation ---------- */
  if (s.step === 'donation_confirm') {
    if (lower === 'cancel') {
      await setSession(from, { 
        step: 'authenticated',
        donationItems: []
      });
      return reply('Donation cancelled. Type "menu" to see options.');
    }
    
    if (lower !== 'confirm') {
      return reply('Please type "confirm" to create the donation, or "cancel" to cancel.');
    }
    
    try {
      console.log('Creating donation with multiple items...');
      
      const items = s.donationItems || [];
      
      const dataArray = items.map(item => ({
        "eatc-cua_origin": s.userDetails.codeCuaUser,
        "eatc-donor_code": s.selectedDonorCode || s.userDetails.donorInfo.donorCode,
        "eatc-pod_id": s.userDetails.selectedPodId,
        "eatc-dona_creator_pod": s.userDetails.selectedPodId,
        "eatc-odd_id": item.product.odd_code,
        "eatc-odd_name": item.product.name,
        "eatc-odd_original_quantity": item.quantity.toString(),
        "eatc-odd_unit_weight_kg": parseFloat(item.product.unit_weight_kg),
        "eatc-unit_cost": parseFloat(item.product.unit_cost),
        "eatc-VAT_percentage": parseInt(item.product.vat_percentage),
        "eatc_closer_expiration_date": item.expirationDate
      }));
      
      const donationData = {
        "_operation": "create_donation",
        "_data": dataArray
      };
      
      console.log('Donation payload:', JSON.stringify(donationData, null, 2));
      
      const donationBaseUrl = process.env.DONATION_BASE_URL;
      const donationUrl = `${donationBaseUrl}/perduecreatedonation/${s.userDetails.cuaMasterCode}/${s.userDetails.codeCuaUser}/perdue`;
      
      const donationResp = await axios.post(
        donationUrl,
        donationData,
        {
          auth: {
            username: process.env.DONATION_USERNAME,
            password: process.env.DONATION_PASSWORD
          },
          timeout: 15000
        }
      );
      
      console.log('Donation created successfully');
      
      if (donationResp.data && donationResp.data.op) {
        let totalWeight = 0;
        items.forEach(item => {
          totalWeight += item.quantity * parseFloat(item.product.unit_weight_kg);
        });
        
        await setSession(from, { 
          step: 'authenticated',
          donationItems: []
        });
        
        return reply([
          '✅ Donation created successfully!',
          '',
          `Total Products: ${items.length}`,
          `Total Weight: ${totalWeight.toFixed(2)} kg`,
          '',
          'Type "menu" to make another donation or see options.'
        ].join('\n'));
      } else {
        throw new Error('Donation creation failed: ' + JSON.stringify(donationResp.data));
      }
      
    } catch (err) {
      console.error('Donation creation error:', err.message);
      await setSession(from, { 
        step: 'authenticated',
        donationItems: []
      });
      
      return reply([
        '❌ Error creating donation.',
        '',
        'Please try again or contact support.',
        '',
        'Type "menu" to go back.'
      ].join('\n'));
    }
  }

  /* ---------- Menu selections (at menu screen) ---------- */
  if (s.step === 'authenticated_at_menu') {
    if (body === '1' || lower.includes('donation')) {
      
      if (s.userDetails?.donorInfo?.needsSelection && !s.selectedDonorCode) {
        await setSession(from, { step: 'select_donor' });
        
        const donors = s.userDetails.donorInfo.donors;
        const donorList = formatDonorList(donors);
        
        return reply([
          'Which entity are you donating as?',
          '',
          donorList,
          '',
          'Reply with the number.'
        ].join('\n'));
      }
      
      await setSession(from, { step: 'donation_product_search' });
      
      return reply([
        `Donation point: ${s.userDetails.selectedPodName}`,
        '',
        getProductSearchPrompt()
      ].join('\n'));
    }
    
    if (body === '2' || lower === 'logout') {
      await clearSession(from);
      await setCooloff(from);
      return reply('You have been logged out.\n' + welcomeText());
    }
    
    return reply(getMainMenuText());
  }

  /* ---------- Authenticated fallback (not at menu) ---------- */
  if (s.step === 'authenticated') {
    if (body === '1' || lower === 'menu') {
      await setSession(from, { step: 'authenticated_at_menu' });
      return reply(getMainMenuText());
    }
    
    return reply('You are signed in. Type "menu" to see options, or "logout" to sign out.');
  }

  /* ---------- Idle fallback ---------- */
  if (s.step === 'idle') {
    return reply(welcomeText());
  }

  return reply(welcomeText());
});

/* -------------------- Health Check -------------------- */
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    await redisClient.ping();
    
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      redis: 'connected'
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      redis: 'disconnected',
      error: err.message
    });
  }
});

/* -------------------- Startup -------------------- */
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`✅ WhatsApp bot listening on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
});

/* -------------------- Graceful Shutdown -------------------- */
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received, closing gracefully...`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    } catch (err) {
      console.error('❌ Error closing Redis:', err);
    }
    
    console.log('🛑 Process terminated');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));