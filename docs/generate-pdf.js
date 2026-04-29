const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Load the HTML file
  const htmlPath = path.resolve(__dirname, 'brochure-comercial.html');
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle0'
  });
  
  // Generate PDF
  await page.pdf({
    path: 'brochure-comercial.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  
  console.log('PDF generated: brochure-comercial.pdf');
  
  await browser.close();
})();
