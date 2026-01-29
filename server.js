// Circle K Safety Walk Backend API - Updated Version
// server-circlek-v2.js

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for Excel attachments

// API endpoint to send Circle K safety report
app.post('/api/send-report', async (req, res) => {
  try {
    const { name, storeNumber, employeeRole, title, date, responses, filename, questionType, excelBuffer, recipientEmail } = req.body;

    // Calculate statistics
    let yesCount = 0;
    let noCount = 0;
    const noItems = [];

    Object.entries(responses).forEach(([question, response]) => {
      // Handle new structure where response is an object with value, workOrder, correctiveAction
      const answer = typeof response === 'object' ? response.value : response;
      const workOrder = typeof response === 'object' ? response.workOrder : '';
      const correctiveAction = typeof response === 'object' ? response.correctiveAction : '';
      
      if (answer === 'Yes') yesCount++;
      else if (answer === 'No') {
        noCount++;
        noItems.push({
          question,
          workOrder: workOrder || 'N/A',
          correctiveAction: correctiveAction || 'None specified'
        });
      }
    });

    const totalQuestions = yesCount + noCount;
    const complianceRate = totalQuestions > 0 
      ? ((yesCount / totalQuestions) * 100).toFixed(1) 
      : 'N/A';

    // Determine inspection type for subject line
    const inspectionType = employeeRole === 'Non-Store Personnel' 
      ? 'Non-Store Personnel Inspection (11 Questions)' 
      : `${employeeRole} Inspection (7 Questions)`;

    // Create email HTML with Circle K branding
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
          }
          .header { 
            background: #C8102E; 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .circle-k-logo {
            font-size: 36px;
            font-weight: 900;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .orange-accent {
            height: 6px;
            background: #FF6B35;
            width: 150px;
            margin: 15px auto 20px;
            border-radius: 3px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .inspection-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 700;
            margin-top: 10px;
            letter-spacing: 0.5px;
          }
          .content { 
            background: #f5f5f5; 
            padding: 30px;
          }
          .info-section { 
            background: white; 
            padding: 25px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-top: 4px solid #FF6B35;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            padding-bottom: 12px; 
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child { 
            border-bottom: none; 
            margin-bottom: 0; 
          }
          .label { 
            font-weight: 700; 
            color: #1a1a1a; 
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          .value { 
            color: #333; 
            font-weight: 500;
          }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px; 
            margin-top: 20px;
          }
          .stat-box { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-top: 4px solid #C8102E;
          }
          .stat-value { 
            font-size: 36px; 
            font-weight: 900; 
            margin-bottom: 8px;
            color: #C8102E;
          }
          .stat-label { 
            color: #666; 
            font-size: 13px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            font-weight: 700;
          }
          .compliance-box {
            background: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-top: 4px solid #FF6B35;
            margin-top: 20px;
          }
          .compliance-value {
            font-size: 48px;
            font-weight: 900;
            color: ${complianceRate >= 80 ? '#2ecc71' : complianceRate >= 60 ? '#f39c12' : '#C8102E'};
            margin-bottom: 8px;
          }
          .compliance-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
          }
          .issues-section { 
            background: white; 
            padding: 25px; 
            border-radius: 8px; 
            margin-top: 20px;
            border-top: 4px solid #C8102E;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .section-title {
            color: #C8102E;
            font-size: 18px;
            font-weight: 900;
            margin: 0 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 10px;
          }
          .issue-item { 
            background: #fff5f5; 
            border-left: 4px solid #C8102E; 
            padding: 15px; 
            margin-bottom: 12px; 
            border-radius: 4px;
          }
          .issue-item:last-child { 
            margin-bottom: 0; 
          }
          .issue-text { 
            color: #1a1a1a; 
            font-weight: 500;
            line-height: 1.5;
          }
          .corrective-section {
            background: #e8f5e9;
            border-left: 4px solid #2ecc71;
            padding: 20px;
            margin-top: 15px;
            border-radius: 4px;
          }
          .corrective-title {
            color: #27ae60;
            font-weight: 700;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 0.5px;
          }
          .corrective-text {
            color: #333;
            line-height: 1.6;
          }
          .all-clear {
            background: #e8f5e9;
            border-left: 4px solid #2ecc71;
            padding: 25px;
            text-align: center;
            border-radius: 4px;
          }
          .all-clear h3 {
            color: #27ae60;
            margin: 0 0 10px 0;
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
          }
          .all-clear p {
            color: #27ae60;
            margin: 0;
            font-weight: 500;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e0e0e0; 
            color: #666; 
            font-size: 13px;
          }
          .footer-logo {
            color: #C8102E;
            font-weight: 900;
            font-size: 18px;
            letter-spacing: 2px;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="circle-k-logo">CIRCLE K</div>
            <div class="orange-accent"></div>
            <h1>Daily Safety Walk Report</h1>
            <div class="inspection-badge">${inspectionType}</div>
          </div>
          
          <div class="content">
            <div class="info-section">
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${name}</span>
              </div>
              <div class="info-row">
                <span class="label">Store Number:</span>
                <span class="value">#${storeNumber}</span>
              </div>
              <div class="info-row">
                <span class="label">Employee Role:</span>
                <span class="value">${employeeRole}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="info-row">
                <span class="label">Report Time:</span>
                <span class="value">${new Date().toLocaleString()}</span>
              </div>
            </div>

            <div class="stats">
              <div class="stat-box">
                <div class="stat-value">${yesCount}</div>
                <div class="stat-label">Yes</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${noCount}</div>
                <div class="stat-label">No</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${totalQuestions}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>

            <div class="compliance-box">
              <div class="compliance-value">${complianceRate}%</div>
              <div class="compliance-label">Compliance Rate</div>
            </div>

            ${noItems.length > 0 ? `
              <div class="issues-section">
                <h3 class="section-title">⚠️ Issues Identified</h3>
                ${noItems.map(item => `
                  <div class="issue-item">
                    <div class="issue-text"><strong>Question:</strong> ${item.question}</div>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffdddd;">
                      <div style="margin-bottom: 5px;"><strong>Work Order:</strong> ${item.workOrder}</div>
                      <div><strong>Corrective Action:</strong> ${item.correctiveAction}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="issues-section">
                <div class="all-clear">
                  <h3>✓ All Checks Passed!</h3>
                  <p>No safety issues identified during this inspection.</p>
                </div>
              </div>
            `}

            <div class="footer">
              <div class="footer-logo">CIRCLE K</div>
              <p>Automated Safety Walk Report</p>
              <p style="margin: 5px 0 0 0;">Excel file: ${filename}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using MailerSend HTTP API
    // MailerSend allows sending to any email address on free tier (no domain verification required)
    const mailerSendResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        from: {
          email: 'CKSafetyWalk@test-vz9dlem726n4kj50.mlsender.net',
          name: 'Circle K Safety'
        },
        to: [
          {
            email: recipientEmail,
            name: `Store ${storeNumber}`
          }
        ],
        subject: `Circle K Store #${storeNumber} - ${inspectionType} - ${date}`,
        html: emailHTML,
        attachments: [
          {
            content: excelBuffer,
            filename: filename,
            disposition: 'attachment',
            id: 'safety-report'
          }
        ]
      })
    });

    if (!mailerSendResponse.ok) {
      const errorText = await mailerSendResponse.text();
      console.error('MailerSend error:', errorText);
      throw new Error(`Failed to send email via MailerSend: ${mailerSendResponse.status} ${errorText}`);
    }

    res.json({ 
      success: true, 
      message: `Safety report sent successfully to ${recipientEmail}`
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Circle K Safety Walk API v2',
    timestamp: new Date().toISOString() 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Circle K Safety Walk API v2 running on port ${PORT}`);
});
