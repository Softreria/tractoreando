// Script de diagnóstico en vivo para la página de Companies
// Ejecutar en la consola del navegador mientras se está en la página de empresas

console.log('🔍 Iniciando diagnóstico en vivo de la página de Companies...');

// Función para encontrar elementos React
function findReactComponent(element) {
  for (let key in element) {
    if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
      return element[key];
    }
  }
  return null;
}

// Función para obtener props de React
function getReactProps(element) {
  const fiber = findReactComponent(element);
  return fiber?.memoizedProps || fiber?.pendingProps || {};
}

// 1. Verificar si la página está cargada correctamente
function checkPageLoad() {
  console.log('\n📄 Verificando carga de la página...');
  
  const title = document.querySelector('h4');
  if (title && title.textContent.includes('Gestión de Empresas')) {
    console.log('✅ Página de empresas cargada correctamente');
    return true;
  } else {
    console.log('❌ No se encontró el título de la página de empresas');
    return false;
  }
}

// 2. Verificar tabla y datos
function checkTableData() {
  console.log('\n📊 Verificando datos de la tabla...');
  
  const tableRows = document.querySelectorAll('tbody tr');
  console.log(`Filas encontradas en la tabla: ${tableRows.length}`);
  
  if (tableRows.length === 0) {
    console.log('⚠️ No hay datos en la tabla');
    return false;
  }
  
  // Verificar botones de acción en cada fila
  tableRows.forEach((row, index) => {
    const actionButton = row.querySelector('button[aria-label="more"], button[aria-haspopup="true"]');
    const statusSwitch = row.querySelector('input[type="checkbox"]');
    
    console.log(`Fila ${index + 1}:`);
    console.log(`  - Botón de acciones: ${actionButton ? '✅ Encontrado' : '❌ No encontrado'}`);
    console.log(`  - Switch de estado: ${statusSwitch ? '✅ Encontrado' : '❌ No encontrado'}`);
    
    if (actionButton) {
      const props = getReactProps(actionButton);
      console.log(`  - Props del botón:`, props);
    }
  });
  
  return tableRows.length > 0;
}

// 3. Simular click en botón de acciones
function testActionButton() {
  console.log('\n🖱️ Probando botón de acciones...');
  
  const firstActionButton = document.querySelector('tbody tr button[aria-haspopup="true"]');
  if (!firstActionButton) {
    console.log('❌ No se encontró botón de acciones');
    return false;
  }
  
  console.log('✅ Botón de acciones encontrado, simulando click...');
  
  // Simular evento de click
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  firstActionButton.dispatchEvent(clickEvent);
  
  // Verificar si apareció el menú
  setTimeout(() => {
    const menu = document.querySelector('[role="menu"], .MuiMenu-root');
    if (menu) {
      console.log('✅ Menú de acciones apareció correctamente');
      
      // Verificar opciones del menú
      const menuItems = menu.querySelectorAll('[role="menuitem"], .MuiMenuItem-root');
      console.log(`Opciones del menú encontradas: ${menuItems.length}`);
      
      menuItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.textContent.trim()}`);
      });
      
      // Probar click en "Ver Detalles"
      const viewDetailsItem = Array.from(menuItems).find(item => 
        item.textContent.includes('Ver Detalles') || item.textContent.includes('Detalles')
      );
      
      if (viewDetailsItem) {
        console.log('🔍 Probando "Ver Detalles"...');
        viewDetailsItem.click();
        
        setTimeout(() => {
          const detailsDialog = document.querySelector('[role="dialog"]');
          if (detailsDialog && detailsDialog.textContent.includes('Detalles de')) {
            console.log('✅ Diálogo de detalles abierto correctamente');
            
            // Cerrar diálogo
            const closeButton = detailsDialog.querySelector('button');
            if (closeButton && closeButton.textContent.includes('Cerrar')) {
              closeButton.click();
            }
          } else {
            console.log('❌ Diálogo de detalles no apareció');
          }
        }, 500);
      }
      
    } else {
      console.log('❌ Menú de acciones no apareció');
    }
  }, 300);
  
  return true;
}

// 4. Probar switch de estado
function testStatusSwitch() {
  console.log('\n🔄 Probando switch de estado...');
  
  const firstSwitch = document.querySelector('tbody tr input[type="checkbox"]');
  if (!firstSwitch) {
    console.log('❌ No se encontró switch de estado');
    return false;
  }
  
  console.log('✅ Switch de estado encontrado');
  console.log(`Estado actual: ${firstSwitch.checked ? 'Activo' : 'Inactivo'}`);
  
  const originalState = firstSwitch.checked;
  
  // Simular click
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  firstSwitch.dispatchEvent(clickEvent);
  
  setTimeout(() => {
    console.log(`Nuevo estado: ${firstSwitch.checked ? 'Activo' : 'Inactivo'}`);
    if (firstSwitch.checked !== originalState) {
      console.log('✅ Switch cambió de estado');
    } else {
      console.log('❌ Switch no cambió de estado');
    }
  }, 100);
  
  return true;
}

// 5. Verificar errores en consola
function checkConsoleErrors() {
  console.log('\n🚨 Verificando errores en consola...');
  
  // Interceptar errores
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    if (errors.length > 0) {
      console.log('❌ Errores encontrados:');
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No se encontraron errores nuevos');
    }
  }, 2000);
}

// 6. Verificar estado de React (si es accesible)
function checkReactState() {
  console.log('\n⚛️ Verificando estado de React...');
  
  // Intentar acceder al estado de React a través del DOM
  const appRoot = document.querySelector('#root');
  if (appRoot) {
    const fiber = findReactComponent(appRoot);
    if (fiber) {
      console.log('✅ Componente React encontrado');
      // Nota: El estado interno no es fácilmente accesible desde aquí
      console.log('ℹ️ Para verificar el estado interno, usar React DevTools');
    } else {
      console.log('❌ No se pudo acceder al componente React');
    }
  }
}

// Función principal de diagnóstico
function runDiagnosis() {
  console.log('🚀 Ejecutando diagnóstico completo...');
  
  if (!checkPageLoad()) {
    console.log('❌ Diagnóstico abortado: página no cargada correctamente');
    return;
  }
  
  checkTableData();
  checkConsoleErrors();
  checkReactState();
  
  // Esperar un poco antes de probar interacciones
  setTimeout(() => {
    testStatusSwitch();
    
    setTimeout(() => {
      testActionButton();
    }, 1000);
  }, 500);
}

// Ejecutar diagnóstico
runDiagnosis();

// Exportar funciones para uso manual
window.companiesDiagnosis = {
  runDiagnosis,
  checkPageLoad,
  checkTableData,
  testActionButton,
  testStatusSwitch,
  checkConsoleErrors,
  checkReactState
};

console.log('\n📋 Funciones disponibles:');
console.log('- companiesDiagnosis.runDiagnosis() - Ejecutar diagnóstico completo');
console.log('- companiesDiagnosis.testActionButton() - Probar botón de acciones');
console.log('- companiesDiagnosis.testStatusSwitch() - Probar switch de estado');
console.log('- companiesDiagnosis.checkTableData() - Verificar datos de tabla');