const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components', 'lib'];
const fileExts = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function walkAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkAndReplace(fullPath);
    } else {
      if (fileExts.includes(path.extname(fullPath))) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content;
        
        // Custom replacements
        newContent = newContent.replace(/\bBRK Coins\b/g, 'EZBD Coins');
        newContent = newContent.replace(/\bBRK Coin\b/g, 'EZBD Coin');
        newContent = newContent.replace(/\bBRK ID\b/g, 'EZBD ID');
        newContent = newContent.replace(/\bBRK Esports\b/g, 'EZBD Esports');
        newContent = newContent.replace(/\bBRK ESPORTS\b/g, 'EZBD ESPORTS');
        newContent = newContent.replace(/\bBRK\b/g, 'EZBD');
        newContent = newContent.replace(/\bbrkesports\.com\b/g, 'esportszonebd.online');
        newContent = newContent.replace(/brkesports/g, 'ezbd');
        newContent = newContent.replace(/BlackRock Esports/g, 'EZBD Esports');
        newContent = newContent.replace(/BlackRock/g, 'EZBD');
        
        // Bangla TTS specific
        newContent = newContent.replace(/বি আর কে স্পোর্টস/g, 'ই জেড বি ডি স্পোর্টস');
        newContent = newContent.replace(/বি আর কে/g, 'ই জেড বি ডি');

        if (content !== newContent) {
          fs.writeFileSync(fullPath, newContent, 'utf8');
          console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

targetDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    walkAndReplace(fullPath);
  }
});
