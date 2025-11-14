#!/bin/bash
# Test Email Script for Belgium E-Invoicing Scraper

echo "🧪 Sending test email..."
echo ""

curl -X POST http://localhost:3002/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"itzmenaresh007@gmail.com"}' \
  2>/dev/null | python3 -m json.tool

echo ""
echo "✅ Check your email inbox: itzmenaresh007@gmail.com"
