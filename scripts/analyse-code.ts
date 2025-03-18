// scripts/analyse-code.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Define directories to scan
const directories = ['pages', 'components', 'lib'];

// Extract all function definitions from lib files
function extractFunctionDefinitions() {
  const libFiles = glob.sync('lib/**/*.ts');
  const functions = [];
  
  libFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    // Match export function declarations
    const exportedFuncs = content.match(/export\s+(async\s+)?function\s+(\w+)/g) || [];
    exportedFuncs.forEach(func => {
      const nameMatch = func.match(/function\s+(\w+)/);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1];
        functions.push({
          name,
          file,
          used: false
        });
      }
    });
    
    // Match export const functionName = ...
    const exportedConsts = content.match(/export\s+const\s+(\w+)\s*=/g) || [];
    exportedConsts.forEach(func => {
      const nameMatch = func.match(/const\s+(\w+)/);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1];
        functions.push({
          name,
          file,
          used: false
        });
      }
    });
  });
  
  return functions;
}

// Check where functions are used
function checkFunctionUsage(functions) {
  const allFiles = [];
  
  directories.forEach(dir => {
    const files = glob.sync(`${dir}/**/*.{ts,tsx}`);
    allFiles.push(...files);
  });
  
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    functions.forEach(func => {
      // Skip checking the file where the function is defined
      if (file !== func.file) {
        // Look for imports of the function name
        if (content.includes(`import { ${func.name}`) || 
            content.includes(`import {${func.name}`) ||
            content.includes(`, ${func.name} }`) ||
            content.includes(`import ${func.name} `)) {
          func.used = true;
        }
        
        // Look for direct usage of the function
        if (content.includes(`${func.name}(`)) {
          func.used = true;
        }
      }
    });
  });
  
  return functions;
}

// Main analysis
const functions = extractFunctionDefinitions();
const analyzedFunctions = checkFunctionUsage(functions);

// Display unused functions
const unusedFunctions = analyzedFunctions.filter(func => !func.used);

console.log('=== UNUSED FUNCTIONS ===');
unusedFunctions.forEach(func => {
  console.log(`${func.name} in ${func.file}`);
});

// Group by file
const fileGroups = {};
unusedFunctions.forEach(func => {
  if (!fileGroups[func.file]) {
    fileGroups[func.file] = [];
  }
  fileGroups[func.file].push(func.name);
});

console.log('\n=== GROUPED BY FILE ===');
Object.entries(fileGroups).forEach(([file, funcs]) => {
  console.log(`${file}:`);
  funcs.forEach(name => console.log(`  - ${name}`));
});

// Stats
console.log('\n=== STATS ===');
console.log(`Total functions: ${functions.length}`);
console.log(`Unused functions: ${unusedFunctions.length} (${Math.round(unusedFunctions.length / functions.length * 100)}%)`);
