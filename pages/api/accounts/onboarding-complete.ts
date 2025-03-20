// pages/api/accounts/onboarding-complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccountById, updateAccountOnboarding } from '../../../lib/db';
import { retrieveStripeAccount } from '../../../lib/stripe';
import { populateAccountDatabase } from '../../../scripts/populate_account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accountId } = req.query;
  
  if (!accountId || Array.isArray(accountId)) {
    return res.status(400).send('Missing or invalid account ID');
  }

  try {
    const dbAccountId = parseInt(accountId, 10);
    const dbAccount = await getAccountById(dbAccountId);
    
    if (!dbAccount) {
      return res.redirect('/?error=account_not_found');
    }
    
    // Check the account status in Stripe
    const stripeAccount = await retrieveStripeAccount(dbAccount.accountId);
    
    // Check if onboarding is complete
    const isOnboardingComplete = 
      stripeAccount.details_submitted && 
      stripeAccount.charges_enabled;
    
    // Update our database with onboarding status
    await updateAccountOnboarding(
      dbAccountId, 
      isOnboardingComplete, 
      stripeAccount.capabilities
    );
    
    if (isOnboardingComplete) {
      // If onboarding is complete, populate the account's database
      try {
        await populateAccountDatabase(dbAccountId, dbAccount.accountId);
        console.log(`Database populated for account ${dbAccountId}`);
      } catch (populateError) {
        console.error(`Error populating database for account ${dbAccountId}:`, populateError);
        // Continue even if population fails - we can try again later
      }
    }
    
    // Redirect to staff portal with the account ID
    res.redirect(`/staff-portal?accountId=${dbAccountId}`);
  } catch (error) {
    console.error('Error handling onboarding callback:', error);
    res.redirect('/?error=onboarding_error');
  }
}
