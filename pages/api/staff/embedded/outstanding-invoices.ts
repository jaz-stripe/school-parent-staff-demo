// pages/api/staff/embedded/outstanding-invoices.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '../../../../lib/auth';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../../../../lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user || user.role !== 'staff') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
      apiVersion: '2023-10-16',
    });
    
    // Get outstanding invoices
    const invoices = await stripe.invoices.list({
      status: 'open',
      limit: 10,
      expand: ['data.customer']
    });
    
    // Create a simple HTML table list to display
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Outstanding Invoices</title>
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
            background-color: #4CAF50;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .amount {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th>Customer</th>
            <th>Invoice Number</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
          ${invoices.data.map(invoice => {
            const customer = invoice.customer as Stripe.Customer;
            const date = new Date(invoice.created * 1000).toLocaleDateString();
            const amount = (invoice.amount_due / 100).toFixed(2);
            const currency = invoice.currency.toUpperCase();
            
            return `
              <tr>
                <td>${customer.name || customer.email}</td>
                <td>${invoice.number}</td>
                <td>${date}</td>
                <td class="amount">${currency} ${amount}</td>
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
    console.error('Error fetching outstanding invoices:', error);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`<html><body><p>Error fetching data: ${error.message}</p></body></html>`);
  }
}
