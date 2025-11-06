# Mundus PDF Service

PDF generation microservice for Mundus multi-article digests.

## Purpose

Converts HTML digest reports to PDF files and uploads them to Supabase Storage.

## Deployment

See `BUILD_SPEC.md` for complete build and deployment instructions.

## Technology

- Node.js + Express
- Puppeteer (HTML to PDF)
- Supabase Storage (PDF hosting)
- Docker (containerized deployment)

## Target Machine

Beast - Heavy processing server
