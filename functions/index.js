/* eslint-disable */
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
admin.initializeApp();

// Set admin custom claims (call this once to make a user admin)
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only allow if called by an existing admin or if no admins exist yet
  const { uid } = data;
  
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'UID is required');
  }

  try {
    // Check if any admin exists
    const listUsersResult = await admin.auth().listUsers();
    const existingAdmins = [];
    
    for (const user of listUsersResult.users) {
      if (user.customClaims && user.customClaims.admin === true) {
        existingAdmins.push(user);
      }
    }

    // If no admins exist, allow creating the first admin
    // Otherwise, require the caller to be an admin
    if (existingAdmins.length > 0) {
      if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create new admins');
      }
    }

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    
    return { success: true, message: 'Admin claim set successfully' };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to set admin claim');
  }
});

// Remove admin custom claims
exports.removeAdminClaim = functions.https.onCall(async (data, context) => {
  // Only allow if called by an admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can remove admin access');
  }

  const { uid } = data;
  
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'UID is required');
  }

  try {
    // Remove admin custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: false });
    
    return { success: true, message: 'Admin claim removed successfully' };
  } catch (error) {
    console.error('Error removing admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to remove admin claim');
  }
});

// Gmail transporter configuration
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: functions.config().gmail.email,
      pass: functions.config().gmail.password,
    },
  });
};

// Main email sending function
exports.sendEmail = functions.https.onRequest(async (req, res) => {
  // Enable CORS for specific domains only
  const allowedOrigins = [
    "https://spendflow.uk",
    "https://spendflow.app",
    "https://www.spendflow.uk",
    "https://www.spendflow.app"
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {to, subject, html, text, fromName, replyTo} = req.body;

    if (!to || !subject || (!html && !text)) {
      res.status(400).json({
        error: "Missing required fields: to, subject, and html or text"
      });
      return;
    }

    // Create transporter with provided auth or default Gmail
    const transporter = createGmailTransporter();

    const mailOptions = {
      from: `${fromName || "SpendFlow"} <${functions.config().gmail.email}>`,
      replyTo: replyTo || functions.config().gmail.email,
      to: to,
      subject: subject,
      html: html,
      text: text || stripHtml(html),
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", result.messageId);

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      provider: "gmail",
    });
  } catch (error) {
    console.error("Error sending email:", error);

    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
});

// Daily spending summary (runs every day at 8 PM)
exports.dailySpendingSummary = functions.pubsub.schedule("0 20 * * *").timeZone("Europe/London").onRun(async (context) => {
  const db = admin.firestore();
  const transporter = createGmailTransporter();

  try {
    // Get all users who have daily summaries enabled
    const usersSnapshot = await db.collection("users")
      .where("notificationSettings.dailySummary", "==", true)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users have daily summaries enabled");
      return;
    }

    const promises = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      
      const promise = (async () => {
        try {
          // Get today's transactions for this user
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const transactionsSnapshot = await db.collection("users")
            .doc(userDoc.id)
            .collection("transactions")
            .where("date", ">=", today)
            .where("date", "<", tomorrow)
            .get();

          let totalSpent = 0;
          let transactionCount = 0;
          const categories = {};

          transactionsSnapshot.forEach((transactionDoc) => {
            const transaction = transactionDoc.data();
            if (transaction.type === "expense") {
              totalSpent += transaction.amount;
              transactionCount++;
              
              const category = transaction.category || "Other";
              categories[category] = (categories[category] || 0) + transaction.amount;
            }
          });

          // Send email summary
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
                .negative { color: #ef4444; }
                .category { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>📊 Daily Spending Summary</h1>
                <p>${today.toLocaleDateString()}</p>
              </div>
              
              <div class="content">
                <div class="summary-card">
                  <h2>Today's Overview</h2>
                  <div class="category">
                    <span>Total Spent:</span>
                    <span class="amount negative">£${totalSpent.toFixed(2)}</span>
                  </div>
                  <div class="category">
                    <span>Transactions:</span>
                    <span>${transactionCount}</span>
                  </div>
                </div>

                ${Object.keys(categories).length > 0 ? `
                <div class="summary-card">
                  <h2>💳 Spending by Category</h2>
                  ${Object.entries(categories).map(([category, amount]) => `
                    <div class="category">
                      <span>${category}:</span>
                      <span class="amount">£${amount.toFixed(2)}</span>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                <p>Keep up the great work with your financial tracking! 💰</p>
              </div>
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: "SpendFlow <spendflowapp@gmail.com>",
            to: userData.email,
            subject: `📊 Daily Spending Summary - ${today.toLocaleDateString()}`,
            html: htmlContent
          });

          console.log(`Daily summary sent to ${userData.email}`);
        } catch (error) {
          console.error(`Failed to send daily summary to ${userData.email}:`, error);
        }
      })();

      promises.push(promise);
    });

    await Promise.all(promises);
    console.log(`Processed daily summaries for ${usersSnapshot.size} users`);

  } catch (error) {
    console.error("Error processing daily summaries:", error);
  }
});

// Monthly report (runs on 1st of each month at 9 AM)
exports.monthlyReport = functions.pubsub.schedule("0 9 1 * *").timeZone("Europe/London").onRun(async (context) => {
  const db = admin.firestore();
  const transporter = createGmailTransporter();

  try {
    // Get all users who have monthly reports enabled
    const usersSnapshot = await db.collection("users")
      .where("notificationSettings.monthlyReport", "==", true)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users have monthly reports enabled");
      return;
    }

    const promises = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      
      const promise = (async () => {
        try {
          // Get last month's data
          const now = new Date();
          const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const transactionsSnapshot = await db.collection("users")
            .doc(userDoc.id)
            .collection("transactions")
            .where("date", ">=", firstDayLastMonth)
            .where("date", "<", firstDayThisMonth)
            .get();

          let totalIncome = 0;
          let totalExpenses = 0;
          const categories = {};

          transactionsSnapshot.forEach((transactionDoc) => {
            const transaction = transactionDoc.data();
            if (transaction.type === "income") {
              totalIncome += transaction.amount;
            } else if (transaction.type === "expense") {
              totalExpenses += transaction.amount;
              
              const category = transaction.category || "Other";
              categories[category] = (categories[category] || 0) + transaction.amount;
            }
          });

          const netSavings = totalIncome - totalExpenses;
          const monthName = firstDayLastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          // Get savings goals progress
          const goalsSnapshot = await db.collection("users")
            .doc(userDoc.id)
            .collection("savingsGoals")
            .get();

          const savingsGoals = [];
          goalsSnapshot.forEach((goalDoc) => {
            const goal = goalDoc.data();
            const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            savingsGoals.push({
              name: goal.name,
              progress: progress,
              current: goal.currentAmount,
              target: goal.targetAmount
            });
          });

          // Send monthly report email
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
              </style>
            </head>
            <body>
              <div class="header">
                <h1>💰 SpendFlow Monthly Report</h1>
                <p>${monthName}</p>
              </div>
              
              <div class="content">
                <div class="summary-card">
                  <h2>📊 Financial Summary</h2>
                  <div class="category">
                    <span>Total Income:</span>
                    <span class="amount positive">£${totalIncome.toFixed(2)}</span>
                  </div>
                  <div class="category">
                    <span>Total Expenses:</span>
                    <span class="amount negative">£${totalExpenses.toFixed(2)}</span>
                  </div>
                  <div class="category">
                    <span>Net Savings:</span>
                    <span class="amount ${netSavings >= 0 ? 'positive' : 'negative'}">£${netSavings.toFixed(2)}</span>
                  </div>
                </div>

                ${Object.keys(categories).length > 0 ? `
                <div class="summary-card">
                  <h2>🏷️ Top Spending Categories</h2>
                  ${Object.entries(categories)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([category, amount]) => `
                    <div class="category">
                      <span>${category}:</span>
                      <span class="amount">£${amount.toFixed(2)}</span>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                ${savingsGoals.length > 0 ? `
                <div class="summary-card">
                  <h2>🎯 Savings Goals Progress</h2>
                  ${savingsGoals.map(goal => `
                    <div class="category">
                      <span>${goal.name}:</span>
                      <span>${goal.progress}% (£${goal.current.toFixed(2)}/£${goal.target.toFixed(2)})</span>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                <p>Great job tracking your finances this month! Keep up the momentum. 🚀</p>
              </div>
            </body>
            </html>
          `;

          await transporter.sendMail({
            from: "SpendFlow <spendflowapp@gmail.com>",
            to: userData.email,
            subject: `📊 SpendFlow Monthly Report - ${monthName}`,
            html: htmlContent
          });

          console.log(`Monthly report sent to ${userData.email}`);
        } catch (error) {
          console.error(`Failed to send monthly report to ${userData.email}:`, error);
        }
      })();

      promises.push(promise);
    });

    await Promise.all(promises);
    console.log(`Processed monthly reports for ${usersSnapshot.size} users`);

  } catch (error) {
    console.error("Error processing monthly reports:", error);
  }
});

// Payment reminders (runs every day at 9 AM)
exports.sendPaymentReminder = functions.pubsub.schedule("0 9 * * *").timeZone("Europe/London").onRun(async (context) => {
  const db = admin.firestore();
  const transporter = createGmailTransporter();

  try {
    // Get all users with payment reminders enabled
    const usersSnapshot = await db.collection("users")
      .where("notificationSettings.paymentReminders", "==", true)
      .get();

    if (usersSnapshot.empty) {
      console.log("No users have payment reminders enabled");
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const promises = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      
      const promise = (async () => {
        try {
          // Get user's cards that have due dates coming up
          const cardsSnapshot = await db.collection("users")
            .doc(userDoc.id)
            .collection("cards")
            .where("dueDate", ">=", today.toISOString().split('T')[0])
            .where("dueDate", "<=", nextWeek.toISOString().split('T')[0])
            .get();

          cardsSnapshot.forEach(async (cardDoc) => {
            const card = cardDoc.data();
            const dueDate = new Date(card.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            // Send reminder if due within 7 days
            if (daysUntilDue <= 7) {
              const urgency = daysUntilDue <= 1 ? "⚠️ URGENT: " : daysUntilDue <= 3 ? "💳 Reminder: " : "📅 Upcoming: ";
              
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
                      <h2>${urgency}Payment Due Soon</h2>
                      <p><strong>Card:</strong> ${card.name}</p>
                      <p><strong>Due Date:</strong> ${card.dueDate}</p>
                      <p><strong>Amount Due:</strong> <span class="amount">£${card.minimumPayment || card.balance}</span></p>
                      <p><strong>Days Until Due:</strong> ${daysUntilDue}</p>
                    </div>

                    <p>Don't forget to make your payment before the due date to avoid late fees.</p>
                    
                    <a href="https://spendflow.uk/payments" class="button">Make Payment Now</a>
                  </div>
                </body>
                </html>
              `;

              await transporter.sendMail({
                from: "SpendFlow <spendflowapp@gmail.com>",
                to: userData.email,
                subject: `${urgency}${card.name} Payment Due ${card.dueDate}`,
                html: htmlContent
              });

              console.log(`Payment reminder sent to ${userData.email} for ${card.name}`);
            }
          });
        } catch (error) {
          console.error(`Failed to send payment reminders to ${userData.email}:`, error);
        }
      })();

      promises.push(promise);
    });

    await Promise.all(promises);
    console.log(`Processed payment reminders for ${usersSnapshot.size} users`);

  } catch (error) {
    console.error("Error processing payment reminders:", error);
  }
});

// Send achievement notification (goal reached, milestone, etc.)
exports.sendAchievementNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { userId, type, achievementData } = data;

  if (!userId || !type) {
    throw new functions.https.HttpsError("invalid-argument", "Missing userId or type");
  }

  try {
    const db = admin.firestore();
    const transporter = createGmailTransporter();

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();

    // Check if user has achievement notifications enabled
    const settings = userData.notificationSettings || {};
    if (!settings.achievements) {
      return { success: true, skipped: true, reason: "Achievement notifications disabled" };
    }

    let htmlContent = "";
    let subject = "";

    switch (type) {
      case "goal_achieved":
        htmlContent = `
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
                <p>You've successfully reached your <strong>${achievementData.goalName}</strong> goal!</p>
                <p class="amount">£${achievementData.targetAmount}</p>
                <p>It took you ${achievementData.timeToAchieve} to reach this milestone.</p>
              </div>

              <p>This is a fantastic achievement! Your dedication to saving has paid off.</p>
              <p>Consider setting your next financial goal to continue building your wealth.</p>
            </div>
          </body>
          </html>
        `;
        subject = `🎉 Congratulations! You've reached your ${achievementData.goalName} goal!`;
        break;

      case "milestone":
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .milestone { background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin: 10px 0; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🌟 Milestone Reached!</h1>
            </div>
            
            <div class="content">
              <div class="milestone">
                <h2>🎯 Amazing Progress!</h2>
                <p>You've reached a new milestone: <strong>${achievementData.milestone}</strong></p>
                <p>You're ${achievementData.percentage}% of the way to your goal!</p>
              </div>

              <p>Keep up the great work! Every step counts toward your financial success.</p>
            </div>
          </body>
          </html>
        `;
        subject = `🌟 Milestone Reached: ${achievementData.milestone}`;
        break;

      default:
        throw new functions.https.HttpsError("invalid-argument", "Invalid achievement type");
    }

    await transporter.sendMail({
      from: "SpendFlow <spendflowapp@gmail.com>",
      to: userData.email,
      subject: subject,
      html: htmlContent
    });

    return { success: true, message: "Achievement notification sent" };

  } catch (error) {
    console.error("Error sending achievement notification:", error);
    throw new functions.https.HttpsError("internal", "Failed to send achievement notification");
  }
});

// Send push notification to user
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { userId, title, body, data: notificationData } = data;

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    const db = admin.firestore();

    // Get user's FCM token
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const fcmToken = userData.notificationToken;

    if (!fcmToken) {
      return { success: true, skipped: true, reason: "No FCM token found" };
    }

    // Check if user has push notifications enabled
    const settings = userData.notificationSettings || {};
    if (!settings.push) {
      return { success: true, skipped: true, reason: "Push notifications disabled" };
    }

    // Send push notification
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: notificationData || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Push notification sent successfully:", response);

    return { success: true, messageId: response };

  } catch (error) {
    console.error("Error sending push notification:", error);
    
    // If token is invalid, remove it
    if (error.code === "messaging/registration-token-not-registered") {
      try {
        await db.collection("users").doc(userId).update({
          notificationToken: admin.firestore.FieldValue.delete(),
        });
        console.log("Removed invalid FCM token for user:", userId);
      } catch (updateError) {
        console.error("Error removing invalid token:", updateError);
      }
    }

    throw new functions.https.HttpsError("internal", "Failed to send push notification");
  }
});

// Update FCM token for user
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { fcmToken } = data;

  if (!fcmToken) {
    throw new functions.https.HttpsError("invalid-argument", "Missing FCM token");
  }

  try {
    const db = admin.firestore();
    const userId = context.auth.uid;

    // Update user's FCM token
    await db.collection("users").doc(userId).update({
      notificationToken: fcmToken,
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("FCM token updated for user:", userId);

    return { success: true, message: "FCM token updated successfully" };

  } catch (error) {
    console.error("Error updating FCM token:", error);
    throw new functions.https.HttpsError("internal", "Failed to update FCM token");
  }
});

// Test notification (for development/testing)
exports.testNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { type } = data;

  try {
    const db = admin.firestore();
    const userId = context.auth.uid;

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();

    switch (type) {
      case "email":
        // Send test email
        const transporter = createGmailTransporter();
        await transporter.sendMail({
          from: "SpendFlow <spendflowapp@gmail.com>",
          to: userData.email,
          subject: "🧪 Test Email from SpendFlow",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🧪 Test Email</h1>
              </div>
              <div class="content">
                <p>This is a test email from SpendFlow to verify your email notifications are working.</p>
                <p>If you received this email, your email settings are configured correctly! ✅</p>
                <p>Sent at: ${new Date().toLocaleString()}</p>
              </div>
            </body>
            </html>
          `,
        });
        break;

      case "push":
        // Send test push notification
        const fcmToken = userData.notificationToken;
        if (!fcmToken) {
          return { success: false, error: "No FCM token found" };
        }

        const message = {
          token: fcmToken,
          notification: {
            title: "🧪 Test Notification",
            body: "This is a test push notification from SpendFlow",
          },
          data: {
            type: "test",
            screen: "Dashboard",
          },
        };

        await admin.messaging().send(message);
        break;

      default:
        throw new functions.https.HttpsError("invalid-argument", "Invalid test type");
    }

    return { success: true, message: `${type} test notification sent successfully` };

  } catch (error) {
    console.error("Error sending test notification:", error);
    throw new functions.https.HttpsError("internal", "Failed to send test notification");
  }
});

// Send welcome email
exports.sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userEmail, userName} = data;

  if (!userEmail || !userName) {
    throw new functions.https.HttpsError("invalid-argument", "Missing userEmail or userName");
  }

  try {
    const transporter = createGmailTransporter();
    
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

          <a href="https://spendflow.uk/dashboard" class="button">Open SpendFlow Dashboard</a>

          <p>If you have any questions, just reply to this email. We're here to help!</p>
          
          <p>Happy saving! 💰<br>
          The SpendFlow Team</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: "SpendFlow <spendflowapp@gmail.com>",
      to: userEmail,
      subject: `🎉 Welcome to SpendFlow, ${userName}!`,
      html: htmlContent
    });

    return { success: true, message: "Welcome email sent" };

  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new functions.https.HttpsError("internal", "Failed to send welcome email");
  }
});

// Utility function to strip HTML tags
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}
