// pages/parent.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import ProductSelection from '../components/ProductSelection';
import styles from '../styles/ParentDetail.module.css';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  year: number;
}

interface Product {
  id: number;
  name: string;
  type: string;
  amount: number;
}

interface Parent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emoji: string;
  addressLine1: string;
  addressLine2: string;
  subsurb: string;
  city: string;
  postCode: string;
  country: string;
  stripeCustomerId: string;
  hasPaymentMethod: boolean;
}

interface Subscription {
  id: number;
  name: string;
  period: string;
  studentFirstName?: string;
  studentLastName?: string;
}

interface Purchase {
  id: number;
  productName: string;
  productType: string;
  purchaseDate: string;
  description?: string;
  studentFirstName?: string;
  studentLastName?: string;
}

export default function ParentDetailPage() {
  const [staff, setStaff] = useState<any>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentItems, setStudentItems] = useState<Product[]>([]);
  const [parentItems, setParentItems] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        // Verify staff is logged in
        const staffRes = await fetch('/api/staff/profile');
        const staffData = await staffRes.json();
        
        if (!staffData.success) {
          router.push('/');
          return;
        }
        
        setStaff(staffData.staff);
        
        // Fetch parent details
        const parentRes = await fetch(`/api/staff/parent/${id}`);
        const parentData = await parentRes.json();
        
        if (parentData.success) {
          setParent(parentData.parent);
          setStudents(parentData.students || []);
          setSubscriptions(parentData.subscriptions || []);
          setPurchases(parentData.purchases || []);
        } else {
          setError('Parent not found');
        }
        
        // Fetch products
        const studentItemsRes = await fetch('/api/products?type=studentItem');
        const studentItemsData = await studentItemsRes.json();
        
        if (studentItemsData.success) {
          setStudentItems(studentItemsData.products);
        }
        
        const parentItemsRes = await fetch('/api/products?type=parentItem');
        const parentItemsData = await parentItemsRes.json();
        
        if (parentItemsData.success) {
          setParentItems(parentItemsData.products);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load parent data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' })
    });
    router.push('/');
  };

  const handleItemChange = (itemKey: string, increment: boolean) => {
    setSelectedItems(prev => {
      const updated = { ...prev };
      const currentVal = updated[itemKey] || 0;
      
      if (increment) {
        updated[itemKey] = currentVal + 1;
      } else if (currentVal > 0) {
        if (currentVal === 1) {
          delete updated[itemKey];
        } else {
          updated[itemKey] = currentVal - 1;
        }
      }
      
      return updated;
    });
  };

  const handleUpdate = async () => {
    if (!parent || Object.keys(selectedItems).length === 0) {
      setUpdateStatus('Please select items to add');
      return;
    }
    
    try {
      setUpdateLoading(true);
      setUpdateStatus('');
      
      const response = await fetch(`/api/staff/update-parent-items/${parent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateStatus('Items added successfully!');
        setSelectedItems({});
        
        // Refresh purchases
        const parentRes = await fetch(`/api/staff/parent/${id}`);
        const parentData = await parentRes.json();
        
        if (parentData.success) {
          setPurchases(parentData.purchases || []);
        }
        
        setTimeout(() => setUpdateStatus(''), 3000);
      } else {
        setUpdateStatus('Failed to add items: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating purchases:', error);
      setUpdateStatus('An error occurred while adding items');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!parent?.stripeCustomerId) return;
    
    try {
      const response = await fetch(`/api/staff/customer-portal/${parent.stripeCustomerId}`);
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        setError('Failed to open customer portal');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      setError('Failed to open customer portal');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!staff || !parent) {
    router.push('/');
    return null;
  }

  return (
    <div className={styles.container}>
      <TopBar
        userEmoji={staff.emoji}
        userName={`${staff.firstName} ${staff.lastName}`}
        role="staff"
        onLogout={handleLogout}
      />
      
      <main className={styles.main}>
        <h1 className={styles.title}>
          <span className={styles.emoji}>{parent.emoji}</span>
          {parent.firstName} {parent.lastName}
        </h1>
        
        <section className={styles.parentDetailsSection}>
          <div className={styles.detailsCard}>
            <h2>Contact Information</h2>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email:</span>
              <span className={styles.detailValue}>{parent.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Address:</span>
              <span className={styles.detailValue}>
                {parent.addressLine1}
                {parent.addressLine2 && <>, {parent.addressLine2}</>}
                <br />
                {parent.subsurb}, {parent.city} {parent.postCode}
                <br />
                {parent.country}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Payment Method:</span>
              <span className={styles.detailValue}>
                {parent.hasPaymentMethod ? (
                  <span className={styles.hasPayment}>✓ Payment method on file</span>
                ) : (
                  <span className={styles.noPayment}>✗ No payment method</span>
                )}
              </span>
            </div>
            
            <button 
              onClick={openCustomerPortal} 
              className={styles.portalButton}
              disabled={!parent.stripeCustomerId}
            >
              Open Customer Portal
            </button>
          </div>
        </section>
        
        <section className={styles.childrenSection}>
          <h2>Children</h2>
          
          {students.length === 0 ? (
            <p>No children registered</p>
          ) : (
            <div className={styles.studentsGrid}>
              {students.map(student => (
                <ProductSelection
                  key={student.id}
                  title={`${student.firstName} (Year ${student.year})`}
                  products={studentItems}
                  selectedItems={selectedItems}
                  keyPrefix={`student_${student.id}`}
                  onItemChange={handleItemChange}
                  emptyMessage="No items available for students"
                />
              ))}
            </div>
          )}
        </section>
        
        <ProductSelection
          title="Parent Items"
          products={parentItems}
          selectedItems={selectedItems}
          keyPrefix="parent"
          onItemChange={handleItemChange}
          onUpdate={handleUpdate}
          updateButtonText="Add Selected Items"
          status={updateStatus}
          isLoading={updateLoading}
          emptyMessage="No items available for parents"
        />
        
        <section className={styles.subscriptionsSection}>
          <h2>Subscriptions</h2>
          
          {subscriptions.length === 0 ? (
            <p>No subscriptions found</p>
          ) : (
            <div className={styles.subscriptionsTable}>
              <div className={styles.tableHeader}>
                <div>Name</div>
                <div>Period</div>
                <div>Student</div>
              </div>
              
              {subscriptions.map(subscription => (
                <div key={subscription.id} className={styles.tableRow}>
                  <div>{subscription.name}</div>
                  <div>{subscription.period}</div>
                  <div>
                    {subscription.studentFirstName 
                      ? `${subscription.studentFirstName} ${subscription.studentLastName}`
                      : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className={styles.purchasesSection}>
          <h2>Purchases</h2>
          
          {purchases.length === 0 ? (
            <p>No purchases found</p>
          ) : (
            <div className={styles.purchasesTable}>
              <div className={styles.tableHeader}>
                <div>Item</div>
                <div>Date</div>
                <div>Student</div>
                <div>Type</div>
              </div>
              
              {purchases.map(purchase => (
                <div key={purchase.id} className={styles.tableRow}>
                  <div>{purchase.productName}</div>
                  <div>{new Date(purchase.purchaseDate).toLocaleDateString()}</div>
                  <div>
                    {purchase.studentFirstName 
                      ? `${purchase.studentFirstName} ${purchase.studentLastName}`
                      : 'N/A'}
                  </div>
                  <div>{purchase.productType}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
