// scripts/analyse-pages.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Find all pages
function findPages() {
  const pageFiles = glob.sync('pages/**/*.tsx');
  
  const pages = pageFiles
    .filter(file => !file.includes('_app.tsx') && !file.includes('_document.tsx') && !file.includes('/api/'))
    .map(file => {
      const relativePath = file.replace('pages/', '/');
      const route = relativePath.replace(/\.tsx$/, '').replace('/index', '/');
      return {
        file,
        route,
        linked: false
      };
    });
  
  return pages;
}

// Check if pages are linked to
function checkPageLinks(pages) {
  const files = glob.sync('{pages,components}/**/*.{ts,tsx}');
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    pages.forEach(page => {
      // Skip if checking the page's own file
      if (page.file !== file) {
        if (content.includes(`href="${page.route}"`) || 
            content.includes(`href='${page.route}'`) || 
            content.includes(`href={\`${page.route}\``) || 
            content.includes(`router.push('${page.route}')`) ||
            content.includes(`router.push("${page.route}")`) ||
            content.includes(`router.push(\`${page.route}\``) ||
            content.includes(`window.location = '${page.route}'`) || 
            content.includes(`window.location = "${page.route}"`)) {
          page.linked = true;
        }
      }
    });
  });
  
  return pages;
}

// Main analysis
const pages = findPages();
const analyzedPages = checkPageLinks(pages);

// Display unlinked pages (excluding index)
const unlinkedPages = analyzedPages.filter(page => !page.linked && page.route !== '/');

console.log('=== UNLINKED PAGES ===');
unlinkedPages.forEach(page => {
  console.log(`${page.route} in ${page.file}`);
});

// Stats
console.log('\n=== STATS ===');
console.log(`Total pages: ${pages.length}`);
console.log(`Unlinked pages: ${unlinkedPages.length} (${Math.round(unlinkedPages.length / pages.length * 100)}%)`);
