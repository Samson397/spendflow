import { db, auth } from '../config/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';

// Rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: 1,
  CATEGORIES: {
    PAYMENT_REMINDER: 'payment_reminder',
    TIP_LIKED: 'tip_liked',
    BUDGET_ALERT: 'budget_alert',
    WEEKLY_DIGEST: 'weekly_digest',
    SECURITY_ALERT: 'security_alert',
    CONTACT_FORM: 'contact_form'
  }
};

class EmailService {
  constructor() {
    this.supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@spendflow.uk';
    this.defaultSenderName = 'SpendFlow';
    this.firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'spendflowapp';
    this.firebaseFunctionsRegion = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';
    this.functionsBaseUrl = `https://${this.firebaseFunctionsRegion}-${this.firebaseProjectId}.cloudfunctions.net`;
    this.sendEmailFunctionUrl = `${this.functionsBaseUrl}/sendEmail`;
    
    // Initialize rate limiting cache
    this.rateLimitCache = new Map();
    
    // Initialize Firebase instances using pre-initialized config
    this.db = db;
    this.auth = auth;
    
    // Cache for notification settings
    this.notificationCache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  // Check if user has email notifications enabled with caching
  async checkEmailEnabled(userId) {
    if (!userId) return true; // Default to enabled if no userId
    
    // Check cache first
    const cached = this.notificationCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
      return cached.enabled;
    }
    
    try {
      const userRef = doc(this.db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      let enabled = true; // Default to enabled
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const settings = userData.notificationSettings || { email: true };
        enabled = settings.email !== false;
      }
      
      // Update cache
      this.notificationCache.set(userId, {
        enabled,
        timestamp: Date.now()
      });
      
      return enabled;
    } catch (error) {
      console.error('Error checking email settings:', error);
      return true; // Default to enabled on error
    }
  }

  // Check rate limit for a user/category
  isRateLimited(userId, category = 'default') {
    if (!userId) return false;
    
    const key = `${userId}:${category}`;
    const now = Date.now();
    
    // Clean up old entries
    this.rateLimitCache.forEach((value, key) => {
      if (now - value.timestamp > RATE_LIMIT.WINDOW_MS) {
        this.rateLimitCache.delete(key);
      }
    });
    
    const entry = this.rateLimitCache.get(key);
    
    if (!entry) {
      this.rateLimitCache.set(key, {
        count: 1,
        timestamp: now
      });
      return false;
    }
    
    if (now - entry.timestamp > RATE_LIMIT.WINDOW_MS) {
      entry.count = 1;
      entry.timestamp = now;
      return false;
    }
    
    if (entry.count >= RATE_LIMIT.MAX_REQUESTS) {
      return true;
    }
    
    entry.count++;
    return false;
  }

  // Log email to Firestore
  async logEmail(emailData, status = 'sent') {
    try {
      await addDoc(collection(this.db, 'emailLogs'), {
        ...emailData,
        status,
        sentAt: serverTimestamp(),
        platform: Platform.OS,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  // Send email with retry logic
  async sendWithRetry(emailData, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(this.sendEmailFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          return { 
            success: true, 
            provider: 'firebase-functions', 
            messageId: result.messageId 
          };
        }

        // If we get a 404, try the v2 endpoint
        if (response.status === 404 && i === 0) {
          const v2Url = this.sendEmailFunctionUrl.replace('/v1/', '/v2/');
          if (v2Url !== this.sendEmailFunctionUrl) {
            console.log('Trying v2 endpoint...');
            this.sendEmailFunctionUrl = v2Url;
            return this.sendWithRetry(emailData, retries - 1, delay * 2);
          }
        }

        // If we get a 401, the token might be expired
        if (response.status === 401 && i < retries - 1) {
          console.log('Authentication failed, refreshing token...');
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }

        // For other errors, throw the error
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  // Fallback to Firestore queue
  async fallbackToQueue(emailData, userId, category) {
    try {
      const docRef = await addDoc(collection(this.db, 'emailQueue'), {
        ...emailData,
        status: 'queued',
        attemptCount: 0,
        lastAttempt: null,
        nextAttempt: serverTimestamp(),
        createdAt: serverTimestamp(),
        userId: userId || null,
        category: category || 'general',
        platform: Platform.OS
      });
      
      console.log('Email queued with ID:', docRef.id);
      return { 
        success: true, 
        provider: 'firestore-queue',
        messageId: docRef.id,
        message: 'Email queued for processing'
      };
    } catch (error) {
      console.error('Error queuing email:', error);
      return { 
        success: false, 
        error: `Failed to send or queue email: ${error.message}`,
        provider: 'none'
      };
    }
  }

  // Send email using Gmail SMTP via backend
  async sendEmail(to, subject, htmlContent, textContent = '', userId = null, category = 'general') {
    // Validate email
    if (!this.isValidEmail(to)) {
      console.error('Invalid email address:', to);
      return { success: false, error: 'Invalid email address' };
    }

    // Check rate limit
    if (userId && this.isRateLimited(userId, category)) {
      console.warn(`Rate limit exceeded for user ${userId} (${category})`);
      return { 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.',
        rateLimited: true 
      };
    }

    // Check if user has email notifications enabled
    if (userId) {
      const emailEnabled = await this.checkEmailEnabled(userId);
      if (!emailEnabled) {
        console.log('Email notifications disabled for user:', userId);
        return { 
          success: true, 
          skipped: true, 
          reason: 'Email notifications disabled' 
        };
      }
    }

    // Sanitize all inputs
    const sanitizedSubject = this.sanitizeText(subject);
    const sanitizedHtml = this.sanitizeHtml(htmlContent);
    const sanitizedText = textContent ? this.sanitizeText(textContent) : this.stripHtml(htmlContent);

    const emailData = {
      to: to.trim(),
      subject: sanitizedSubject,
      html: sanitizedHtml,
      text: sanitizedText,
      fromName: this.defaultSenderName,
      replyTo: this.supportEmail
    };

    // Add to email log
    await this.logEmail({
      ...emailData,
      userId: userId || null,
      category,
      status: 'sending'
    });

    // Try Firebase Functions first
    try {
      const result = await this.sendWithRetry(emailData);
      
      // Log successful send
      await this.logEmail({
        ...emailData,
        userId: userId || null,
        category,
        status: 'sent',
        messageId: result.messageId
      });
      
      return result;
    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Log failure
      await this.logEmail({
        ...emailData,
        userId: userId || null,
        category,
        status: 'failed',
        error: error.message
      });
      
      // Fall back to queue
      return this.fallbackToQueue(emailData, userId, category);
    }
  }

  // Send payment reminder
  async sendPaymentReminder(userEmail, paymentData) {
    const safeCardName = this.sanitizeText(paymentData.cardName);
    const safeDueDate = this.sanitizeText(paymentData.dueDate);
    const subject = `💳 Payment Reminder: ${safeCardName} - Due ${safeDueDate}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f5576c 0%,#f093fb 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">💳 Payment Reminder</div>
                    <div style="font-size:16px;opacity:0.9;">Please pay before ${safeDueDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:12px;background:#fff5f5;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <div style="font-size:18px;font-weight:700;color:#b91c1c;margin-bottom:16px;">⚠️ Payment Due Soon</div>
                          <table role="presentation" width="100%" style="font-size:14px;color:#475569;">
                            <tr>
                              <td style="padding:4px 0;">Card</td>
                              <td align="right" style="font-weight:600;color:#0f172a;">${safeCardName}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;">Due Date</td>
                              <td align="right" style="font-weight:600;color:#b91c1c;">${safeDueDate}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;">Amount Due</td>
                              <td align="right" style="font-size:22px;font-weight:700;color:#dc2626;">£${paymentData.amount}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;">Minimum Payment</td>
                              <td align="right" style="font-weight:600;color:#0f172a;">£${paymentData.minimumPayment}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:24px;">
                      Don't forget to make your payment before the due date to avoid late fees or interest charges.
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-bottom:8px;">
                      <tr>
                        <td style="background:#4f46e5;border-radius:999px;">
                          <a href="https://spendflow.uk/payments" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Make Payment Now</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send tip liked notification
  async sendTipLikedNotification(userEmail, likerName, tipTitle) {
    const safeLiker = this.sanitizeText(likerName);
    const safeTipTitle = this.sanitizeText(tipTitle);
    const subject = `👍 Your tip was liked by ${safeLiker}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#ec4899 0%,#db2777 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">👍 Tip Liked!</div>
                    <div style="font-size:16px;opacity:0.9;">Someone found your tip helpful</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fbcfe8;border-radius:12px;background:#fdf2f8;margin-bottom:24px;">
                      <tr>
                        <td style="padding:24px;text-align:center;">
                          <div style="font-size:14px;color:#9d174d;margin-bottom:8px;">${safeLiker} liked your tip</div>
                          <div style="font-size:18px;font-weight:700;color:#be185d;margin-bottom:12px;">"${safeTipTitle}"</div>
                          <div style="font-size:14px;color:#475569;">Your financial wisdom is helping others! 🎉</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#ec4899;border-radius:999px;">
                          <a href="https://spendflow.uk/community/tips" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Your Tips</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send comment reply notification
  async sendReplyNotification(userEmail, replierName, originalComment, replyText) {
    const safeReplier = this.sanitizeText(replierName);
    const safeOriginalComment = this.sanitizeText(originalComment);
    const safeReplyText = this.sanitizeText(replyText);
    const subject = `💬 ${safeReplier} replied to your comment`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">💬 New Reply</div>
                    <div style="font-size:16px;opacity:0.9;">Someone replied to your comment</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbeafe;border-radius:12px;background:#eff6ff;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px;">
                          <div style="font-weight:600;color:#1d4ed8;margin-bottom:8px;">Your original comment:</div>
                          <div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:16px;">"${safeOriginalComment}"</div>
                          <div style="font-weight:600;color:#059669;margin-bottom:8px;">${safeReplier} replied:</div>
                          <div style="font-size:14px;color:#475569;line-height:1.6;">"${safeReplyText}"</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#3b82f6;border-radius:999px;">
                          <a href="https://spendflow.uk/community/tips" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Conversation</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send tip comment notification
  async sendTipCommentNotification(userEmail, commenterName, tipTitle, commentText) {
    const safeCommenter = this.sanitizeText(commenterName);
    const safeTipTitle = this.sanitizeText(tipTitle);
    const safeCommentText = this.sanitizeText(commentText);
    const subject = `💬 New comment on your tip`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">💬 New Comment</div>
                    <div style="font-size:16px;opacity:0.9;">Someone commented on your tip</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d1fae5;border-radius:12px;background:#ecfdf5;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px;">
                          <div style="font-weight:600;color:#059669;margin-bottom:8px;">On your tip: "${safeTipTitle}"</div>
                          <div style="font-weight:600;color:#059669;margin-bottom:8px;">${safeCommenter} commented:</div>
                          <div style="font-size:14px;color:#475569;line-height:1.6;">"${safeCommentText}"</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#10b981;border-radius:999px;">
                          <a href="https://spendflow.uk/community/tips" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Comment</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, userName) {
    const safeUserName = this.sanitizeText(userName || 'there');
    const subject = `🎉 Welcome to SpendFlow, ${safeUserName}!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">🎉 Welcome to SpendFlow!</div>
                    <div style="font-size:16px;opacity:0.9;">Your financial journey starts now, ${safeUserName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:16px;">🚀 Get Started with These Features:</div>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="width:50%;padding:0 8px;vertical-align:top;">
                          <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8f9fa;">
                            <tr>
                              <td style="padding:16px;font-size:15px;font-weight:700;color:#0f172a;">💳 Smart Banking</td>
                            </tr>
                            <tr>
                              <td style="padding:0 16px 16px 16px;font-size:13px;color:#475569;">
                                <div style="padding:2px 0;">• Track expenses</div>
                                <div style="padding:2px 0;">• Monitor cards</div>
                                <div style="padding:2px 0;">• Set budgets</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="width:50%;padding:0 8px;vertical-align:top;">
                          <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8f9fa;">
                            <tr>
                              <td style="padding:16px;font-size:15px;font-weight:700;color:#0f172a;">👥 Community</td>
                            </tr>
                            <tr>
                              <td style="padding:0 16px 16px 16px;font-size:13px;color:#475569;">
                                <div style="padding:2px 0;">• Share tips</div>
                                <div style="padding:2px 0;">• Learn from others</div>
                                <div style="padding:2px 0;">• Get inspired</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fef3c7;border-radius:12px;background:#fffbeb;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px;">
                          <div style="font-weight:700;color:#d97706;margin-bottom:8px;">💡 Pro Tip:</div>
                          <div style="font-size:14px;color:#475569;line-height:1.7;">Start by adding your first card and setting up a monthly budget. The more you track, the more insights you'll get!</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#667eea;border-radius:999px;">
                          <a href="https://spendflow.uk/dashboard" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Open Your Dashboard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send budget alert
  async sendBudgetAlert(userEmail, alertData) {
    const safeCategory = this.sanitizeText(alertData.category);
    const safeMessage = this.sanitizeMultiline(alertData.message || '');
    const subject = `⚠️ Budget Alert: ${safeCategory} spending is ${alertData.percentage}% of budget`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">⚠️ Budget Alert</div>
                    <div style="font-size:16px;opacity:0.9;">${safeCategory}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fed7aa;border-radius:12px;background:#fffbeb;margin-bottom:24px;">
                      <tr>
                        <td style="padding:24px;">
                          <table role="presentation" width="100%" style="font-size:14px;color:#475569;">
                            ${[
                              { label: 'Spent', value: `£${alertData.spent} of £${alertData.budget}` },
                              { label: 'Percentage', value: `${alertData.percentage}%` },
                              { label: 'Remaining', value: `£${alertData.remaining}` }
                            ].map(row => `
                              <tr>
                                <td style="padding:6px 0;">${row.label}</td>
                                <td align="right" style="font-weight:600;color:#0f172a;">${row.value}</td>
                              </tr>
                            `).join('')}
                            <tr>
                              <td colspan="2" style="padding:12px 0 0 0;">
                                <div style="width:100%;height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                                  <div style="width:${Math.min(alertData.percentage,100)}%;height:100%;background:${alertData.percentage > 90 ? '#dc2626' : alertData.percentage > 75 ? '#f59e0b' : '#10b981'};"></div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;color:#475569;line-height:1.6;">${safeMessage || 'Review your recent spending and adjust your budget accordingly.'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send weekly digest
  async sendWeeklyDigest(userEmail, userName, digestData) {
    const safeUserName = this.sanitizeText(userName || 'there');
    const safeAchievement = this.sanitizeMultiline(digestData.achievement || 'Keep up the great work with your financial journey!');
    const subject = `📊 Your Weekly SpendFlow Summary`;

    const statCards = [
      { title: '💰 This Week', rows: [`Spent: £${digestData.weeklySpent}`, `Saved: £${digestData.weeklySaved}`] },
      { title: '🎯 Goals Progress', rows: [`Active Goals: ${digestData.activeGoals}`, `Progress: ${digestData.goalProgress}%`] }
    ];
    
    const statCardsHtml = statCards.map(card => `
      <td style="width:50%;padding:0 8px;">
        <table role="presentation" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8f9fa;">
          <tr>
            <td style="padding:16px;font-size:15px;font-weight:700;color:#0f172a;">${card.title}</td>
          </tr>
          <tr>
            <td style="padding:0 16px 16px 16px;font-size:13px;color:#475569;">
              ${card.rows.map(row => `<div style="padding:4px 0;">${row}</div>`).join('')}
            </td>
          </tr>
        </table>
      </td>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">📊 Weekly Summary</div>
                    <div style="font-size:16px;opacity:0.9;">Here's how your week looked, ${safeUserName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        ${statCardsHtml}
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bae6fd;border-radius:12px;background:#f0f9ff;margin-bottom:16px;">
                      <tr>
                        <td style="padding:20px;">
                          <div style="font-weight:700;color:#0369a1;margin-bottom:8px;">🏆 Achievement</div>
                          <div style="font-size:14px;color:#0f172a;line-height:1.7;">${safeAchievement}</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;margin-bottom:24px;">
                      <tr>
                        <td style="padding:20px;">
                          <div style="font-weight:700;color:#1d4ed8;margin-bottom:8px;">💡 Community Activity</div>
                          <div style="font-size:14px;color:#0f172a;">Your tips received <strong>${digestData.tipLikes || 0}</strong> likes and <strong>${digestData.tipComments || 0}</strong> comments this week!</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#4f46e5;border-radius:999px;">
                          <a href="https://spendflow.uk/dashboard" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Full Dashboard</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send security alert
  async sendSecurityAlert(userEmail, alertType, details) {
    const safeAlertType = this.sanitizeText(alertType);
    const safeDetails = this.sanitizeMultiline(details || '');
    const subject = `🔒 Security Alert: ${safeAlertType}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;color:#f8fafc;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
                <tr>
                  <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">🔒 Security Alert</div>
                    <div style="font-size:16px;opacity:0.9;">${safeAlertType}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #4b5563;border-radius:12px;background:#1f2937;margin-bottom:24px;">
                      <tr>
                        <td style="padding:24px;color:#f8fafc;">
                          <div style="font-size:14px;line-height:1.6;margin-bottom:16px;">${safeDetails}</div>
                          <div style="font-size:12px;color:#9ca3af;">Time: ${new Date().toLocaleString()}</div>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;color:#e2e8f0;">If this wasn't you, please secure your account immediately.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="background:#dc2626;border-radius:999px;">
                          <a href="https://spendflow.uk/profile" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Review Account Security</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Send contact form submission
  // Send contact form submission
  async sendContactForm(formData) {
    const safeName = this.sanitizeText(formData.name || 'Anonymous');
    const safeEmail = this.sanitizeText(formData.email || '');
    const safeSubject = this.sanitizeText(formData.subject || 'General Inquiry');
    const safeMessage = this.sanitizeMultiline(formData.message || '');
    const subject = `Contact Form: ${safeSubject}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;color:#ffffff;">
                    <div style="font-size:26px;font-weight:700;margin-bottom:8px;">📧 New Contact Form Submission</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    ${[
                      { label: 'Name', value: safeName },
                      { label: 'Email', value: safeEmail },
                      { label: 'Subject', value: safeSubject || 'No subject provided' }
                    ].map(field => `
                      <table role="presentation" width="100%" style="border-bottom:1px solid #e2e8f0;padding:10px 0;">
                        <tr>
                          <td style="font-size:13px;font-weight:700;color:#475569;">${field.label}:</td>
                          <td align="right" style="font-size:14px;color:#0f172a;">${field.value}</td>
                        </tr>
                      </table>
                    `).join('')}
                    <div style="margin:20px 0;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px;">Message</div>
                      <div style="font-size:14px;color:#0f172a;line-height:1.8;">${safeMessage}</div>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Submitted: ${new Date().toLocaleString()}</div>
                    <p style="font-size:14px;color:#475569;"><strong>Reply to:</strong> ${safeEmail}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(this.supportEmail, subject, htmlContent);
  }

  // Utility function to strip HTML tags from text
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
  }

  // Sanitize text to prevent XSS attacks
  sanitizeText(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/`/g, '&#96;')
      .replace(/\$\{/g, '&#36;&#123;');
  }
  
  // Sanitize HTML content while preserving basic formatting
  sanitizeHtml(html) {
    if (!html) return '';
    return String(html)
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      // Allow basic formatting
      .replace(/&lt;(\/?(b|i|u|strong|em|p|br|div|span|a|h1|h2|h3|h4|h5|h6|table|tr|td|th|tbody|thead|ul|ol|li))([^>]*)&gt;/g, '<$1$3>')
      // Allow safe attributes
      .replace(/<([a-z][a-z0-9]*)\s+([^>]*?)(\/?)>/gi, (match, tag, attrs) => {
        // List of allowed attributes
        const allowedAttrs = ['href', 'title', 'alt', 'src', 'class', 'id', 'style', 'target'];
        // Only allow specific attributes
        const safeAttrs = attrs
          .split(/\s+/)
          .filter(attr => {
            const attrMatch = attr.match(/^([^=]+)=?/);
            return attrMatch && allowedAttrs.includes(attrMatch[1]);
          })
          .join(' ');
        return `<${tag} ${safeAttrs}>`;
      });
  }

  // Sanitize multiline text and convert line breaks to <br>
  sanitizeMultiline(text) {
    if (!text) return '';
    return this.sanitizeText(text).replace(/\n/g, '<br>');
  }

  // Validate email address format
  isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  // Parse bank statement email content into transaction objects
  parseStatementEmail(emailContent) {
    if (!emailContent) return [];
    
    const transactions = [];
    const lines = emailContent.split(/\r?\n/);
    let currentTransaction = null;
    
    try {
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Look for transaction start markers (date pattern)
        const dateMatch = trimmedLine.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        
        if (dateMatch) {
          // If we have a transaction in progress, save it
          if (currentTransaction) {
            transactions.push(currentTransaction);
          }
          
          // Start a new transaction
          currentTransaction = {
            date: dateMatch[1],
            description: '',
            amount: 0,
            raw: []
          };
          
          // Process the rest of the line
          const restOfLine = trimmedLine.slice(dateMatch[0].length).trim();
          if (restOfLine) {
            this.processTransactionLine(restOfLine, currentTransaction);
          }
        } else if (currentTransaction) {
          // If we're in a transaction, add to the current description
          this.processTransactionLine(trimmedLine, currentTransaction);
        }
      }
      
      // Add the last transaction if it exists
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error parsing statement email:', error);
      // Return whatever transactions we've successfully parsed so far
      return transactions;
    }
  }
  
  // Helper method to process a line of transaction data
  processTransactionLine(line, transaction) {
    if (!line || !transaction) return;
    
    // Add to raw lines for debugging
    transaction.raw.push(line);
    
    // Check for amount pattern (with currency symbol or sign)
    const amountMatch = line.match(/([+-]?\s*[£$€]?\s*\d+[\d,]*\.?\d{0,2})/);
    
    if (amountMatch && !transaction.amount) {
      // Extract and clean the amount
      let amountStr = amountMatch[0].replace(/[^\d.+-]/g, '');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount)) {
        transaction.amount = amount;
        // Remove the amount from the description
        line = line.replace(amountMatch[0], '').trim();
      }
    }
    
    // Add to description if there's content left
    if (line) {
      if (transaction.description) {
        transaction.description += ' ' + line;
      } else {
        transaction.description = line;
      }
    }
  }
}

export default new EmailService();
