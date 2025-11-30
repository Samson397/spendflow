#!/usr/bin/env node

/**
 * Script to set the first admin user using Firebase Admin SDK
 * Run this ONCE to bootstrap your first admin user
 * 
 * Usage: node scripts/set-first-admin.js <user-email>
 * Example: node scripts/set-first-admin.js admin@yourcompany.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../functions/service-account-key.json'); // You'll need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setFirstAdmin(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);
    
    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log(`🔐 Admin claim set for user: ${email}`);
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    console.log('✅ Custom claims:', updatedUser.customClaims);
    
    console.log(`\n🎉 SUCCESS! ${email} is now an admin.`);
    console.log('They will need to sign out and sign back in for the changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 The user needs to sign up first before you can make them an admin.');
      console.log('Steps:');
      console.log('1. Have the user create an account at spendflow.uk');
      console.log('2. Run this script again with their email');
    }
  }
  
  process.exit(0);
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node scripts/set-first-admin.js <email>');
  console.log('Example: node scripts/set-first-admin.js admin@yourcompany.com');
  process.exit(1);
}

setFirstAdmin(email);
