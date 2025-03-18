// scripts/analyse-apis.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Find all API endpoints
function findApiEndpoints() {
  const apiFiles = glob.sync('pages/api/**/*.ts');
  
  const endpoints = apiFiles.map(file => {
    const relativePath = file.replace('pages/', '/');
    const endpoint = relativePath.replace(/\.ts$/, '');
    return {
      file,
      endpoint,
      used: false
    };
  });
  
  return endpoints;
}

// Check if endpoints are called from frontend
function checkApiUsage(endpoints) {
  const frontendFiles = glob.sync('{pages,components}/**/*.{ts,tsx}');
  
  frontendFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    endpoints.forEach(endpoint => {
      if (content.includes(`fetch('${endpoint}'`) || 
          content.includes(`fetch("${endpoint}"`) || 
          content.includes(`fetch(\`${endpoint}\``) || 
          content.includes(`fetch('${endpoint}?`) || 
          content.includes(`fetch("${endpoint}?`) || 
          content.includes(`fetch(\`${endpoint}?`)) {
        endpoint.used = true;
      }
    });
  });
  
  return endpoints;
}

// Main analysis
const endpoints = findApiEndpoints();
const analyzedEndpoints = checkApiUsage(endpoints);

// Display unused endpoints
const unusedEndpoints = analyzedEndpoints.filter(endpoint => !endpoint.used);

console.log('=== UNUSED API ENDPOINTS ===');
unusedEndpoints.forEach(endpoint => {
  console.log(`${endpoint.endpoint} in ${endpoint.file}`);
});

// Stats
console.log('\n=== STATS ===');
console.log(`Total API endpoints: ${endpoints.length}`);
console.log(`Unused API endpoints: ${unusedEndpoints.length} (${Math.round(unusedEndpoints.length / endpoints.length * 100)}%)`);
