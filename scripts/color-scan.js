/**
 * Script to scan for hard-coded colors and Tailwind-like utility classes
 * 
 * This script helps identify CSS files with hard-coded color values that should be
 * migrated to CSS variables for better dark mode support and consistency.
 * 
 * Usage: node color-scan.js [directory]
 * If no directory provided, scans current directory recursively.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Patterns to match
const COLOR_PATTERNS = [
  // HEX colors
  /#[0-9a-fA-F]{3,8}\b/g,
  
  // RGB/RGBA colors
  /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[0-9.]+\s*)?\)/g,
  
  // HSL/HSLA colors
  /hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[0-9.]+\s*)?\)/g,
  
  // Named colors
  /\b(white|black|red|green|blue|yellow|purple|orange|pink|brown|gray|grey)\b/gi
];

// Tailwind-like utility classes
const TAILWIND_PATTERNS = [
  /\b(bg|text|border|shadow)-[a-z]+-[0-9]+\b/g,
  /\b(text|bg)-(white|black|red|green|blue|yellow|purple|orange|pink|brown|gray|grey)\b/g
];

// Extensions to check
const EXTENSIONS = ['.css', '.scss', '.js', '.jsx', '.tsx', '.ts'];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git'];

async function scanFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const results = { file: filePath, matches: [] };
  
  // Check for color patterns
  COLOR_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        results.matches.push({
          type: 'color',
          value: match,
          count: (content.match(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        });
      });
    }
  });
  
  // Check for Tailwind-like utility classes
  TAILWIND_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        results.matches.push({
          type: 'utility',
          value: match,
          count: (content.match(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        });
      });
    }
  });
  
  // Remove duplicates
  results.matches = results.matches.filter((match, index, self) => 
    index === self.findIndex(m => m.value === match.value)
  );
  
  return results.matches.length > 0 ? results : null;
}

async function scanDirectory(dir) {
  const results = [];
  
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      try {
        const fileStat = await stat(fullPath);
        
        if (fileStat.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(file)) {
            const dirResults = await scanDirectory(fullPath);
            results.push(...dirResults);
          }
        } else {
          const ext = path.extname(file).toLowerCase();
          if (EXTENSIONS.includes(ext)) {
            const fileResult = await scanFile(fullPath);
            if (fileResult) {
              results.push(fileResult);
            }
          }
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return results;
}

async function main() {
  const targetDir = process.argv[2] || '.';
  console.log(`Scanning ${targetDir} for hard-coded colors...`);
  
  try {
    const results = await scanDirectory(targetDir);
    
    // Sort by number of matches
    results.sort((a, b) => {
      const aTotal = a.matches.reduce((sum, match) => sum + match.count, 0);
      const bTotal = b.matches.reduce((sum, match) => sum + match.count, 0);
      return bTotal - aTotal;
    });
    
    console.log(`\nFound ${results.length} files with hard-coded colors:\n`);
    
    results.forEach(result => {
      console.log(`\n${result.file}`);
      console.log('-'.repeat(result.file.length));
      
      // Group by color value
      const grouped = {};
      result.matches.forEach(match => {
        if (!grouped[match.value]) {
          grouped[match.value] = {
            type: match.type,
            count: match.count
          };
        } else {
          grouped[match.value].count += match.count;
        }
      });
      
      // Sort by count
      const sorted = Object.entries(grouped).sort((a, b) => b[1].count - a[1].count);
      
      sorted.forEach(([value, { type, count }]) => {
        console.log(`  ${value} (${type}): ${count} occurrences`);
      });
    });
    
    // Summary statistics
    const totalFiles = results.length;
    const totalOccurrences = results.reduce((sum, result) => 
      sum + result.matches.reduce((s, match) => s + match.count, 0), 0);
      
    console.log(`\n=== Summary ===`);
    console.log(`Total files with hard-coded colors: ${totalFiles}`);
    console.log(`Total occurrences: ${totalOccurrences}`);
    console.log(`\nConsider replacing these with CSS variables like:`);
    console.log(`  --text: #000;               /* Light mode text */`);
    console.log(`  --surface-1: #fff;          /* Light mode background */`);
    console.log(`  --accent: #3377ff;          /* Primary accent color */`);
    console.log(`\n@media (prefers-color-scheme: dark) {`);
    console.log(`  :root {`);
    console.log(`    --text: #eee;             /* Dark mode text */`);
    console.log(`    --surface-1: #121212;     /* Dark mode background */`);
    console.log(`    /* ... other dark mode variables ... */`);
    console.log(`  }`);
    console.log(`}`);
    
  } catch (err) {
    console.error('Error during scan:', err);
  }
}

main();