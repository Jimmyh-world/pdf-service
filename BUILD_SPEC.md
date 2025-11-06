# Mundus PDF Service - Build Specification

**Date:** 2025-11-06
**Target Machine:** Beast
**Orchestrator:** Chromebook
**Priority:** High - Required for Mundus digest email workflow

---

## Service Overview

**Purpose:** PDF generation microservice for Mundus multi-article digests

**Architecture:**
- Standalone Node.js Express service
- Runs Puppeteer for HTML→PDF conversion
- Uploads PDFs to Supabase Storage
- Returns public PDF URLs

**Why Beast?**
- Puppeteer requires Chrome/Chromium (heavy)
- Blocked in Supabase Edge Functions (Deno sandbox)
- Beast handles heavy processing tasks

---

## Build Instructions for Beast

### 1. Clone from GitHub

```bash
cd /home/jimmyb
git clone git@github.com:Jimmyh-world/pdf-service.git
cd pdf-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env` file:

```env
PORT=3002
SUPABASE_URL=https://kaompjtxgizeswuumzil.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthb21wanR4Z2l6ZXN3dXVtemlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg4NTQ1MywiZXhwIjoyMDc0NDYxNDUzfQ.h3vAVZLzno1cycdRRAouQ4jk3S1IqoyNbhxymzv9wtc
NODE_ENV=production
```

### 4. Docker Build & Run

```bash
docker build -t mundus-pdf-service .

docker run -d \
  --name mundus-pdf \
  --restart unless-stopped \
  --network mundus-network \
  -p 3002:3002 \
  --env-file .env \
  mundus-pdf-service
```

### 5. Validation

**Health check:**
```bash
curl http://localhost:3002/health
# Expected: {"status": "healthy", "service": "mundus-pdf-service"}
```

**Test PDF generation:**
```bash
curl -X POST http://localhost:3002/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Test</h1>", "filename": "test.pdf"}'
# Expected: {"success": true, "pdf_url": "https://..."}
```

---

## Integration Points

**Mundus backend will call:**
- Internal: `http://mundus-pdf:3002/generate-pdf`
- External: `http://localhost:3002/generate-pdf`

**Workflow:**
1. User approves digest in frontend
2. Frontend calls `/api/v2/digest/send`
3. Backend calls Beast PDF service with HTML
4. PDF service generates PDF, uploads to Supabase Storage
5. Returns `pdf_url` to backend
6. Backend saves URL to database
7. Backend sends email with PDF attached

---

## Files to Create

All files are in this BUILD_SPEC for Beast to implement:

1. `server.mjs` - Express server (see below)
2. `Dockerfile` - Docker config (see below)
3. `.dockerignore` - Build exclusions
4. `package.json` - Already exists
5. `.env.example` - Template for environment variables

---

## server.mjs

```javascript
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

    // Upload to Supabase Storage
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const storagePath = `digests/${filename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mundus-digests')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mundus-digests')
      .getPublicUrl(storagePath);

    console.log(`[PDF] Uploaded to: ${urlData.publicUrl}`);

    res.json({
      success: true,
      pdf_url: urlData.publicUrl,
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
```

---

## Dockerfile

```dockerfile
FROM node:20-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
```

---

## .dockerignore

```
node_modules
.env
.git
*.md
*.log
```

---

## .env.example

```env
PORT=3002
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

---

**Status:** SPEC COMPLETE - Ready for GitHub push and Beast execution
