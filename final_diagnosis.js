/**
 * Script de Diagnóstico Final - Funcionalidad de Botones en Companies
 * 
 * Este script realiza una verificación completa de:
 * 1. Permisos de usuario
 * 2. Estado de React
 * 3. Event handlers
 * 4. Funcionalidad de botones
 */

const API_BASE = 'http://localhost:3001/api';

// Función para hacer peticiones autenticadas
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
}

// Función para verificar permisos (igual que en AuthContext)
function hasPermission(user, module, action) {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    
    const userPermissions = user.permissions || {};
    const modulePermissions = userPermissions[module] || {};
    return modulePermissions[action] === true;
}

// Función principal de diagnóstico
async function runDiagnosis() {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO');
    console.log('=' .repeat(50));
    
    const results = {
        authentication: false,
        permissions: {},
        apiAccess: false,
        reactState: {},
        eventHandlers: {},
        recommendations: []
    };
    
    try {
        // 1. Verificar autenticación
        console.log('\n1️⃣ VERIFICANDO AUTENTICACIÓN...');
        const profileResponse = await authenticatedFetch(`${API_BASE}/auth/profile`);
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const user = profileData.user || profileData;
            
            results.authentication = true;
            console.log('✅ Usuario autenticado:', user.email);
            console.log('📋 Rol:', user.role);
            
            // 2. Verificar permisos específicos
            console.log('\n2️⃣ VERIFICANDO PERMISOS...');
            const permissions = {
                read: hasPermission(user, 'companies', 'read'),
                update: hasPermission(user, 'companies', 'update'),
                delete: hasPermission(user, 'companies', 'delete')
            };
            
            results.permissions = permissions;
            console.log('👁️ Permiso de lectura:', permissions.read ? '✅' : '❌');
            console.log('✏️ Permiso de edición:', permissions.update ? '✅' : '❌');
            console.log('🗑️ Permiso de eliminación:', permissions.delete ? '✅' : '❌');
            
            if (!permissions.read || !permissions.delete) {
                results.recommendations.push('⚠️ Verificar configuración de permisos en el backend');
            }
            
        } else {
            console.log('❌ Error de autenticación');
            results.recommendations.push('🔑 Verificar token de autenticación');
            return results;
        }
        
        // 3. Verificar acceso a API de empresas
        console.log('\n3️⃣ VERIFICANDO ACCESO A API...');
        const companiesResponse = await authenticatedFetch(`${API_BASE}/companies`);
        
        if (companiesResponse.ok) {
            const companiesData = await companiesResponse.json();
            const companies = companiesData.companies || [];
            
            results.apiAccess = true;
            console.log('✅ API de empresas accesible');
            console.log('📊 Empresas encontradas:', companies.length);
            
            if (companies.length > 0) {
                const testCompany = companies[0];
                console.log('🏢 Empresa de prueba:', testCompany.name);
                
                // Probar endpoint de detalles
                const detailsResponse = await authenticatedFetch(`${API_BASE}/companies/${testCompany.id}`);
                if (detailsResponse.ok) {
                    console.log('✅ Endpoint de detalles funcional');
                } else {
                    console.log('❌ Error en endpoint de detalles');
                    results.recommendations.push('🔧 Verificar endpoint de detalles de empresa');
                }
            }
        } else {
            console.log('❌ Error accediendo a API de empresas');
            results.recommendations.push('🔧 Verificar endpoint de empresas');
        }
        
        // 4. Verificar estado de React (si estamos en la página)
        console.log('\n4️⃣ VERIFICANDO ESTADO DE REACT...');
        
        // Buscar elementos React en el DOM
        const reactElements = {
            moreVertButtons: document.querySelectorAll('[data-testid="MoreVertIcon"], .MuiIconButton-root'),
            menuItems: document.querySelectorAll('[role="menuitem"]'),
            dialogs: document.querySelectorAll('[role="dialog"]')
        };
        
        results.reactState = {
            moreVertButtons: reactElements.moreVertButtons.length,
            menuItems: reactElements.menuItems.length,
            dialogs: reactElements.dialogs.length
        };
        
        console.log('🔘 Botones MoreVert encontrados:', reactElements.moreVertButtons.length);
        console.log('📋 Items de menú encontrados:', reactElements.menuItems.length);
        console.log('💬 Diálogos encontrados:', reactElements.dialogs.length);
        
        // 5. Verificar event handlers
        console.log('\n5️⃣ VERIFICANDO EVENT HANDLERS...');
        
        let handlersWorking = 0;
        let totalHandlers = 0;
        
        // Verificar botones MoreVert
        reactElements.moreVertButtons.forEach((button, index) => {
            totalHandlers++;
            const hasClickHandler = button.onclick || button.addEventListener;
            if (hasClickHandler) {
                handlersWorking++;
                console.log(`✅ Botón ${index + 1}: Event handler presente`);
            } else {
                console.log(`❌ Botón ${index + 1}: Sin event handler`);
            }
        });
        
        results.eventHandlers = {
            working: handlersWorking,
            total: totalHandlers,
            percentage: totalHandlers > 0 ? (handlersWorking / totalHandlers * 100).toFixed(1) : 0
        };
        
        if (handlersWorking < totalHandlers) {
            results.recommendations.push('🔧 Verificar vinculación de event handlers en React');
        }
        
        // 6. Simular interacciones
        console.log('\n6️⃣ SIMULANDO INTERACCIONES...');
        
        if (reactElements.moreVertButtons.length > 0) {
            const firstButton = reactElements.moreVertButtons[0];
            console.log('🖱️ Simulando click en primer botón MoreVert...');
            
            // Simular click
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            firstButton.dispatchEvent(clickEvent);
            
            // Verificar si apareció el menú
            setTimeout(() => {
                const openMenus = document.querySelectorAll('[role="menu"]');
                if (openMenus.length > 0) {
                    console.log('✅ Menú apareció después del click');
                } else {
                    console.log('❌ Menú no apareció después del click');
                    results.recommendations.push('🔧 Verificar lógica de apertura de menú');
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Error durante el diagnóstico:', error);
        results.recommendations.push('🚨 Error crítico durante el diagnóstico');
    }
    
    // 7. Resumen final
    console.log('\n' + '=' .repeat(50));
    console.log('📋 RESUMEN DEL DIAGNÓSTICO');
    console.log('=' .repeat(50));
    
    console.log('🔐 Autenticación:', results.authentication ? '✅ OK' : '❌ FALLO');
    console.log('🛡️ Permisos:', Object.values(results.permissions).every(p => p) ? '✅ OK' : '⚠️ LIMITADOS');
    console.log('🌐 API:', results.apiAccess ? '✅ OK' : '❌ FALLO');
    console.log('⚛️ React State:', results.reactState.moreVertButtons > 0 ? '✅ OK' : '⚠️ VERIFICAR');
    console.log('🎯 Event Handlers:', `${results.eventHandlers.percentage}% funcionando`);
    
    if (results.recommendations.length > 0) {
        console.log('\n💡 RECOMENDACIONES:');
        results.recommendations.forEach(rec => console.log(rec));
    } else {
        console.log('\n🎉 ¡Todo parece estar funcionando correctamente!');
    }
    
    console.log('\n🔍 Diagnóstico completado');
    return results;
}

// Función para ejecutar desde la consola del navegador
function startDiagnosis() {
    console.clear();
    return runDiagnosis();
}

// Auto-ejecutar si estamos en el contexto correcto
if (typeof window !== 'undefined' && window.location) {
    console.log('🚀 Script de diagnóstico cargado. Ejecuta startDiagnosis() para comenzar.');
} else {
    // Ejecutar directamente si estamos en Node.js
    runDiagnosis();
}