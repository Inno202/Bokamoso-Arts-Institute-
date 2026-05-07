import * as https from 'https';

const url = 'https://raw.githubusercontent.com/Inno202/Bokamoso-Arts-Institute-/main/public/assets/hero.jpg';

https.get(url, (response) => {
  console.log(`Status: ${response.statusCode}`);
  const chunks: any[] = [];
  response.on('data', chunk => chunks.push(chunk));
  response.on('end', () => {
    console.log(`Body length: ${Buffer.concat(chunks).length}`);
  });
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
