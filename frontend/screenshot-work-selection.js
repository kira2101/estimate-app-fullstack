import { chromium } from 'playwright';

async function takeWorkSelectionScreenshot() {
  console.log('📸 Создание скриншота экрана выбора работ...');
  
  const browser = await chromium.launch({ 
    headless: true
  });
  
  const context = await browser.newContext({
    // Эмуляция мобильного устройства
    viewport: { width: 375, height: 812 }, // iPhone X размер
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    // 1. Переход на главную страницу
    console.log('📱 Открываем http://localhost:5173');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // 2. Авторизация как прораб
    const loginForm = await page.locator('form').first();
    if (await loginForm.count() > 0) {
      console.log('🔑 Авторизуемся как прораб...');
      
      await page.fill('input[type="email"]', 'foreman@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(3000);
    }
    
    // 3. Переходим к проекту
    console.log('🏗️ Выбираем проект...');
    const projectCards = await page.locator('.project-card, .mobile-card').all();
    
    if (projectCards.length > 0) {
      await projectCards[0].click();
      await page.waitForTimeout(2000);
      
      // 4. Выбираем существующую смету для редактирования
      console.log('📊 Выбираем смету для редактирования...');
      const estimateCards = await page.locator('.estimate-card, .mobile-list-item').all();
      
      if (estimateCards.length > 0) {
        await estimateCards[0].click();
        await page.waitForTimeout(2000);
        
        // 5. Нажимаем "Редактировать работы"
        console.log('🔧 Нажимаем "Редактировать работы"...');
        const editWorksBtn = await page.locator('button:has-text("Редактировать работы")').first();
        
        if (await editWorksBtn.count() > 0) {
          await editWorksBtn.click();
          await page.waitForTimeout(2000);
          
          // 6. Выбираем категорию
          console.log('📂 Выбираем категорию работ...');
          const categoryCards = await page.locator('.category-card, .mobile-list-item').all();
          
          if (categoryCards.length > 0) {
            await categoryCards[0].click();
            await page.waitForTimeout(3000);
            
            // 7. ДЕЛАЕМ СКРИНШОТ ЭКРАНА ВЫБОРА РАБОТ
            console.log('📸 Делаем скриншот экрана выбора работ...');
            
            // Ждем полной загрузки карточек работ
            await page.waitForSelector('.work-card', { timeout: 5000 });
            await page.waitForTimeout(1000);
            
            // Создаем скриншот
            const screenshotPath = '/home/kira/PycharmProjects/Estiamate_app_Gemeni/frontend/work-selection-screenshot.png';
            await page.screenshot({ 
              path: screenshotPath,
              fullPage: true // Полная страница
            });
            
            console.log('✅ Скриншот сохранен:', screenshotPath);
            
            // Дополнительная информация о найденных элементах
            const workCards = await page.locator('.work-card').count();
            const selectedWorks = await page.locator('.work-card.selected').count();
            const checkboxes = await page.locator('.checkbox.checked').count();
            
            console.log('📊 Статистика экрана:');
            console.log('   📋 Всего карточек работ:', workCards);
            console.log('   ✅ Выбранных работ:', selectedWorks);
            console.log('   ☑️ Отмеченных чекбоксов:', checkboxes);
            
            // Создадим также скриншот только видимой области
            const viewportScreenshotPath = '/home/kira/PycharmProjects/Estiamate_app_Gemeni/frontend/work-selection-viewport.png';
            await page.screenshot({ 
              path: viewportScreenshotPath,
              fullPage: false // Только видимая область
            });
            
            console.log('✅ Скриншот viewport сохранен:', viewportScreenshotPath);
            
          } else {
            console.log('❌ Категории не найдены');
          }
        } else {
          console.log('❌ Кнопка "Редактировать работы" не найдена');
        }
      } else {
        console.log('❌ Сметы не найдены');
      }
    } else {
      console.log('❌ Проекты не найдены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при создании скриншота:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Скриншот завершен!');
  }
}

// Запуск создания скриншота
takeWorkSelectionScreenshot().catch(console.error);