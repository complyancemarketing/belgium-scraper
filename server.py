#!/usr/bin/env python3
"""
Backend Proxy Server for Web Scraping
Handles CORS issues by proxying requests server-side
Uses Mistral AI for LLM-based content verification
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from urllib.parse import urlparse
import os

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Using system environment variables only.")

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
        
        # Try Mistral AI API
        try:
            # Get Mistral API key from environment variable
            # Get it from: https://console.mistral.ai/
            mistral_api_key = os.environ.get('MISTRAL_API_KEY', '')
            
            if not mistral_api_key or mistral_api_key == 'YOUR_MISTRAL_API_KEY_HERE':
                print("Warning: MISTRAL_API_KEY not set. Using fallback verification.")
                raise Exception("Mistral API key not configured")
            
            mistral_response = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {mistral_api_key}'
                },
                json={
                    'model': 'mistral-tiny',  # Fast and cost-effective model
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    'temperature': 0.1,
                    'max_tokens': 10
                },
                timeout=15
            )
            
            if mistral_response.ok:
                mistral_data = mistral_response.json()
                response_text = ''
                
                if 'choices' in mistral_data and len(mistral_data['choices']) > 0:
                    response_text = mistral_data['choices'][0]['message']['content']
                
                is_e_invoicing = 'YES' in response_text.upper() and 'NO' not in response_text.upper()
                
                return jsonify({
                    'success': True,
                    'verified': is_e_invoicing,
                    'response': response_text.strip(),
                    'method': 'mistral_ai'
                })
            else:
                print(f"Mistral AI API error: {mistral_response.status_code} - {mistral_response.text}")
        except Exception as e:
            print(f"Mistral AI API error: {str(e)}")
        
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

@app.route('/send-email', methods=['POST'])
def send_email():
    """Send email notification for new e-invoicing posts"""
    try:
        data = request.json
        to_email = data.get('to', '')
        subject = data.get('subject', 'New E-Invoicing Posts')
        posts = data.get('posts', [])
        new_posts_count = data.get('newPostsCount', len(posts))
        
        if not to_email:
            return jsonify({
                'success': False,
                'error': 'Email address is required'
            }), 400
        
        if not posts:
            return jsonify({
                'success': False,
                'error': 'No posts to send'
            }), 400
        
        # Create HTML email content
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                           color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 20px; }}
                .post-card {{ background: white; border-radius: 8px; padding: 16px; 
                             margin-bottom: 16px; border-left: 4px solid #3b82f6; }}
                .post-title {{ font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }}
                .post-url {{ color: #3b82f6; text-decoration: none; font-size: 14px; }}
                .post-date {{ color: #6b7280; font-size: 14px; margin: 8px 0; }}
                .post-summary {{ color: #4b5563; font-size: 14px; margin-top: 8px; 
                                line-height: 1.5; }}
                .footer {{ background: #1f2937; color: white; padding: 16px; 
                          border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }}
                .badge {{ background: #10b981; color: white; padding: 4px 12px; 
                         border-radius: 12px; font-size: 14px; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New E-Invoicing Posts Found</h1>
                    <p style="margin: 8px 0 0 0;">
                        <span class="badge">{new_posts_count} New Post{'s' if new_posts_count != 1 else ''}</span>
                    </p>
                </div>
                <div class="content">
                    <p style="font-size: 16px; color: #1f2937;">
                        Your auto-refresh monitoring has found new e-invoicing posts on BOSA Belgium:
                    </p>
        """
        
        for post in posts:
            title = post.get('title', 'Untitled')
            url = post.get('url', '#')
            date = post.get('date', 'Date not available')
            summary = post.get('summary', '')[:200]  # Limit summary to 200 chars
            
            html_content += f"""
                    <div class="post-card">
                        <h2 class="post-title">{title}</h2>
                        <div class="post-date">📅 {date}</div>
                        <a href="{url}" class="post-url" target="_blank">View Post →</a>
                        {f'<div class="post-summary">{summary}{"..." if len(summary) >= 200 else ""}</div>' if summary else ''}
                    </div>
            """
        
        html_content += """
                    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                        This is an automated notification from your E-Invoicing Scraper dashboard.
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">Belgium E-Invoicing Scraper</p>
                    <p style="margin: 8px 0 0 0; opacity: 0.8;">Monitoring BOSA Belgium for E-Invoicing Updates</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email via SMTP
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Get SMTP credentials from environment
        smtp_email = os.environ.get('SMTP_EMAIL', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        if not smtp_email or not smtp_password:
            print("⚠️ SMTP credentials not configured")
            return jsonify({
                'success': False,
                'error': 'SMTP credentials not configured. Please set SMTP_EMAIL and SMTP_PASSWORD in .env file'
            }), 400
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_email
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        print(f"📧 Sending email to: {to_email}")
        print(f"📊 Subject: {subject}")
        print(f"📝 Posts count: {new_posts_count}")
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to_email}")
        
        return jsonify({
            'success': True,
            'message': f'Email notification sent to {to_email} with {new_posts_count} posts',
            'from': smtp_email,
            'to': to_email
        })
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/send-email-with-excel', methods=['POST'])
def send_email_with_excel():
    """Send email with Excel sheet containing all e-invoicing posts"""
    try:
        data = request.json
        to_email = data.get('to', '')
        subject = data.get('subject', 'E-Invoicing Posts Report')
        posts = data.get('posts', [])
        total_posts_count = data.get('totalPostsCount', len(posts))
        excel_file = data.get('excelFile', '')
        file_name = data.get('fileName', 'e-invoicing-posts.xlsx')
        is_manual = data.get('isManual', False)
        
        if not to_email:
            return jsonify({
                'success': False,
                'error': 'Email address is required'
            }), 400
        
        if not posts:
            return jsonify({
                'success': False,
                'error': 'No posts to send'
            }), 400
        
        # Create HTML email content with summary
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                           color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ background: #f9fafb; padding: 20px; }}
                .stats-box {{ background: white; border-radius: 8px; padding: 16px; 
                             margin-bottom: 20px; border-left: 4px solid #3b82f6; }}
                .stats-row {{ display: flex; justify-content: space-between; 
                             padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
                .stats-row:last-child {{ border-bottom: none; }}
                .stats-label {{ font-weight: 600; color: #1f2937; }}
                .stats-value {{ color: #3b82f6; font-weight: 600; }}
                .attachment-box {{ background: #dbeafe; border-radius: 8px; padding: 16px;
                                  margin: 20px 0; text-align: center; border: 2px dashed #3b82f6; }}
                .attachment-icon {{ font-size: 48px; margin-bottom: 10px; }}
                .post-preview {{ background: white; border-radius: 8px; padding: 12px; 
                                margin: 8px 0; border-left: 3px solid #10b981; font-size: 14px; }}
                .post-title {{ font-weight: 600; color: #1f2937; margin-bottom: 4px; }}
                .post-url {{ color: #3b82f6; text-decoration: none; font-size: 12px; }}
                .footer {{ background: #1f2937; color: white; padding: 16px; 
                          border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }}
                .badge {{ background: #10b981; color: white; padding: 4px 12px; 
                         border-radius: 12px; font-size: 14px; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 E-Invoicing Posts Report</h1>
                    <p style="margin: 8px 0 0 0;">
                        <span class="badge">{total_posts_count} Total Post{'s' if total_posts_count != 1 else ''}</span>
                    </p>
                </div>
                <div class="content">
                    <div class="stats-box">
                        <h3 style="margin-top: 0; color: #1f2937;">📈 Report Summary</h3>
                        <div class="stats-row">
                            <span class="stats-label">Total Posts:</span>
                            <span class="stats-value">{total_posts_count}</span>
                        </div>
                        <div class="stats-row">
                            <span class="stats-label">Report Date:</span>
                            <span class="stats-value">{subject.split(' - ')[-1] if ' - ' in subject else 'Today'}</span>
                        </div>
                        <div class="stats-row">
                            <span class="stats-label">Source:</span>
                            <span class="stats-value">BOSA Belgium</span>
                        </div>
                    </div>

                    <div class="attachment-box">
                        <div class="attachment-icon">📎</div>
                        <h3 style="margin: 10px 0; color: #1e40af;">Excel File Attached</h3>
                        <p style="margin: 5px 0; color: #1f2937;">
                            <strong>{file_name}</strong>
                        </p>
                        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                            Complete data for all {total_posts_count} e-invoicing posts
                        </p>
                    </div>

                    <h3 style="color: #1f2937; margin-top: 20px;">📋 Preview (First 5 Posts)</h3>
        """
        
        # Add preview of first 5 posts
        preview_posts = posts[:5]
        for post in preview_posts:
            title = post.get('title', 'Untitled')
            url = post.get('url', '#')
            date = post.get('date', 'Date not available')
            
            html_content += f"""
                    <div class="post-preview">
                        <div class="post-title">{title}</div>
                        <div style="font-size: 12px; color: #6b7280; margin: 4px 0;">📅 {date}</div>
                        <a href="{url}" class="post-url" target="_blank">View Post →</a>
                    </div>
            """
        
        if len(posts) > 5:
            html_content += f"""
                    <p style="text-align: center; color: #6b7280; font-style: italic; margin-top: 10px;">
                        ... and {len(posts) - 5} more posts in the Excel file
                    </p>
            """
        
        html_content += """
                    <p style="font-size: 14px; color: #6b7280; margin-top: 20px; padding: 12px; background: white; border-radius: 8px;">
                        💡 <strong>Tip:</strong> Open the attached Excel file to view complete details including:
                        titles, URLs, publication dates, content summaries, and AI verification status.
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">Belgium E-Invoicing Scraper</p>
                    <p style="margin: 8px 0 0 0; opacity: 0.8;">Automated Report - Monitoring BOSA Belgium for E-Invoicing Updates</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email with Excel attachment via SMTP
        import smtplib
        import base64
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.base import MIMEBase
        from email import encoders
        
        # Get SMTP credentials from environment
        smtp_email = os.environ.get('SMTP_EMAIL', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        if not smtp_email or not smtp_password:
            print("⚠️ SMTP credentials not configured")
            return jsonify({
                'success': False,
                'error': 'SMTP credentials not configured. Please set SMTP_EMAIL and SMTP_PASSWORD in .env file'
            }), 400
        
        # Create email message
        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = smtp_email
        msg['To'] = to_email
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Attach Excel file if provided
        if excel_file:
            try:
                # Decode base64 Excel file
                excel_data = base64.b64decode(excel_file)
                
                # Create attachment
                attachment = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                attachment.set_payload(excel_data)
                encoders.encode_base64(attachment)
                attachment.add_header('Content-Disposition', f'attachment; filename="{file_name}"')
                msg.attach(attachment)
                
                print(f"📎 Excel attachment added: {file_name} ({len(excel_data)} bytes)")
            except Exception as e:
                print(f"⚠️ Error attaching Excel file: {str(e)}")
        
        # Log the email details
        print(f"📧 Sending Excel report email to: {to_email}")
        print(f"📊 Subject: {subject}")
        print(f"📝 Total posts: {total_posts_count}")
        print(f"🔄 Manual send: {is_manual}")
        
        # Send email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        
        print(f"✅ Email with Excel attachment sent successfully to {to_email}")
        
        return jsonify({
            'success': True,
            'message': f'Email report sent to {to_email} with {total_posts_count} posts and Excel attachment',
            'from': smtp_email,
            'to': to_email,
            'fileName': file_name,
            'postsCount': total_posts_count
        })
        
    except Exception as e:
        print(f"Error sending email with Excel: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/test-email', methods=['POST'])
def test_email():
    """Send a test email to verify email configuration"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        data = request.json
        to_email = data.get('to', '')
        
        if not to_email:
            return jsonify({
                'success': False,
                'error': 'Email address is required'
            }), 400
        
        # Get SMTP credentials from environment
        smtp_email = os.environ.get('SMTP_EMAIL', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        if not smtp_email or not smtp_password:
            return jsonify({
                'success': False,
                'error': 'SMTP credentials not configured. Please set SMTP_EMAIL and SMTP_PASSWORD in .env file',
                'instructions': {
                    'step1': 'Create/edit .env file in project root',
                    'step2': 'Add: SMTP_EMAIL=your-email@gmail.com',
                    'step3': 'Add: SMTP_PASSWORD=your-app-password',
                    'step4': 'For Gmail: Generate App Password at https://myaccount.google.com/apppasswords',
                    'step5': 'Restart the server'
                }
            }), 400
        
        # Create test email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🧪 Test Email - Belgium E-Invoicing Scraper'
        msg['From'] = smtp_email
        msg['To'] = to_email
        
        # HTML content
        html_content = """
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                         color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9fafb; padding: 20px; }
                .success-box { background: #d1fae5; border-left: 4px solid #10b981; 
                              padding: 16px; margin: 16px 0; border-radius: 4px; }
                .footer { background: #1f2937; color: white; padding: 16px; 
                         border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
                .emoji { font-size: 48px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="emoji">✅</div>
                    <h1 style="margin: 0;">Email Test Successful!</h1>
                </div>
                <div class="content">
                    <div class="success-box">
                        <h3 style="margin-top: 0; color: #065f46;">🎉 Great News!</h3>
                        <p style="margin: 0; color: #047857;">
                            Your email configuration is working correctly. You will now receive 
                            notifications when new e-invoicing posts are found.
                        </p>
                    </div>
                    
                    <h3 style="color: #1f2937;">Test Details:</h3>
                    <ul style="color: #4b5563;">
                        <li><strong>From:</strong> Belgium E-Invoicing Scraper</li>
                        <li><strong>To:</strong> """ + to_email + """</li>
                        <li><strong>SMTP Server:</strong> Gmail (smtp.gmail.com)</li>
                        <li><strong>Status:</strong> <span style="color: #10b981;">Connected ✓</span></li>
                    </ul>
                    
                    <h3 style="color: #1f2937;">What's Next?</h3>
                    <ol style="color: #4b5563;">
                        <li>Enable <strong>Auto-Refresh</strong> in your dashboard</li>
                        <li>Enter your email address and click <strong>Save Email</strong></li>
                        <li>You'll receive automatic notifications for new posts</li>
                    </ol>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                        This is an automated test message from your E-Invoicing Scraper. 
                        If you received this email, your notification system is ready to go!
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">Belgium E-Invoicing Scraper</p>
                    <p style="margin: 8px 0 0 0; opacity: 0.8;">Email Notification System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email via Gmail SMTP
        print(f'📧 Attempting to send test email to: {to_email}')
        print(f'📤 Using SMTP account: {smtp_email}')
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        
        print(f'✅ Test email sent successfully to {to_email}')
        
        return jsonify({
            'success': True,
            'message': f'Test email sent successfully to {to_email}',
            'from': smtp_email,
            'to': to_email,
            'smtp_server': 'smtp.gmail.com'
        })
        
    except smtplib.SMTPAuthenticationError as e:
        print(f'❌ SMTP Authentication failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': 'Authentication failed. Please check your email and app password.',
            'details': str(e),
            'help': 'For Gmail, use an App Password (not your regular password): https://myaccount.google.com/apppasswords'
        }), 401
        
    except Exception as e:
        print(f'❌ Error sending test email: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Failed to send test email: {str(e)}',
            'type': type(e).__name__
        }), 500

if __name__ == '__main__':
    print('🚀 Starting proxy server on http://localhost:3002')
    print('📡 Use /api/scrape?url=<target-url> to scrape websites')
    print('📧 Email endpoints: /send-email and /send-email-with-excel')
    print('🧪 Test endpoint: POST /test-email with {"to": "your-email@example.com"}')
    app.run(host='0.0.0.0', port=3002, debug=False, use_reloader=False)

