// pages/api/accounts/populate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../lib/auth';
import { getAccountById } from '../../../lib/db';
import { populateAccountDatabase } from '../../../scripts/populate_account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
    
    try {
      // Only staff can populate accounts
      const user = await getCurrentUser(req, 'staff');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      const { accountId } = req.body;
      
      if (!accountId) {
        return res.status(400).json({ success: false, message: 'Account ID is required' });
      }
      
      // Get account from database
      const db = await getDb();
      const account = await db.get('SELECT * FROM account WHERE id = ?', [accountId]);
      
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      
      // Check if already populated
      if (account.is_populated) {
        return res.status(200).json({ success: true, message: 'Account is already populated', alreadyPopulated: true });
      }
      
      // Populate the account's database
      await populateAccountDatabase(accountId, account.accountId);
      
      // Mark as populated
      await db.run('UPDATE account SET is_populated = 1 WHERE id = ?', [accountId]);
      
      return res.status(200).json({ success: true, message: 'Account database populated successfully' });
    } catch (error) {
      console.error('Error populating account database:', error);
      return res.status(500).json({ success: false, message: 'Failed to populate account database' });
    }
  }
  
