// pages/api/accounts/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createAccount } from '../../../lib/db';
import { createStripeConnectAccount, createAccountOnboardingLink } from '../../../lib/stripe';
import { createStaffMember } from '../../../lib/parentStudent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, logo, country, personName } = req.body;

  if (!name || !email || !logo || !country || !personName) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Create Stripe Connect account
    const stripeAccount = await createStripeConnectAccount({
      email,
      country,
      type: 'standard',
      business_type: 'company',
      company: {
        name
      }
    });
    
    // Create account in our database
    const account = await createAccount({
      accountId: stripeAccount.id,
      name,
      email,
      logo,
      country,
      onboarding_complete: false
    });
    
    // Create staff member for this account
    const firstName = personName.split(' ')[0] || 'School';
    const lastName = personName.split(' ').slice(1).join(' ') || 'Admin';
    
    await createStaffMember({
      firstName,
      lastName,
      email,
      password: 'password', // Default password
      emoji: '👨‍🏫',
      accountId: account.id
    });
    
    // Create account onboarding link
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/accounts/onboarding-complete?accountId=${account.id}`;
    const refreshUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding`;
    
    const accountLink = await createAccountOnboardingLink(stripeAccount.id, returnUrl, refreshUrl);
    
    return res.status(200).json({
      success: true,
      accountId: account.id,
      stripeAccountId: stripeAccount.id,
      onboardingUrl: accountLink.url
    });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
}
