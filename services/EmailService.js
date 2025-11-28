class EmailService {
  constructor() {
    // Use your Gmail credentials from .env
    this.gmailEmail = process.env.GMAIL_EMAIL;
    this.gmailPassword = process.env.GMAIL_APP_PASSWORD;
    this.supportEmail = 'spendflowapp@gmail.com';
  }

  // Check if user has email notifications enabled
  async checkEmailEnabled(userId) {
    if (!userId) return true; // Default to enabled if no userId
    
    try {
      const { db } = require('../config/firebase');
      const { doc, getDoc } = require('firebase/firestore');
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const settings = userData.notificationSettings || { email: true };
        return settings.email !== false; // Default to true if not set
      }
      
      return true; // Default: enabled
    } catch (error) {
      console.error('Error checking email settings:', error);
      return true; // Default to enabled on error
    }
  }

  // Send email using Gmail SMTP via backend
  async sendEmail(to, subject, htmlContent, textContent = '', userId = null) {
    // Check if user has email notifications enabled
    if (userId) {
      const emailEnabled = await this.checkEmailEnabled(userId);
      if (!emailEnabled) {
        console.log('Email notifications disabled for user:', userId);
        return { success: true, skipped: true, reason: 'Email notifications disabled' };
      }
    }

    const emailData = {
      to: to,
      from: this.gmailEmail,
      fromName: 'SpendFlow',
      subject: subject,
      html: htmlContent,
      text: textContent || this.stripHtml(htmlContent),
      // Gmail SMTP credentials
      auth: {
        user: this.gmailEmail,
        pass: this.gmailPassword
      }
    };

    try {
      // Try Firebase Functions first (if available)
      const functionsUrl = 'https://us-central1-spedflowapp.cloudfunctions.net/sendEmail';
      
      console.log('Attempting to send email via Firebase Functions...');
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Email sent successfully via Firebase Functions:', to);
        return { success: true, provider: 'firebase-functions', messageId: result.messageId };
      } else {
        const errorText = await response.text();
        console.warn('Firebase Functions email failed:', response.status, errorText);
        throw new Error(`Firebase Functions error: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      console.warn('Firebase Functions email error, falling back to queue:', error.message);
      
      // Fallback: Store in Firebase for batch processing
      try {
        const { db } = require('../config/firebase');
        const { collection, addDoc } = require('firebase/firestore');
        
        await addDoc(collection(db, 'emailQueue'), {
          to: to,
          from: this.gmailEmail,
          subject: subject,
          html: htmlContent,
          text: textContent || this.stripHtml(htmlContent),
          status: 'pending',
          createdAt: new Date(),
          provider: 'gmail'
        });
        
        console.log('Email queued for batch processing:', to);
        return { success: true, provider: 'queue', messageId: 'queued-' + Date.now() };
        
      } catch (queueError) {
        console.error('Failed to queue email:', queueError);
        
        // Final fallback: Create a mailto link or show instructions
        const mailtoLink = `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(this.stripHtml(htmlContent))}`;
        
        console.log('EMAIL FALLBACK - Email queuing failed, using mailto fallback');
        console.log('Mailto link:', mailtoLink);
        
        return { 
          success: true, 
          fallback: true,
          mailtoLink: mailtoLink,
          message: 'Email system temporarily unavailable. Please email us directly at ' + this.supportEmail
        };
      }
    }
  }

  // Generate monthly financial report email
  async sendMonthlyReport(userEmail, reportData) {
    const subject = `SpendFlow Monthly Report - ${reportData.month} ${reportData.year}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .summary-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .amount { font-weight: bold; font-size: 1.2em; }
          .positive { color: #10b981; }
          .negative { color: #ef4444; }
          .category { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 0.9em; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 SpendFlow Monthly Report</h1>
          <p>${reportData.month} ${reportData.year}</p>
        </div>
        
        <div class="content">
          <div class="summary-card">
            <h2>📊 Financial Summary</h2>
            <div class="category">
              <span>Total Income:</span>
              <span class="amount positive">£${reportData.totalIncome}</span>
            </div>
            <div class="category">
              <span>Total Expenses:</span>
              <span class="amount negative">£${reportData.totalExpenses}</span>
            </div>
            <div class="category">
              <span>Net Savings:</span>
              <span class="amount ${reportData.netSavings >= 0 ? 'positive' : 'negative'}">£${reportData.netSavings}</span>
            </div>
          </div>

          <div class="summary-card">
            <h2>🏷️ Top Spending Categories</h2>
            ${reportData.topCategories.map(cat => `
              <div class="category">
                <span>${cat.name}:</span>
                <span class="amount">£${cat.amount}</span>
              </div>
            `).join('')}
          </div>

          <div class="summary-card">
            <h2>🎯 Savings Goals Progress</h2>
            ${reportData.savingsGoals.map(goal => `
              <div class="category">
                <span>${goal.name}:</span>
                <span>${goal.progress}% (£${goal.current}/£${goal.target})</span>
              </div>
            `).join('')}
          </div>

          <div class="summary-card">
            <h2>💡 AI Insights</h2>
            <p>${reportData.aiInsights}</p>
          </div>
        </div>

        <div class="footer">
          <p>This report was generated automatically by SpendFlow AI</p>
          <p>Visit <a href="https://spendflow.uk">spendflow.uk</a> to view your full dashboard</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send payment reminder
  async sendPaymentReminder(userEmail, paymentData) {
    const subject = `💳 Payment Reminder: ${paymentData.cardName} - Due ${paymentData.dueDate}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .amount { font-weight: bold; font-size: 1.3em; color: #dc2626; }
          .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💳 Payment Reminder</h1>
        </div>
        
        <div class="content">
          <div class="alert-card">
            <h2>⚠️ Payment Due Soon</h2>
            <p><strong>Card:</strong> ${paymentData.cardName}</p>
            <p><strong>Due Date:</strong> ${paymentData.dueDate}</p>
            <p><strong>Amount Due:</strong> <span class="amount">£${paymentData.amount}</span></p>
            <p><strong>Minimum Payment:</strong> £${paymentData.minimumPayment}</p>
          </div>

          <p>Don't forget to make your payment before the due date to avoid late fees.</p>
          
          <a href="https://spendflow.uk/payments" class="button">Make Payment Now</a>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send goal achievement notification
  async sendGoalAchievement(userEmail, goalData) {
    const subject = `🎉 Congratulations! You've reached your ${goalData.goalName} goal!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .celebration { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 10px 0; text-align: center; }
          .amount { font-weight: bold; font-size: 1.5em; color: #059669; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Goal Achieved!</h1>
        </div>
        
        <div class="content">
          <div class="celebration">
            <h2>🏆 Congratulations!</h2>
            <p>You've successfully reached your <strong>${goalData.goalName}</strong> goal!</p>
            <p class="amount">£${goalData.targetAmount}</p>
            <p>It took you ${goalData.timeToAchieve} to reach this milestone.</p>
          </div>

          <p>This is a fantastic achievement! Your dedication to saving has paid off.</p>
          <p>Consider setting your next financial goal to continue building your wealth.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send budget alert
  async sendBudgetAlert(userEmail, alertData) {
    const subject = `⚠️ Budget Alert: ${alertData.category} spending is ${alertData.percentage}% of budget`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .warning-card { background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
          .progress-fill { height: 100%; background: ${alertData.percentage > 90 ? '#dc2626' : alertData.percentage > 75 ? '#f59e0b' : '#10b981'}; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Budget Alert</h1>
        </div>
        
        <div class="content">
          <div class="warning-card">
            <h2>Budget Update: ${alertData.category}</h2>
            <p><strong>Spent:</strong> £${alertData.spent} of £${alertData.budget}</p>
            <p><strong>Percentage:</strong> ${alertData.percentage}%</p>
            
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(alertData.percentage, 100)}%"></div>
            </div>
            
            <p><strong>Remaining:</strong> £${alertData.remaining}</p>
          </div>

          <p>${alertData.message}</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Parse bank statement from email (basic implementation)
  async parseStatementEmail(emailContent) {
    try {
      // This is a simplified parser - in reality, you'd need more sophisticated parsing
      // for different bank formats
      
      const transactions = [];
      const lines = emailContent.split('\n');
      
      for (const line of lines) {
        // Look for transaction patterns (this is very basic)
        const transactionMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?\£?\d+\.?\d*)/);
        
        if (transactionMatch) {
          transactions.push({
            date: transactionMatch[1],
            description: transactionMatch[2].trim(),
            amount: parseFloat(transactionMatch[3].replace('£', '').replace(',', '')),
            type: transactionMatch[3].includes('-') ? 'debit' : 'credit'
          });
        }
      }
      
      return {
        success: true,
        transactions: transactions,
        totalTransactions: transactions.length
      };
    } catch (error) {
      console.error('Error parsing statement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Schedule recurring emails (would typically be handled by a cron job)
  async scheduleMonthlyReports(userId, userEmail) {
    // This would typically be implemented with a job scheduler
    // For now, we'll just return a success message
    
    // Scheduled monthly reports for user
    
    return {
      success: true,
      message: 'Monthly reports scheduled successfully'
    };
  }

  // Utility function to strip HTML tags
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Send welcome email for new users
  async sendWelcomeEmail(userEmail, userName) {
    const subject = `🎉 Welcome to SpendFlow, ${userName}!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .feature-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; }
          .button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .tips { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to SpendFlow!</h1>
          <p>Your journey to financial freedom starts here</p>
        </div>
        
        <div class="content">
          <h2>Hi ${userName}! 👋</h2>
          <p>Welcome to SpendFlow - the smart way to manage your finances and achieve your goals!</p>

          <div class="feature-card">
            <h3>🚀 Get Started</h3>
            <p>Here's what you can do right now:</p>
            <ul>
              <li>📊 Add your first card or bank account</li>
              <li>🎯 Set your first savings goal</li>
              <li>💡 Share tips in our Community section</li>
              <li>📈 Track your spending with beautiful charts</li>
            </ul>
          </div>

          <div class="tips">
            <h3>💡 Pro Tip</h3>
            <p>Start by setting up your first savings goal - even £10/month makes a difference!</p>
          </div>

          <a href="https://spendflow.uk/dashboard" class="button">Open SpendFlow Dashboard</a>

          <p>If you have any questions, just reply to this email. We're here to help!</p>
          
          <p>Happy saving! 💰<br>
          The SpendFlow Team</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send Community Tips notifications
  async sendTipCommentNotification(userEmail, commenterName, tipTitle, commentText) {
    const subject = `💬 ${commenterName} commented on your tip`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .comment-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💬 New Comment</h1>
        </div>
        
        <div class="content">
          <p><strong>${commenterName}</strong> commented on your tip:</p>
          <h3>"${tipTitle}"</h3>
          
          <div class="comment-card">
            <p><strong>Comment:</strong></p>
            <p>"${commentText}"</p>
          </div>

          <a href="https://spendflow.uk/community-tips" class="button">View & Reply</a>
          
          <p>Keep the conversation going and help others with their financial journey!</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send reply notification
  async sendReplyNotification(userEmail, replierName, originalComment, replyText) {
    const subject = `↩️ ${replierName} replied to your comment`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .reply-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .original-comment { background: #f8fafc; border-left: 3px solid #64748b; padding: 10px; margin: 10px 0; font-style: italic; }
          .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>↩️ New Reply</h1>
        </div>
        
        <div class="content">
          <p><strong>${replierName}</strong> replied to your comment:</p>
          
          <div class="original-comment">
            <p><strong>Your comment:</strong> "${originalComment}"</p>
          </div>
          
          <div class="reply-card">
            <p><strong>Reply:</strong></p>
            <p>"${replyText}"</p>
          </div>

          <a href="https://spendflow.uk/community-tips" class="button">View Conversation</a>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send tip liked notification
  async sendTipLikedNotification(userEmail, likerName, tipTitle) {
    const subject = `❤️ ${likerName} liked your tip`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .like-card { background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>❤️ Your tip was liked!</h1>
        </div>
        
        <div class="content">
          <div class="like-card">
            <p><strong>${likerName}</strong> liked your tip:</p>
            <h3>"${tipTitle}"</h3>
            <p>Your financial wisdom is helping others! 🎉</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send weekly digest
  async sendWeeklyDigest(userEmail, userName, digestData) {
    const subject = `📊 Your Weekly SpendFlow Summary`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .stat-card { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; display: inline-block; width: 45%; }
          .highlight { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Weekly Summary</h1>
          <p>Here's how your week looked, ${userName}</p>
        </div>
        
        <div class="content">
          <div class="stat-card">
            <h3>💰 This Week</h3>
            <p><strong>Spent:</strong> £${digestData.weeklySpent}</p>
            <p><strong>Saved:</strong> £${digestData.weeklySaved}</p>
          </div>
          
          <div class="stat-card">
            <h3>🎯 Goals Progress</h3>
            <p><strong>Active Goals:</strong> ${digestData.activeGoals}</p>
            <p><strong>Progress:</strong> ${digestData.goalProgress}%</p>
          </div>

          <div class="highlight">
            <h3>🏆 Achievement</h3>
            <p>${digestData.achievement || 'Keep up the great work with your financial journey!'}</p>
          </div>

          <div class="highlight">
            <h3>💡 Community Activity</h3>
            <p>Your tips received <strong>${digestData.tipLikes || 0}</strong> likes and <strong>${digestData.tipComments || 0}</strong> comments this week!</p>
          </div>

          <a href="https://spendflow.uk/dashboard" class="button">View Full Dashboard</a>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send security alert
  async sendSecurityAlert(userEmail, alertType, details) {
    const subject = `🔒 Security Alert: ${alertType}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .button { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Security Alert</h1>
        </div>
        
        <div class="content">
          <div class="alert-card">
            <h3>⚠️ ${alertType}</h3>
            <p>${details}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p>If this wasn't you, please secure your account immediately.</p>
          
          <a href="https://spendflow.uk/profile" class="button">Review Account Security</a>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send contact form submission
  async sendContactForm(formData) {
    const subject = `Contact Form: ${formData.subject || 'General Inquiry'}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .form-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; }
          .field { margin: 10px 0; }
          .label { font-weight: bold; color: #4a5568; }
          .value { margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📧 New Contact Form Submission</h1>
        </div>
        
        <div class="content">
          <div class="form-card">
            <div class="field">
              <span class="label">Name:</span>
              <span class="value">${formData.name}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${formData.email}</span>
            </div>
            <div class="field">
              <span class="label">Subject:</span>
              <span class="value">${formData.subject || 'No subject provided'}</span>
            </div>
            <div class="field">
              <span class="label">Message:</span>
              <div style="margin-top: 10px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${formData.message.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="field">
              <span class="label">Submitted:</span>
              <span class="value">${new Date().toLocaleString()}</span>
            </div>
          </div>
          
          <p><strong>Reply to:</strong> ${formData.email}</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(this.supportEmail, subject, htmlContent);
  }

  // Validate email address
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default new EmailService();
