const fs = require('fs');

// Leer el archivo
let content = fs.readFileSync('routes/maintenance.js', 'utf8');

// Reemplazar todas las referencias
content = content.replace(/require\('\.\.\/models\/Company'\)/g, 'Company');
content = content.replace(/require\('\.\.\/models\/Branch'\)/g, 'Branch');
content = content.replace(/require\('\.\.\/models\/User'\)/g, 'User');
content = content.replace(/require\('\.\.\/models\/Vehicle'\)/g, 'Vehicle');
content = content.replace(/require\('\.\.\/models\/Maintenance'\)/g, 'Maintenance');

// Escribir el archivo corregido
fs.writeFileSync('routes/maintenance.js', content);

console.log('✅ Archivo maintenance.js corregido');