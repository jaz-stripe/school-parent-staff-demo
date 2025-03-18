// scripts/analyse-components.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Find all components
function findComponents() {
  const componentFiles = glob.sync('components/**/*.tsx');
  
  const components = componentFiles.map(file => {
    const basename = path.basename(file, '.tsx');
    return {
      file,
      name: basename,
      used: false
    };
  });
  
  return components;
}

// Check if components are used
function checkComponentUsage(components) {
  const files = glob.sync('{pages,components}/**/*.{ts,tsx}');
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    components.forEach(component => {
      // Skip if checking the component's own file
      if (component.file !== file) {
        if (content.includes(`import ${component.name}`) || 
            content.includes(`<${component.name} `) || 
            content.includes(`<${component.name}>`)) {
          component.used = true;
        }
      }
    });
  });
  
  return components;
}

// Main analysis
const components = findComponents();
const analyzedComponents = checkComponentUsage(components);

// Display unused components
const unusedComponents = analyzedComponents.filter(component => !component.used);

console.log('=== UNUSED COMPONENTS ===');
unusedComponents.forEach(component => {
  console.log(`${component.name} in ${component.file}`);
});

// Stats
console.log('\n=== STATS ===');
console.log(`Total components: ${components.length}`);
console.log(`Unused components: ${unusedComponents.length} (${Math.round(unusedComponents.length / components.length * 100)}%)`);
