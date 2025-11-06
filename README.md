# Mundus PDF Service

PDF generation microservice for Mundus multi-article digests.

## Purpose

Converts HTML digest reports to PDF files and returns base64-encoded data for database storage.

## API

### Health Check
```bash
GET /health
```
Response:
```json
{"status":"healthy","service":"mundus-pdf-service"}
```

### Generate PDF
```bash
POST /generate-pdf
Content-Type: application/json

{
  "html": "<h1>Article Title</h1><p>Content here...</p>",
  "filename": "digest-2025-11-06.pdf"
}
```

Response:
```json
{
  "success": true,
  "pdf_base64": "JVBERi0xLjQKJeLjz9MNCjEgMCBvYmo...",
  "filename": "digest-2025-11-06.pdf",
  "size": 12500
}
```

## Deployment

See `BUILD_SPEC.md` for complete build and deployment instructions.

## Technology

- Node.js + Express
- Puppeteer (HTML to PDF conversion)
- Docker (containerized deployment on Beast)

## Target Machine

Beast (192.168.68.100) - Heavy processing server with Chromium

## Public Access

- Local: `http://localhost:3002`
- Network: `http://192.168.68.100:3002`
- Public: `https://pdf.mundus.web3studio.dev` (via Cloudflare Tunnel)
