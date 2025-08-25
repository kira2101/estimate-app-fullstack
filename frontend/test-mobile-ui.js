import { chromium } from 'playwright';

async function testMobileUI() {
  console.log('🚀 Запуск тестирования мобильного интерфейса...');
  
  const browser = await chromium.launch({ 
    headless: true, // Headless режим для серверной среды
    slowMo: 100 // Минимальное замедление для стабильности
  });
  
  const context = await browser.newContext({
    // Эмуляция мобильного устройства
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    // 1. Переход на главную страницу
    console.log('📱 Открываем http://localhost:5173');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // 2. Проверяем, что мобильный интерфейс активен
    const isMobileActive = await page.locator('.mobile-app').count() > 0;
    console.log('📱 Мобильный интерфейс активен:', isMobileActive);
    
    if (!isMobileActive) {
      console.log('❌ Мобильный интерфейс не активирован, возможно нужно авторизоваться как прораб');
      
      // Попробуем найти форму авторизации
      const loginForm = await page.locator('form').first();
      if (await loginForm.count() > 0) {
        console.log('🔑 Найдена форма авторизации, пытаемся войти как прораб...');
        
        await page.fill('input[type="email"]', 'foreman@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(3000);
        
        // Проверяем снова после авторизации
        const isMobileActiveAfterLogin = await page.locator('.mobile-app').count() > 0;
        console.log('📱 Мобильный интерфейс после авторизации:', isMobileActiveAfterLogin);
      }
    }
    
    // 3. Ищем проекты и переходим к существующему проекту
    console.log('🏗️ Ищем проекты...');
    const projectCards = await page.locator('.project-card, .mobile-card').all();
    console.log('📋 Найдено проектов:', projectCards.length);
    
    if (projectCards.length > 0) {
      console.log('▶️ Переходим к первому проекту');
      await projectCards[0].click();
      await page.waitForTimeout(2000);
      
      // 4. Ищем существующую смету для редактирования
      console.log('📊 Ищем сметы для редактирования...');
      const estimateCards = await page.locator('.estimate-card, .mobile-list-item').all();
      console.log('📋 Найдено смет:', estimateCards.length);
      
      if (estimateCards.length > 0) {
        // Нажимаем на первую смету для редактирования
        await estimateCards[0].click();
        await page.waitForTimeout(2000);
        
        // 5. Ищем кнопку "Редактировать работы" или "Редактировать"
        console.log('🔧 Ищем кнопку редактирования работ...');
        const addWorksBtn = await page.locator('button:has-text("Редактировать работы"), button:has-text("Редактировать")').first();
        
        if (await addWorksBtn.count() > 0) {
          await addWorksBtn.click();
          await page.waitForTimeout(2000);
          
          // 6. Переходим к категориям и выбираем первую
          console.log('📂 Выбираем категорию работ...');
          const categoryCards = await page.locator('.category-card, .mobile-list-item').all();
          
          if (categoryCards.length > 0) {
            await categoryCards[0].click();
            await page.waitForTimeout(2000);
            
            // 7. ТЕСТИРУЕМ ОСНОВНУЮ ФУНКЦИОНАЛЬНОСТЬ: работа с чекбоксами
            console.log('🎯 ТЕСТИРУЕМ: Функциональность чекбоксов работ');
            
            const workCards = await page.locator('.work-card').all();
            console.log('📋 Найдено карточек работ:', workCards.length);
            
            if (workCards.length > 0) {
              // Проверяем первую работу
              const firstWorkCard = workCards[0];
              const workName = await firstWorkCard.locator('.work-card-title, .work-name').first().textContent();
              console.log('🔍 Тестируем работу:', workName?.trim());
              
              const checkbox = firstWorkCard.locator('.work-card-checkbox .checkbox').first();
              const isInitiallySelected = await checkbox.evaluate(el => el.classList.contains('checked'));
              console.log('✅ Изначально выбрана:', isInitiallySelected);
              
              if (isInitiallySelected) {
                console.log('🔄 Снимаем чекбокс (тестируем удаление)...');
                await checkbox.click();
                await page.waitForTimeout(1000);
                
                const isDeselected = await checkbox.evaluate(el => !el.classList.contains('checked'));
                console.log('❌ Чекбокс снят:', isDeselected);
                
                if (isDeselected) {
                  console.log('✅ ТЕСТ ПРОЙДЕН: Функция удаления работы через чекбокс работает!');
                  
                  // Проверяем, что работа удалена из navigation context
                  console.log('🔄 Устанавливаем чекбокс обратно...');
                  await checkbox.click();
                  await page.waitForTimeout(1000);
                  
                  const isReselected = await checkbox.evaluate(el => el.classList.contains('checked'));
                  console.log('✅ Чекбокс установлен обратно:', isReselected);
                }
              } else {
                console.log('🔄 Устанавливаем чекбокс (тестируем добавление)...');
                await checkbox.click();
                await page.waitForTimeout(1000);
                
                const isSelected = await checkbox.evaluate(el => el.classList.contains('checked'));
                console.log('✅ Чекбокс установлен:', isSelected);
                
                if (isSelected) {
                  console.log('✅ ТЕСТ ПРОЙДЕН: Функция добавления работы через чекбокс работает!');
                }
              }
              
              // Проверяем несколько работ
              console.log('🔍 Тестируем дополнительные работы...');
              for (let i = 1; i < Math.min(workCards.length, 3); i++) {
                const workCard = workCards[i];
                const workTitle = await workCard.locator('.work-card-title, .work-name').first().textContent();
                const cardCheckbox = workCard.locator('.work-card-checkbox .checkbox').first();
                
                console.log(`📋 Тестируем работу ${i + 1}: ${workTitle?.trim()}`);
                
                const wasSelected = await cardCheckbox.evaluate(el => el.classList.contains('checked'));
                await cardCheckbox.click();
                await page.waitForTimeout(500);
                
                const isNowSelected = await cardCheckbox.evaluate(el => el.classList.contains('checked'));
                const testResult = wasSelected !== isNowSelected;
                
                console.log(`${testResult ? '✅' : '❌'} Переключение работы ${i + 1}: ${wasSelected ? 'снят' : 'установлен'} → ${isNowSelected ? 'установлен' : 'снят'}`);
              }
            }
          }
        }
      }
    }
    
    console.log('✅ Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    await browser.close();
  }
}

// Запуск теста
testMobileUI().catch(console.error);