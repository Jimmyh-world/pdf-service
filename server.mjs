import express from 'express';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mundus-pdf-service' });
});

// Generate PDF endpoint
app.post('/generate-pdf', async (req, res) => {
  try {
    const { html, filename = 'digest.pdf' } = req.body;

    if (!html) {
      return res.status(400).json({ success: false, error: 'HTML content required' });
    }

    console.log(`[PDF] Generating ${filename}...`);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
      printBackground: true
    });

    await browser.close();

    console.log(`[PDF] Generated ${pdfBuffer.length} bytes`);

    // Convert to base64 for database storage
    const pdfBase64 = pdfBuffer.toString('base64');

    console.log(`[PDF] Converted to base64`);

    res.json({
      success: true,
      pdf_base64: pdfBase64,
      filename,
      size: pdfBuffer.length
    });

  } catch (error) {
    console.error('[PDF] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Service listening on port ${PORT}`);
});
