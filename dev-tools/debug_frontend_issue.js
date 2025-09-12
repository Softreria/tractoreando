const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting frontend debugging...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for errors
  page.on('pageerror', error => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });
  
  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('📱 Navigating to frontend...');
    await page.goto('http://localhost:3000');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(2000);
    
    // Check if login is needed
    const loginForm = await page.$('form');
    if (loginForm) {
      console.log('🔐 Login form detected, logging in...');
      
      await page.fill('input[type="email"]', 'admin@tractoreando.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      console.log('⏳ Waiting for login to complete...');
      await page.waitForTimeout(3000);
    }
    
    // Navigate to companies page
    console.log('🏢 Navigating to companies page...');
    
    // Try different ways to navigate to companies
    const companiesLink = await page.$('a[href*="companies"]');
    if (companiesLink) {
      await companiesLink.click();
    } else {
      // Try direct navigation
      await page.goto('http://localhost:3000/companies');
    }
    
    console.log('⏳ Waiting for companies page to load...');
    await page.waitForTimeout(3000);
    
    // Check if companies are loaded
    const companiesTable = await page.$('table');
    if (!companiesTable) {
      console.error('❌ Companies table not found');
      await browser.close();
      return;
    }
    
    console.log('✅ Companies table found');
    
    // Look for action buttons (MoreVert icons)
    const actionButtons = await page.$$('button[aria-label*="more"], button svg[data-testid="MoreVertIcon"], button:has(svg[data-testid="MoreVertIcon"])');
    console.log(`📋 Found ${actionButtons.length} action buttons`);
    
    if (actionButtons.length === 0) {
      // Try alternative selectors
      const moreButtons = await page.$$('button');
      console.log(`🔍 Total buttons found: ${moreButtons.length}`);
      
      for (let i = 0; i < moreButtons.length; i++) {
        const buttonText = await moreButtons[i].textContent();
        const buttonHTML = await moreButtons[i].innerHTML();
        console.log(`Button ${i}: "${buttonText}" - HTML: ${buttonHTML.substring(0, 100)}...`);
      }
    }
    
    // Try to click the first action button
    if (actionButtons.length > 0) {
      console.log('🖱️ Clicking first action button...');
      await actionButtons[0].click();
      
      console.log('⏳ Waiting for menu to appear...');
      await page.waitForTimeout(1000);
      
      // Look for menu items
      const menuItems = await page.$$('li[role="menuitem"], .MuiMenuItem-root');
      console.log(`📋 Found ${menuItems.length} menu items`);
      
      if (menuItems.length > 0) {
        for (let i = 0; i < menuItems.length; i++) {
          const itemText = await menuItems[i].textContent();
          console.log(`Menu item ${i}: "${itemText}"`);
        }
        
        // Try to click "Ver Detalles" (View Details)
        const viewDetailsItem = menuItems.find(async (item) => {
          const text = await item.textContent();
          return text.includes('Ver Detalles') || text.includes('View Details');
        });
        
        if (viewDetailsItem) {
          console.log('🖱️ Clicking "Ver Detalles"...');
          await viewDetailsItem.click();
          
          console.log('⏳ Waiting for details dialog...');
          await page.waitForTimeout(2000);
          
          // Check if dialog appeared
          const dialog = await page.$('.MuiDialog-root, [role="dialog"]');
          if (dialog) {
            console.log('✅ Details dialog appeared');
          } else {
            console.error('❌ Details dialog did not appear');
          }
        } else {
          console.error('❌ "Ver Detalles" menu item not found');
        }
      } else {
        console.error('❌ No menu items found after clicking action button');
      }
    } else {
      console.error('❌ No action buttons found');
    }
    
    console.log('⏳ Keeping browser open for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
})();