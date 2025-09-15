const axios = require('axios');

// Configuración
const API_BASE = 'http://localhost:8001/api';
const FRONTEND_URL = 'http://localhost:3000';

// Credenciales a probar
const credentials = [
  { email: 'admin@tractoreando.com', password: 'Admin123!' },
  { email: 'admin@tractoreando.com', password: 'admin123' },
  { email: 'admin@tractoreando.com', password: 'admin123456' },
  { email: 'admin@tractoreando.com', password: 'Admin123' }
];

async function diagnoseLoginIssue() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMA DE LOGIN');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar conectividad del backend
    console.log('\n1️⃣ Verificando conectividad del backend...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      console.log('✅ Backend conectado:', healthResponse.status, healthResponse.data);
    } catch (error) {
      console.log('❌ Backend no responde:', error.message);
      return;
    }
    
    // 2. Probar diferentes credenciales
    console.log('\n2️⃣ Probando diferentes credenciales...');
    let workingCredentials = null;
    
    for (const cred of credentials) {
      try {
        console.log(`\n🔐 Probando: ${cred.email} / ${cred.password}`);
        
        const response = await axios.post(`${API_BASE}/auth/login`, {
          email: cred.email,
          password: cred.password
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL
          }
        });
        
        if (response.data && response.data.token) {
          console.log('✅ LOGIN EXITOSO!');
          console.log('   Token:', response.data.token.substring(0, 50) + '...');
          console.log('   Usuario:', response.data.user.firstName, response.data.user.lastName);
          console.log('   Rol:', response.data.user.role);
          console.log('   Empresa:', response.data.user.company?.name || 'Sin empresa');
          workingCredentials = cred;
          break;
        } else {
          console.log('❌ Respuesta sin token:', response.data);
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ Error ${error.response.status}:`, error.response.data?.message || error.response.data);
        } else {
          console.log('❌ Error de conexión:', error.message);
        }
      }
    }
    
    if (!workingCredentials) {
      console.log('\n❌ NINGUNA CREDENCIAL FUNCIONÓ');
      console.log('\n🔧 Posibles soluciones:');
      console.log('   1. Verificar que el usuario admin existe en la base de datos');
      console.log('   2. Resetear la contraseña del usuario admin');
      console.log('   3. Verificar que la empresa del usuario esté activa');
      return;
    }
    
    // 3. Verificar CORS
    console.log('\n3️⃣ Verificando configuración CORS...');
    try {
      const corsResponse = await axios.options(`${API_BASE}/auth/login`, {
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      console.log('✅ CORS configurado correctamente');
    } catch (error) {
      console.log('⚠️ Posible problema de CORS:', error.message);
    }
    
    // 4. Simular login desde frontend
    console.log('\n4️⃣ Simulando login desde frontend...');
    try {
      const frontendResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: workingCredentials.email,
        password: workingCredentials.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL,
          'Referer': FRONTEND_URL,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      console.log('✅ Login desde frontend simulado exitoso');
      console.log('   Status:', frontendResponse.status);
      console.log('   Headers:', Object.keys(frontendResponse.headers));
      
    } catch (error) {
      console.log('❌ Error en simulación frontend:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }
    
    // 5. Verificar usuario en base de datos
    console.log('\n5️⃣ Verificando usuario en base de datos...');
    try {
      const token = await getValidToken(workingCredentials);
      if (token) {
        const userResponse = await axios.get(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': FRONTEND_URL
          }
        });
        
        console.log('✅ Usuario verificado:');
        console.log('   ID:', userResponse.data.id);
        console.log('   Email:', userResponse.data.email);
        console.log('   Activo:', userResponse.data.isActive);
        console.log('   Empresa ID:', userResponse.data.companyId);
        console.log('   Empresa activa:', userResponse.data.company?.isActive);
        
        if (!userResponse.data.isActive) {
          console.log('⚠️ PROBLEMA: Usuario inactivo');
        }
        if (!userResponse.data.company?.isActive) {
          console.log('⚠️ PROBLEMA: Empresa inactiva');
        }
      }
    } catch (error) {
      console.log('❌ Error verificando usuario:', error.message);
    }
    
    // 6. Resumen y recomendaciones
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMEN DEL DIAGNÓSTICO');
    console.log('='.repeat(50));
    console.log('✅ Backend funcionando correctamente');
    console.log(`✅ Credenciales válidas: ${workingCredentials.email} / ${workingCredentials.password}`);
    console.log('✅ API de login respondiendo correctamente');
    
    console.log('\n🎯 RECOMENDACIONES PARA EL USUARIO:');
    console.log(`   1. Usar exactamente estas credenciales: ${workingCredentials.email} / ${workingCredentials.password}`);
    console.log('   2. Verificar que no hay espacios extra en email o contraseña');
    console.log('   3. Limpiar caché del navegador (Cmd+Shift+R en Mac)');
    console.log('   4. Verificar que está accediendo a http://localhost:3000');
    console.log('   5. Abrir herramientas de desarrollador (F12) y revisar errores en consola');
    
  } catch (error) {
    console.log('❌ Error general en diagnóstico:', error.message);
  }
}

async function getValidToken(credentials) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    return null;
  }
}

// Ejecutar diagnóstico
diagnoseLoginIssue().then(() => {
  console.log('\n🏁 Diagnóstico completado');
}).catch(error => {
  console.log('❌ Error ejecutando diagnóstico:', error.message);
});