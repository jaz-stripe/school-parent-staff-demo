// scripts/analyse-css.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Extract CSS classes from style files
function extractCSSClasses() {
  const styleFiles = glob.sync('styles/**/*.css');
  const classes = [];
  
  styleFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const module = path.basename(file, '.module.css');
    
    // Match class selectors (simplified, doesn't handle all CSS cases)
    const matches = content.match(/\.([\w-]+)\s*[,{]/g) || [];
    
    matches.forEach(match => {
      const classMatch = match.match(/\.([\w-]+)/);
      if (classMatch && classMatch[1]) {
        const className = classMatch[1];
        classes.push({
          file,
          module,
          className,
          used: false
        });
      }
    });
  });
  
  return classes;
}

// Check if CSS classes are used
function checkCSSUsage(classes) {
  const files = glob.sync('{pages,components}/**/*.{ts,tsx}');
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    classes.forEach(cls => {
      if (content.includes(`styles.${cls.className}`) || 
          content.includes(`className="${cls.className}"`) || 
          content.includes(`className='${cls.className}'`) ||
          content.includes(`\`${cls.className}\``)) {
        cls.used = true;
      }
    });
  });
  
  return classes;
}

// Main analysis
const classes = extractCSSClasses();
const analyzedClasses = checkCSSUsage(classes);

// Display unused classes
const unusedClasses = analyzedClasses.filter(cls => !cls.used);

console.log('=== UNUSED CSS CLASSES ===');
unusedClasses.forEach(cls => {
  console.log(`${cls.className} in ${cls.file}`);
});

// Group by file
const fileGroups = {};
unusedClasses.forEach(cls => {
  if (!fileGroups[cls.file]) {
    fileGroups[cls.file] = [];
  }
  fileGroups[cls.file].push(cls.className);
});

console.log('\n=== GROUPED BY FILE ===');
Object.entries(fileGroups).forEach(([file, classes]) => {
  console.log(`${file}:`);
  classes.forEach(name => console.log(`  - ${name}`));
});

// Stats
console.log('\n=== STATS ===');
console.log(`Total CSS classes: ${classes.length}`);
console.log(`Unused CSS classes: ${unusedClasses.length} (${Math.round(unusedClasses.length / classes.length * 100)}%)`);
