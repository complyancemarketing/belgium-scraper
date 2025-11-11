#!/usr/bin/env python3
"""
Backend Proxy Server for Web Scraping
Handles CORS issues by proxying requests server-side
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Proxy server is running'
    })

@app.route('/api/verify-llm', methods=['POST'])
def verify_llm():
    """Verify if content is about e-invoicing using LLM"""
    try:
        data = request.json
        title = data.get('title', '')
        content = data.get('content', '')
        
        if not title and not content:
            return jsonify({
                'success': False,
                'error': 'Title or content is required'
            }), 400
        
        # Prepare prompt for LLM
        content_to_verify = f"{title}\n\n{content[:800]}"
        prompt = f"""Is this content about e-invoicing, electronic invoicing, digital invoicing, or electronic billing?

Title: {title}
Content: {content_to_verify}

Answer ONLY "YES" or "NO"."""
        
        # Try Hugging Face Inference API
        try:
            hf_response = requests.post(
                'https://api-inference.huggingface.co/models/google/flan-t5-base',
                headers={'Content-Type': 'application/json'},
                json={
                    'inputs': prompt,
                    'parameters': {'max_new_tokens': 5, 'temperature': 0.1}
                },
                timeout=10
            )
            
            if hf_response.ok:
                hf_data = hf_response.json()
                response_text = ''
                
                if isinstance(hf_data, list) and len(hf_data) > 0 and 'generated_text' in hf_data[0]:
                    response_text = hf_data[0]['generated_text']
                elif 'generated_text' in hf_data:
                    response_text = hf_data['generated_text']
                
                is_e_invoicing = 'YES' in response_text.upper() and 'NO' not in response_text.upper()
                
                return jsonify({
                    'success': True,
                    'verified': is_e_invoicing,
                    'response': response_text.strip(),
                    'method': 'huggingface'
                })
        except Exception as e:
            print(f"Hugging Face API error: {str(e)}")
        
        # Fallback: Use enhanced keyword analysis
        combined_text = f"{title} {content}".lower()
        
        strong_indicators = [
            'e-invoice', 'einvoice', 'e invoice',
            'e-invoicing', 'einvoicing', 'e invoicing',
            'electronic invoice', 'electronic invoicing',
            'e-facturatie', 'efacturatie', 'e facturatie',
            'elektronische factuur', 'elektronische facturering',
            'facturation électronique', 'facture électronique',
            'peppol', 'ubl invoice', 'xml invoice'
        ]
        
        has_strong_indicator = any(indicator in combined_text for indicator in strong_indicators)
        
        if not has_strong_indicator:
            return jsonify({
                'success': True,
                'verified': False,
                'response': 'No strong e-invoicing indicators',
                'method': 'keyword_fallback'
            })
        
        # Exclude generic invoicing tools
        exclude_terms = [
            'invoice software', 'invoice template', 'invoice generator',
            'create invoice', 'invoice app', 'invoice management'
        ]
        
        has_exclude_term = any(
            term in combined_text and 
            'e-invoicing' not in combined_text and 
            'electronic invoicing' not in combined_text
            for term in exclude_terms
        )
        
        if has_exclude_term:
            return jsonify({
                'success': True,
                'verified': False,
                'response': 'Generic invoicing tool, not e-invoicing',
                'method': 'keyword_fallback'
            })
        
        return jsonify({
            'success': True,
            'verified': True,
            'response': 'Strong e-invoicing indicators found',
            'method': 'keyword_fallback'
        })
        
    except Exception as e:
        print(f"LLM verification error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/scrape', methods=['GET'])
def scrape():
    """Proxy endpoint to scrape any URL"""
    url = request.args.get('url')
    
    if not url:
        return jsonify({
            'success': False,
            'error': 'URL parameter is required'
        }), 400
    
    try:
        print(f"Proxying request to: {url}")
        
        # Make request with proper headers to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.google.com/'
        }
        
        response = requests.get(
            url,
            headers=headers,
            timeout=30,
            allow_redirects=True,
            verify=True
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        return jsonify({
            'success': True,
            'html': response.text,
            'url': url,
            'status': response.status_code,
            'content_type': response.headers.get('Content-Type', '')
        })
        
    except requests.exceptions.HTTPError as e:
        # Handle 404 and other HTTP errors gracefully
        if e.response.status_code == 404:
            print(f"Page not found (404): {url}")
            return jsonify({
                'success': True,
                'html': '',
                'url': url,
                'status': 404,
                'content_type': 'text/html'
            })
        else:
            print(f"HTTP error {e.response.status_code} for {url}: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'HTTP {e.response.status_code}: {str(e)}',
                'url': url
            }), 500
    except requests.exceptions.RequestException as e:
        print(f"Error scraping {url}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'url': url
        }), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'url': url
        }), 500

if __name__ == '__main__':
    print('🚀 Starting proxy server on http://localhost:3002')
    print('📡 Use /api/scrape?url=<target-url> to scrape websites')
    app.run(host='0.0.0.0', port=3002, debug=False, use_reloader=False)
