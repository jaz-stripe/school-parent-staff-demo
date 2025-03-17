// pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllProducts } from '../../lib/products';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const type = req.query.type as string | undefined;
    const products = await getAllProducts(type);
    
    return res.status(200).json({ 
      success: true, 
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
