// Script para debuggear event handlers en el DOM de React
// Este script se ejecuta en la consola del navegador

const debugDOMHandlers = () => {
  console.log('🔍 Iniciando debug de event handlers en el DOM...');
  
  // Función para encontrar elementos React
  const findReactComponent = (element) => {
    for (let key in element) {
      if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
        return element[key];
      }
    }
    return null;
  };
  
  // Función para obtener props de un elemento React
  const getReactProps = (element) => {
    const reactComponent = findReactComponent(element);
    if (reactComponent) {
      return reactComponent.memoizedProps || reactComponent.pendingProps;
    }
    return null;
  };
  
  // 1. Buscar botones MoreVert (menú de acciones)
  console.log('\n📋 Buscando botones de menú (MoreVert)...');
  const moreVertButtons = document.querySelectorAll('[data-testid="MoreVertIcon"], .MuiSvgIcon-root');
  
  console.log(`Encontrados ${moreVertButtons.length} iconos SVG`);
  
  moreVertButtons.forEach((icon, index) => {
    const button = icon.closest('button');
    if (button) {
      console.log(`\n🔘 Botón ${index + 1}:`);
      console.log('  - Elemento:', button);
      console.log('  - Clases:', button.className);
      console.log('  - Disabled:', button.disabled);
      
      // Verificar event listeners
      const listeners = getEventListeners ? getEventListeners(button) : 'getEventListeners no disponible';
      console.log('  - Event listeners:', listeners);
      
      // Verificar props de React
      const props = getReactProps(button);
      if (props) {
        console.log('  - React props:', {
          onClick: typeof props.onClick,
          disabled: props.disabled,
          'aria-label': props['aria-label']
        });
      }
      
      // Simular click para verificar
      console.log('  - Simulando click...');
      try {
        button.click();
        console.log('  - ✅ Click ejecutado sin errores');
      } catch (error) {
        console.log('  - ❌ Error en click:', error.message);
      }
    }
  });
  
  // 2. Buscar menús desplegables (Menu de Material-UI)
  console.log('\n📋 Buscando menús desplegables...');
  const menus = document.querySelectorAll('[role="menu"], .MuiMenu-root, .MuiPopover-root');
  
  console.log(`Encontrados ${menus.length} menús`);
  
  menus.forEach((menu, index) => {
    console.log(`\n📋 Menú ${index + 1}:`);
    console.log('  - Elemento:', menu);
    console.log('  - Visible:', !menu.hidden && menu.style.display !== 'none');
    
    // Buscar items del menú
    const menuItems = menu.querySelectorAll('[role="menuitem"], .MuiMenuItem-root');
    console.log(`  - Items encontrados: ${menuItems.length}`);
    
    menuItems.forEach((item, itemIndex) => {
      console.log(`    📄 Item ${itemIndex + 1}:`);
      console.log('      - Texto:', item.textContent.trim());
      console.log('      - Clases:', item.className);
      
      // Verificar event listeners
      const listeners = getEventListeners ? getEventListeners(item) : 'getEventListeners no disponible';
      console.log('      - Event listeners:', listeners);
      
      // Verificar props de React
      const props = getReactProps(item);
      if (props) {
        console.log('      - React props:', {
          onClick: typeof props.onClick,
          disabled: props.disabled
        });
      }
    });
  });
  
  // 3. Buscar diálogos (modales)
  console.log('\n🗂️ Buscando diálogos/modales...');
  const dialogs = document.querySelectorAll('[role="dialog"], .MuiDialog-root');
  
  console.log(`Encontrados ${dialogs.length} diálogos`);
  
  dialogs.forEach((dialog, index) => {
    console.log(`\n🗂️ Diálogo ${index + 1}:`);
    console.log('  - Elemento:', dialog);
    console.log('  - Visible:', !dialog.hidden && dialog.style.display !== 'none');
    console.log('  - Aria-hidden:', dialog.getAttribute('aria-hidden'));
    
    // Buscar botones en el diálogo
    const dialogButtons = dialog.querySelectorAll('button');
    console.log(`  - Botones encontrados: ${dialogButtons.length}`);
    
    dialogButtons.forEach((button, buttonIndex) => {
      console.log(`    🔘 Botón ${buttonIndex + 1}:`);
      console.log('      - Texto:', button.textContent.trim());
      console.log('      - Tipo:', button.type);
      console.log('      - Disabled:', button.disabled);
      
      const props = getReactProps(button);
      if (props) {
        console.log('      - React props:', {
          onClick: typeof props.onClick,
          type: props.type,
          variant: props.variant
        });
      }
    });
  });
  
  // 4. Verificar estado global de React (si está disponible)
  console.log('\n🔧 Verificando estado de React...');
  
  // Intentar encontrar el componente raíz de React
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const reactRoot = findReactComponent(rootElement);
    if (reactRoot) {
      console.log('✅ Componente raíz de React encontrado');
      
      // Intentar acceder al contexto de autenticación
      try {
        const fiber = reactRoot;
        let currentFiber = fiber;
        let authContext = null;
        
        // Buscar el contexto de autenticación en el árbol de componentes
        while (currentFiber && !authContext) {
          if (currentFiber.memoizedState) {
            console.log('Estado encontrado en componente:', currentFiber.type?.name || 'Anónimo');
          }
          currentFiber = currentFiber.child || currentFiber.sibling || currentFiber.return;
        }
      } catch (error) {
        console.log('❌ Error accediendo al estado de React:', error.message);
      }
    } else {
      console.log('❌ No se pudo encontrar el componente raíz de React');
    }
  }
  
  // 5. Verificar errores en la consola
  console.log('\n🚨 Verificando errores en la consola...');
  
  // Interceptar errores futuros
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    console.log('🚨 ERROR DETECTADO:', ...args);
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    console.log('⚠️ WARNING DETECTADO:', ...args);
    originalWarn.apply(console, args);
  };
  
  console.log('✅ Debug de event handlers completado');
  console.log('\n📋 Resumen:');
  console.log(`  - Iconos SVG encontrados: ${moreVertButtons.length}`);
  console.log(`  - Menús encontrados: ${menus.length}`);
  console.log(`  - Diálogos encontrados: ${dialogs.length}`);
  console.log('\n💡 Para usar este script:');
  console.log('  1. Abre la aplicación en el navegador');
  console.log('  2. Ve a la página de empresas');
  console.log('  3. Abre la consola del navegador (F12)');
  console.log('  4. Pega este código y ejecuta debugDOMHandlers()');
};

// Exportar para uso en consola
if (typeof window !== 'undefined') {
  window.debugDOMHandlers = debugDOMHandlers;
}

// Auto-ejecutar si se carga como script
if (typeof document !== 'undefined' && document.readyState === 'complete') {
  debugDOMHandlers();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', debugDOMHandlers);
}

console.log('🔧 Script de debug cargado. Ejecuta debugDOMHandlers() para iniciar el análisis.');