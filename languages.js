// Language configuration for EatCloud WhatsApp Bot

const languages = {
  en: {
    code: 'en',
    name: 'English',
    
    // Welcome & Login
    welcome: 'Welcome to EatCloud! Type "login" to sign in.',
    requestEmail: 'Please enter your registered email address.',
    invalidEmail: 'That does not look like a valid email. Please re-enter your email address (e.g., name@example.com).',
    requestPassword: (email) => [
      `Thanks. Now enter your password for ${email}.`,
      '',
      'SECURITY REMINDER:',
      'After sending your password, immediately:',
      '• Long-press your password message',
      '• Tap "Delete" -> "Delete for me"',
      '',
      'Your password is transmitted securely and never stored.'
    ].join('\n'),
    
    // Login success/failure
    loginSuccess: (email) => [
      'Login successful!',
      `Welcome, ${email}.`,
      '',
      'Remember to delete your password message above!'
    ].join('\n'),
    loginFailed: 'Login failed. Let us try again.\nPlease re-enter your email address.',
    loginFailedMax: 'Login failed 3 times. Session reset. Type "login" to try again.',
    
    // Logout
    logoutSuccess: 'You have been logged out.',
    
    // Menu
    mainMenu: [
      '=== MAIN MENU ===',
      '',
      '1. Make a Donation',
      '2. Logout',
      '',
      'Reply with 1 or 2'
    ].join('\n'),
    needLoginForMenu: 'You need to log in first to access the menu.\nType "login" to sign in.',
    typeMenuForOptions: 'You are signed in. Type "menu" to see options, or "logout" to sign out.',
    typeMenuPrompt: 'Type "menu" to see options.',
    
    // Donor selection
    selectDonor: (donorList) => [
      'Which entity are you donating as?',
      '',
      donorList,
      '',
      'Reply with the number.'
    ].join('\n'),
    invalidDonorSelection: (max) => `Please enter a number between 1 and ${max}.`,
    donorSelected: (donorName, podName) => [
      `Selected: ${donorName}`,
      `Donation point: ${podName}`
    ].join('\n'),
    
    // Product search
    productSearchPrompt: [
      'What product would you like to donate?',
      '',
      'Tip: Type part of the product name (e.g., "crema", "yogurt")'
    ].join('\n'),
    productSearchMinLength: 'Please enter at least 2 characters to search for a product.',
    productsNotFound: (term) => [
      `No products found matching "${term}".`,
      '',
      'Options:',
      '1. Try a different search term',
      '2. Add new product',
      '',
      'Reply with 1 or 2'
    ].join('\n'),
    productsFound: (count, list) => [
      `Found ${count} matching product${count > 1 ? 's' : ''}:`,
      '',
      list,
      '',
      'Reply with the number to select,',
      'Type a new search term to search again,',
      'Or type "0" to create a new product.'
    ].join('\n'),
    searchError: [
      'Error searching for products. Please try again.',
      '',
      'Type "menu" to go back or try another search term.'
    ].join('\n'),
    invalidProductSelection: (max) => `Please enter a number between 1 and ${max}, or type a new search term.`,
    
    // Create new product
    createProductNamePrompt: [
      'Enter the product name:',
      '',
      'Example: ALPINA LECHE ENTERA 1L'
    ].join('\n'),
    createProductNameInvalid: 'Please enter a valid product name (minimum 3 characters).',
    createProductPrompt: (productName) => [
      `Creating new product: "${productName}"`,
      '',
      'Enter the unit cost (price per unit):',
      '',
      'Example: 2500.50'
    ].join('\n'),
    createProductCostInvalid: 'Please enter a valid cost (e.g., 2500.50).',
    createProductWeightPrompt: [
      'Enter the unit weight in kilograms:',
      '',
      'Example: 0.5'
    ].join('\n'),
    createProductWeightInvalid: 'Please enter a valid weight in kg (e.g., 0.5).',
    createProductVatPrompt: [
      'Enter the VAT percentage:',
      '',
      'Example: 19'
    ].join('\n'),
    createProductVatInvalid: 'Please enter a valid VAT percentage (0-100).',
    createProductSuccess: (productName) => [
      `✅ Product created successfully!`,
      '',
      `Name: ${productName}`,
      '',
      'Now continuing with donation...'
    ].join('\n'),
    createProductError: [
      '❌ Error creating product.',
      '',
      'Please try again or search for a different product.',
      '',
      'Type "menu" to go back.'
    ].join('\n'),
    
    // Product review
    productReview: (productName, details, canEdit) => {
      const lines = [
        `Selected: ${productName}`,
        '',
        '📦 Product Details:',
        ...details,
        ''
      ];
      
      if (canEdit) {
        lines.push('Type "edit" to modify these values.');
        lines.push('Type "ok" to use these values.');
      } else {
        lines.push('Type "ok" to continue.');
      }
      
      return lines.join('\n');
    },
    productReviewOkOrEdit: 'Please type "ok" to continue or "edit" to modify values.',
    
    // Product editing
    editCostPrompt: (currentCost) => [
      `Current cost: $${currentCost}`,
      '',
      'Enter new cost per unit (or type "skip" to keep current):',
      '',
      'Example: 2500.50'
    ].join('\n'),
    invalidCost: 'Please enter a valid cost (e.g., 2500.50) or type "skip".',
    
    editWeightPrompt: (currentWeight) => [
      `Current weight: ${currentWeight} kg`,
      '',
      'Enter new weight per unit in kg (or type "skip" to keep current):',
      '',
      'Example: 0.5'
    ].join('\n'),
    invalidWeight: 'Please enter a valid weight in kg (e.g., 0.5) or type "skip".',
    
    editVatPrompt: (currentVat) => [
      `Current VAT: ${currentVat}%`,
      '',
      'Enter new VAT percentage (or type "skip" to keep current):',
      '',
      'Example: 19'
    ].join('\n'),
    invalidVat: 'Please enter a valid VAT percentage (0-100) or type "skip".',
    
    // Quantity
    quantityPrompt: (productName) => [
      `Selected: ${productName}`,
      '',
      'How many units would you like to donate?',
      '',
      '(Enter a number)'
    ].join('\n'),
    quantityPromptSimple: [
      'How many units would you like to donate?',
      '',
      '(Enter a number)'
    ].join('\n'),
    invalidQuantity: 'Please enter a valid number of units (must be 1 or more).',
    
    // Expiration date
    expirationPrompt: (quantity) => [
      `Quantity: ${quantity} units`,
      '',
      'What is the expiration date?',
      '',
      'Format: YYYY-MM-DD (e.g., 2025-12-31)'
    ].join('\n'),
    invalidDateFormat: [
      'Invalid date format.',
      '',
      'Please use YYYY-MM-DD format.',
      'Example: 2025-12-31'
    ].join('\n'),
    invalidDate: [
      'Invalid date.',
      '',
      'Please enter a valid date in YYYY-MM-DD format.',
      'Example: 2025-12-31'
    ].join('\n'),
    
    // Add more products
    productAdded: (productName, quantity, weight, expirationDate, totalProducts) => [
      '✅ Product added to donation:',
      '',
      productName,
      `Quantity: ${quantity} units`,
      `Weight: ${weight} kg`,
      `Expiration: ${expirationDate}`,
      '',
      `Total products in donation: ${totalProducts}`,
      '',
      'Type "add" to add another product.',
      'Type "done" to review and confirm donation.'
    ].join('\n'),
    addMorePrompt: 'Please type "add" to add another product, or "done" to review donation.',
    addAnotherProduct: [
      'What product would you like to add?',
      '',
      'Tip: Type part of the product name (e.g., "crema", "yogurt")'
    ].join('\n'),
    
    // Donation review
    reviewDonation: (donorName, podName, itemsList, totalProducts, totalWeight, totalCost) => [
      '=== REVIEW YOUR DONATION ===',
      '',
      `Donor: ${donorName}`,
      `Donation Point: ${podName}`,
      '',
      '--- PRODUCTS ---',
      itemsList,
      '',
      '--- TOTALS ---',
      `Total Products: ${totalProducts}`,
      `Total Weight: ${totalWeight} kg`,
      `Total Cost: $${totalCost}`,
      '',
      'Type "confirm" to create this donation.',
      'Type "cancel" to cancel.'
    ].join('\n'),
    confirmOrCancel: 'Please type "confirm" to create the donation, or "cancel" to cancel.',
    donationCancelled: 'Donation cancelled. Type "menu" to see options.',
    
    // Donation success/failure
    donationSuccess: (totalProducts, totalWeight) => [
      '✅ Donation created successfully!',
      '',
      `Total Products: ${totalProducts}`,
      `Total Weight: ${totalWeight} kg`,
      '',
      'Type "menu" to make another donation or see options.'
    ].join('\n'),
    donationError: [
      '❌ Error creating donation.',
      '',
      'Please try again or contact support.',
      '',
      'Type "menu" to go back.'
    ].join('\n'),
    
    // Old button clicks
    oldButtonClick: 'Type "1" to make a donation.',
    
    // Commands
    commands: {
      login: 'login',
      menu: 'menu',
      logout: 'logout',
      edit: 'edit',
      ok: 'ok',
      skip: 'skip',
      add: 'add',
      done: 'done',
      confirm: 'confirm',
      cancel: 'cancel'
    }
  },
  
  es: {
    code: 'es',
    name: 'Español',
    
    // Bienvenida e inicio de sesión
    welcome: '¡Bienvenido a EatCloud! Escribe "iniciar" para ingresar.',
    requestEmail: 'Por favor ingresa tu correo electrónico registrado.',
    invalidEmail: 'Ese no parece ser un correo válido. Por favor ingresa tu correo electrónico (ej: nombre@ejemplo.com).',
    requestPassword: (email) => [
      `Gracias. Ahora ingresa tu contraseña para ${email}.`,
      '',
      'RECORDATORIO DE SEGURIDAD:',
      'Después de enviar tu contraseña, inmediatamente:',
      '• Mantén presionado tu mensaje de contraseña',
      '• Toca "Eliminar" -> "Eliminar para mí"',
      '',
      'Tu contraseña se transmite de forma segura y nunca se almacena.'
    ].join('\n'),
    
    // Éxito/fallo de inicio de sesión
    loginSuccess: (email) => [
      '¡Inicio de sesión exitoso!',
      `Bienvenido, ${email}.`,
      '',
      '¡Recuerda eliminar tu mensaje de contraseña arriba!'
    ].join('\n'),
    loginFailed: 'Inicio de sesión fallido. Intentemos de nuevo.\nPor favor vuelve a ingresar tu correo electrónico.',
    loginFailedMax: 'Inicio de sesión fallido 3 veces. Sesión reiniciada. Escribe "iniciar" para intentar de nuevo.',
    
    // Cerrar sesión
    logoutSuccess: 'Has cerrado sesión.',
    
    // Menú
    mainMenu: [
      '=== MENÚ PRINCIPAL ===',
      '',
      '1. Hacer una Donación',
      '2. Cerrar Sesión',
      '',
      'Responde con 1 o 2'
    ].join('\n'),
    needLoginForMenu: 'Necesitas iniciar sesión primero para acceder al menú.\nEscribe "iniciar" para ingresar.',
    typeMenuForOptions: 'Has iniciado sesión. Escribe "menu" para ver opciones, o "salir" para cerrar sesión.',
    typeMenuPrompt: 'Escribe "menu" para ver opciones.',
    
    // Selección de donante
    selectDonor: (donorList) => [
      '¿Como qué entidad estás donando?',
      '',
      donorList,
      '',
      'Responde con el número.'
    ].join('\n'),
    invalidDonorSelection: (max) => `Por favor ingresa un número entre 1 y ${max}.`,
    donorSelected: (donorName, podName) => [
      `Seleccionado: ${donorName}`,
      `Punto de donación: ${podName}`
    ].join('\n'),
    
    // Búsqueda de productos
    productSearchPrompt: [
      '¿Qué producto te gustaría donar?',
      '',
      'Consejo: Escribe parte del nombre del producto (ej: "crema", "yogurt")'
    ].join('\n'),
    productSearchMinLength: 'Por favor ingresa al menos 2 caracteres para buscar un producto.',
    productsNotFound: (term) => [
      `No se encontraron productos que coincidan con "${term}".`,
      '',
      'Opciones:',
      '1. Intentar con otro término de búsqueda',
      '2. Agregar nuevo producto',
      '',
      'Responde con 1 o 2'
    ].join('\n'),
    productsFound: (count, list) => [
      `Se encontraron ${count} producto${count > 1 ? 's' : ''} coincidente${count > 1 ? 's' : ''}:`,
      '',
      list,
      '',
      'Responde con el número para seleccionar,',
      'Escribe un nuevo término de búsqueda para buscar de nuevo,',
      'O escribe "0" para crear un nuevo producto.'
    ].join('\n'),
    searchError: [
      'Error al buscar productos. Por favor intenta de nuevo.',
      '',
      'Escribe "menu" para volver o prueba con otro término de búsqueda.'
    ].join('\n'),
    invalidProductSelection: (max) => `Por favor ingresa un número entre 1 y ${max}, o escribe un nuevo término de búsqueda.`,
    
    // Crear nuevo producto
    createProductNamePrompt: [
      'Ingresa el nombre del producto:',
      '',
      'Ejemplo: ALPINA LECHE ENTERA 1L'
    ].join('\n'),
    createProductNameInvalid: 'Por favor ingresa un nombre de producto válido (mínimo 3 caracteres).',
    createProductPrompt: (productName) => [
      `Creando nuevo producto: "${productName}"`,
      '',
      'Ingresa el costo por unidad (precio por unidad):',
      '',
      'Ejemplo: 2500.50'
    ].join('\n'),
    createProductCostInvalid: 'Por favor ingresa un costo válido (ej: 2500.50).',
    createProductWeightPrompt: [
      'Ingresa el peso por unidad en kilogramos:',
      '',
      'Ejemplo: 0.5'
    ].join('\n'),
    createProductWeightInvalid: 'Por favor ingresa un peso válido en kg (ej: 0.5).',
    createProductVatPrompt: [
      'Ingresa el porcentaje de IVA:',
      '',
      'Ejemplo: 19'
    ].join('\n'),
    createProductVatInvalid: 'Por favor ingresa un porcentaje de IVA válido (0-100).',
    createProductSuccess: (productName) => [
      `✅ ¡Producto creado exitosamente!`,
      '',
      `Nombre: ${productName}`,
      '',
      'Ahora continuando con la donación...'
    ].join('\n'),
    createProductError: [
      '❌ Error al crear el producto.',
      '',
      'Por favor intenta de nuevo o busca un producto diferente.',
      '',
      'Escribe "menu" para volver.'
    ].join('\n'),
    
    // Revisión de producto
    productReview: (productName, details, canEdit) => {
      const lines = [
        `Seleccionado: ${productName}`,
        '',
        '📦 Detalles del Producto:',
        ...details,
        ''
      ];
      
      if (canEdit) {
        lines.push('Escribe "editar" para modificar estos valores.');
        lines.push('Escribe "ok" para usar estos valores.');
      } else {
        lines.push('Escribe "ok" para continuar.');
      }
      
      return lines.join('\n');
    },
    productReviewOkOrEdit: 'Por favor escribe "ok" para continuar o "editar" para modificar valores.',
    
    // Edición de producto
    editCostPrompt: (currentCost) => [
      `Costo actual: $${currentCost}`,
      '',
      'Ingresa el nuevo costo por unidad (o escribe "saltar" para mantener el actual):',
      '',
      'Ejemplo: 2500.50'
    ].join('\n'),
    invalidCost: 'Por favor ingresa un costo válido (ej: 2500.50) o escribe "saltar".',
    
    editWeightPrompt: (currentWeight) => [
      `Peso actual: ${currentWeight} kg`,
      '',
      'Ingresa el nuevo peso por unidad en kg (o escribe "saltar" para mantener el actual):',
      '',
      'Ejemplo: 0.5'
    ].join('\n'),
    invalidWeight: 'Por favor ingresa un peso válido en kg (ej: 0.5) o escribe "saltar".',
    
    editVatPrompt: (currentVat) => [
      `IVA actual: ${currentVat}%`,
      '',
      'Ingresa el nuevo porcentaje de IVA (o escribe "saltar" para mantener el actual):',
      '',
      'Ejemplo: 19'
    ].join('\n'),
    invalidVat: 'Por favor ingresa un porcentaje de IVA válido (0-100) o escribe "saltar".',
    
    // Cantidad
    quantityPrompt: (productName) => [
      `Seleccionado: ${productName}`,
      '',
      '¿Cuántas unidades te gustaría donar?',
      '',
      '(Ingresa un número)'
    ].join('\n'),
    quantityPromptSimple: [
      '¿Cuántas unidades te gustaría donar?',
      '',
      '(Ingresa un número)'
    ].join('\n'),
    invalidQuantity: 'Por favor ingresa un número válido de unidades (debe ser 1 o más).',
    
    // Fecha de vencimiento
    expirationPrompt: (quantity) => [
      `Cantidad: ${quantity} unidades`,
      '',
      '¿Cuál es la fecha de vencimiento?',
      '',
      'Formato: AAAA-MM-DD (ej: 2025-12-31)'
    ].join('\n'),
    invalidDateFormat: [
      'Formato de fecha inválido.',
      '',
      'Por favor usa el formato AAAA-MM-DD.',
      'Ejemplo: 2025-12-31'
    ].join('\n'),
    invalidDate: [
      'Fecha inválida.',
      '',
      'Por favor ingresa una fecha válida en formato AAAA-MM-DD.',
      'Ejemplo: 2025-12-31'
    ].join('\n'),
    
    // Agregar más productos
    productAdded: (productName, quantity, weight, expirationDate, totalProducts) => [
      '✅ Producto agregado a la donación:',
      '',
      productName,
      `Cantidad: ${quantity} unidades`,
      `Peso: ${weight} kg`,
      `Vencimiento: ${expirationDate}`,
      '',
      `Total de productos en la donación: ${totalProducts}`,
      '',
      'Escribe "agregar" para añadir otro producto.',
      'Escribe "listo" para revisar y confirmar la donación.'
    ].join('\n'),
    addMorePrompt: 'Por favor escribe "agregar" para añadir otro producto, o "listo" para revisar la donación.',
    addAnotherProduct: [
      '¿Qué producto te gustaría agregar?',
      '',
      'Consejo: Escribe parte del nombre del producto (ej: "crema", "yogurt")'
    ].join('\n'),
    
    // Revisión de donación
    reviewDonation: (donorName, podName, itemsList, totalProducts, totalWeight, totalCost) => [
      '=== REVISA TU DONACIÓN ===',
      '',
      `Donante: ${donorName}`,
      `Punto de Donación: ${podName}`,
      '',
      '--- PRODUCTOS ---',
      itemsList,
      '',
      '--- TOTALES ---',
      `Total de Productos: ${totalProducts}`,
      `Peso Total: ${totalWeight} kg`,
      `Costo Total: $${totalCost}`,
      '',
      'Escribe "confirmar" para crear esta donación.',
      'Escribe "cancelar" para cancelar.'
    ].join('\n'),
    confirmOrCancel: 'Por favor escribe "confirmar" para crear la donación, o "cancelar" para cancelar.',
    donationCancelled: 'Donación cancelada. Escribe "menu" para ver opciones.',
    
    // Éxito/fallo de donación
    donationSuccess: (totalProducts, totalWeight) => [
      '✅ ¡Donación creada exitosamente!',
      '',
      `Total de Productos: ${totalProducts}`,
      `Peso Total: ${totalWeight} kg`,
      '',
      'Escribe "menu" para hacer otra donación o ver opciones.'
    ].join('\n'),
    donationError: [
      '❌ Error al crear la donación.',
      '',
      'Por favor intenta de nuevo o contacta a soporte.',
      '',
      'Escribe "menu" para volver.'
    ].join('\n'),
    
    // Clics de botones antiguos
    oldButtonClick: 'Escribe "1" para hacer una donación.',
    
    // Comandos
    commands: {
      login: 'iniciar',
      menu: 'menu',
      logout: 'salir',
      edit: 'editar',
      ok: 'ok',
      skip: 'saltar',
      add: 'agregar',
      done: 'listo',
      confirm: 'confirmar',
      cancel: 'cancelar'
    }
  }
};

// Language detection helper
function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  
  // Spanish login commands
  if (lower === 'iniciar' || lower === 'inicio' || lower === 'ingresar') {
    return 'es';
  }
  
  // English login commands
  if (lower === 'login' || lower === 'start' || lower === 'begin') {
    return 'en';
  }
  
  // Spanish common commands
  const spanishCommands = ['menu', 'salir', 'editar', 'agregar', 'listo', 'confirmar', 'cancelar', 'saltar'];
  if (spanishCommands.includes(lower)) {
    return 'es';
  }
  
  // Spanish indicators in text (expanded list - 40+ words)
  const spanishWords = [
    // Greetings
    'hola', 'buenos', 'buenas', 'días', 'tardes', 'noches',
    // Politeness
    'gracias', 'por favor', 'disculpa', 'perdón', 'perdona',
    // Common verbs
    'ayuda', 'ayudar', 'necesito', 'quiero', 'quisiera', 'puedo', 'puede',
    'donar', 'donación', 'hacer', 'crear', 'ver', 'mostrar',
    // Question words
    'qué', 'cómo', 'cuándo', 'dónde', 'por qué', 'quién', 'cuál', 'cuánto',
    // Common nouns
    'producto', 'productos', 'cantidad', 'peso', 'fecha', 'correo',
    'contraseña', 'usuario', 'cuenta', 'sesión',
    // Common phrases
    'no entiendo', 'otra vez', 'de nuevo', 'está bien', 'perfecto',
    // Food-related (relevant to EatCloud)
    'alimento', 'alimentos', 'comida', 'leche', 'queso', 'yogurt'
  ];
  
  if (spanishWords.some(word => lower.includes(word))) {
    return 'es';
  }
  
  // Default to English
  return 'en';
}

// Get messages for a specific language
function getMessages(lang = 'en') {
  return languages[lang] || languages.en;
}

// Command matcher that works across languages
function matchesCommand(input, commandKey, lang) {
  const lower = input.toLowerCase().trim();
  const cmd = languages[lang].commands[commandKey].toLowerCase();
  
  // Also check the other language for flexibility
  const otherLang = lang === 'en' ? 'es' : 'en';
  const otherCmd = languages[otherLang].commands[commandKey].toLowerCase();
  
  return lower === cmd || lower === otherCmd;
}

module.exports = {
  languages,
  detectLanguage,
  getMessages,
  matchesCommand
};