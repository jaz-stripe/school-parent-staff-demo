// pages/api/staff/embedded/recent-transactions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../../../../lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req, 'staff');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
      apiVersion: '2023-10-16',
    });
    
    // Get recent payments
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
      expand: ['data.customer']
    });
    
    // Filter for successful payments
    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded');
    
    // Create a simple HTML table to display
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recent Transactions</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #0095cf;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .amount {
            text-align: right;
          }
          .status-succeeded {
            color: #4CAF50;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th>Customer</th>
            <th>Transaction ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
          ${paymentIntents.data.map(payment => {
            const customer = payment.customer as Stripe.Customer;
            const date = new Date(payment.created * 1000).toLocaleDateString();
            const amount = (payment.amount / 100).toFixed(2);
            const currency = payment.currency.toUpperCase();
            const statusClass = payment.status === 'succeeded' ? 'status-succeeded' : '';
            
            return `
              <tr>
                <td>${customer?.name || customer?.email || 'N/A'}</td>
                <td>${payment.id}</td>
                <td>${date}</td>
                <td class="amount">${currency} ${amount}</td>
                <td class="${statusClass}">${payment.status}</td>
              </tr>
            `;
          }).join('')}
        </table>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`<html><body><p>Error fetching data: ${error.message}</p></body></html>`);
  }
}
