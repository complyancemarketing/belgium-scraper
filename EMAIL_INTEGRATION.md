# Email Integration Guide

## Overview
The auto-refresh feature is set up to send email notifications when new e-invoicing posts are found. Currently, the email endpoint is prepared but needs integration with an actual email service.

## Email Service Options

### Option 1: Gmail SMTP (Free, Simple)
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64

# Add to server.py send_email() and send_email_with_excel() functions:
smtp_server = "smtp.gmail.com"
smtp_port = 587
sender_email = "your-email@gmail.com"
sender_password = "your-app-password"  # Use App Password, not regular password

msg = MIMEMultipart('alternative')
msg['Subject'] = subject
msg['From'] = sender_email
msg['To'] = to_email

html_part = MIMEText(html_content, 'html')
msg.attach(html_part)

# For send_email_with_excel endpoint - attach Excel file
if excel_file:  # excel_file is base64 encoded string
    excel_data = base64.b64decode(excel_file)
    attachment = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    attachment.set_payload(excel_data)
    encoders.encode_base64(attachment)
    attachment.add_header('Content-Disposition', f'attachment; filename={file_name}')
    msg.attach(attachment)

with smtplib.SMTP(smtp_server, smtp_port) as server:
    server.starttls()
    server.login(sender_email, sender_password)
    server.send_message(msg)
```

**Setup Steps for Gmail:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add credentials to `.env` file:
   ```
   SMTP_EMAIL=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

### Option 2: SendGrid (Professional, Free Tier Available)
```python
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

# Add to requirements.txt:
# sendgrid

# Add to server.py:
sg = sendgrid.SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
from_email = Email("noreply@yourdomain.com")
to_email = To(to_email)
content = Content("text/html", html_content)
mail = Mail(from_email, to_email, subject, content)

response = sg.client.mail.send.post(request_body=mail.get())
```

**Setup Steps:**
1. Sign up at https://sendgrid.com (Free tier: 100 emails/day)
2. Create API key in dashboard
3. Add to `.env`: `SENDGRID_API_KEY=your-api-key`

### Option 3: AWS SES (Production-Grade, Pay-as-you-go)
```python
import boto3
from botocore.exceptions import ClientError

# Add to requirements.txt:
# boto3

# Add to server.py:
ses_client = boto3.client('ses',
    region_name='us-east-1',
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)

response = ses_client.send_email(
    Source='noreply@yourdomain.com',
    Destination={'ToAddresses': [to_email]},
    Message={
        'Subject': {'Data': subject},
        'Body': {'Html': {'Data': html_content}}
    }
)
```

**Setup Steps:**
1. Create AWS account
2. Verify email addresses in SES console
3. Add credentials to `.env`

### Option 4: Mailgun (Developer-Friendly)
```python
import requests

# Add to server.py:
mailgun_domain = os.environ.get('MAILGUN_DOMAIN')
mailgun_api_key = os.environ.get('MAILGUN_API_KEY')

response = requests.post(
    f"https://api.mailgun.net/v3/{mailgun_domain}/messages",
    auth=("api", mailgun_api_key),
    data={
        "from": f"E-Invoicing Scraper <noreply@{mailgun_domain}>",
        "to": to_email,
        "subject": subject,
        "html": html_content
    }
)
```

## Recommended Setup for Development: Gmail SMTP

1. **Install required package** (if not already installed):
   ```bash
   # Already in requirements.txt, no action needed
   ```

2. **Enable Gmail App Password**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Go to https://myaccount.google.com/apppasswords
   - Create new app password for "Mail"

3. **Update `.env` file**:
   ```env
   MISTRAL_API_KEY=HuLcVk8CUn31ea55tNzco4JQmJ0RhaVP
   SMTP_EMAIL=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

4. **Update `server.py`**:
   Replace the TODO section in the `send_email()` function with the Gmail SMTP code from Option 1 above.

5. **Restart server**:
   ```bash
   python server.py
   ```

## Email Template
The emails include:
- ✅ Professional HTML design
- ✅ Header with notification badge
- ✅ Card layout for each new post
- ✅ Post title, date, URL, and summary
- ✅ Branded footer
- ✅ Mobile-responsive design

### Two Email Types:

#### 1. Auto-Refresh Notifications (New Posts Only)
- Triggered automatically when new posts are found
- Contains only newly discovered posts
- Lightweight, focused updates
- Sent via `/send-email` endpoint

#### 2. Manual Email Reports (All Posts with Excel)
- Triggered by clicking "📧 Send Email Report" button
- Includes complete report summary with statistics
- **Excel file attachment** with all posts
- Preview of first 5 posts in email body
- Full dataset in attached Excel file
- Sent via `/send-email-with-excel` endpoint

## Testing
1. Enable auto-refresh toggle in dashboard
2. Enter your email address
3. Wait for next scheduled check (or trigger manually)
4. Check your inbox for new post notifications

## Security Notes
- Never commit `.env` file to git
- Use environment variables for all credentials
- Consider using app-specific passwords
- Rate limit email sending to avoid spam flags
- Verify recipient email addresses in production
