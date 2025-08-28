#!/usr/bin/env node

import fs from 'fs';
import { dirname, join } from 'path';
import glob from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to process
const files = glob.sync('**/*.{ts,vue}', {
  cwd: join(__dirname, '..'),
  ignore: ['**/node_modules/**', '**/dist/**', 'utils/logger.ts', 'scripts/**']
});

let totalReplaced = 0;

files.forEach(file => {
  const filePath = join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');
  let replaced = 0;
  
  // Skip if already imports logger
  const hasLoggerImport = content.includes("from '../utils/logger'") || 
                         content.includes('from "./utils/logger"') ||
                         content.includes("from '@/utils/logger'");
  
  // Replace console statements
  const originalContent = content;
  
  // Replace console.log
  content = content.replace(/console\.log\(/g, () => {
    replaced++;
    return 'logger.log(';
  });
  
  // Replace console.error
  content = content.replace(/console\.error\(/g, () => {
    replaced++;
    return 'logger.error(';
  });
  
  // Replace console.warn
  content = content.replace(/console\.warn\(/g, () => {
    replaced++;
    return 'logger.warn(';
  });
  
  // Replace console.info
  content = content.replace(/console\.info\(/g, () => {
    replaced++;
    return 'logger.info(';
  });
  
  // Replace console.debug
  content = content.replace(/console\.debug\(/g, () => {
    replaced++;
    return 'logger.debug(';
  });
  
  if (replaced > 0) {
    // Add logger import if not present
    if (!hasLoggerImport) {
      // For Vue files
      if (file.endsWith('.vue')) {
        // Find <script> or <script setup> tag
        const scriptMatch = content.match(/<script[^>]*>/);
        if (scriptMatch) {
          const scriptTag = scriptMatch[0];
          const scriptIndex = content.indexOf(scriptTag) + scriptTag.length;
          
          // Determine relative path to logger
          const depth = file.split('/').length - 1;
          const importPath = depth === 0 ? './utils/logger' : 
                            depth === 1 ? '../utils/logger' :
                            '../'.repeat(depth) + 'utils/logger';
          
          content = content.slice(0, scriptIndex) + 
                   `\nimport { logger } from '${importPath}';` +
                   content.slice(scriptIndex);
        }
      }
      // For TS files
      else if (file.endsWith('.ts')) {
        // Add import at the beginning
        const depth = file.split('/').length - 1;
        const importPath = depth === 0 ? './utils/logger' : 
                          depth === 1 ? '../utils/logger' :
                          '../'.repeat(depth) + 'utils/logger';
        
        content = `import { logger } from '${importPath}';\n` + content;
      }
    }
    
    // Write back
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${file}: Replaced ${replaced} console statements`);
    totalReplaced += replaced;
  }
});

console.log(`\n✅ Total replaced: ${totalReplaced} console statements`);