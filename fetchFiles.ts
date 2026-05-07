import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const files = [
  'hero.jpg',
  'philosophy.jpg',
  'logo.jpeg',
  'community/community-1.jpg',
  'community/community-2.jpg',
  'community/community-3.jpg'
];

const baseUrl = 'https://raw.githubusercontent.com/Inno202/Bokamoso-Arts-Institute-/main/public/assets/';
const targetDir = path.join(process.cwd(), 'public', 'assets');

files.forEach(file => {
  const url = baseUrl + file;
  const targetPath = path.join(targetDir, file);
  
  // Create dir if needed
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  https.get(url, (response) => {
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(targetPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
      });
    } else {
      console.log(`Failed to download ${file} - Status: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});
