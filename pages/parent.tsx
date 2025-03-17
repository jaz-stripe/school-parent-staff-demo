// pages/parent.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/ParentDetail.module.css';

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
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load parent data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleItemChange = (type: string, id: number, studentId?: number) => {
    const key = studentId ? `student_${studentId}_${id}` : `parent_${id}`;
    
    setSelectedItems(prev => {
      const newItems = { ...prev };
      
      if (newItems[key]) {
        newItems[key]++;
      } else {
        newItems[key] = 1;
      }
      
      return newItems;
    });
  };

  const decreaseItem = (type: string, id: number, studentId?: number) => {
    const key = studentId ? `student_${studentId}_${id}` : `parent_${id}`;
    
    setSelectedItems(prev => {
      const newItems = { ...prev };
      
      if (newItems[key] && newItems[key] > 0) {
        newItems[key]--;
        
        if (newItems[key] === 0) {
          delete newItems[key];
        }
      }
      
      return newItems;
    });
  };

  const handleUpdate = async () => {
    if (!parent || Object.keys(selectedItems).length === 0) {
      setUpdateStatus('Please select items to add');
      return;
    }
    
    try {
      setUpdateStatus('Updating...');
      
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
        <h1>
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
                <div key={student.id} className={styles.studentCard}>
                  <div className={styles.studentHeader}>
                    <h3>{student.firstName} {student.lastName}</h3>
                    <span className={styles.yearBadge}>Year {student.year}</span>
                  </div>
                  
                  <h4>Add Items</h4>
                  <div className={styles.itemsGrid}>
                    {studentItems.map(item => {
                      const itemKey = `student_${student.id}_${item.id}`;
                      const quantity = selectedItems[itemKey] || 0;
                      
                      return (
                        <div key={item.id} className={styles.itemCard}>
                          <div className={styles.itemInfo}>
                            <span>{item.name}</span>
                            <span className={styles.itemPrice}>${(item.amount / 100).toFixed(2)}</span>
                          </div>
                          
                          <div className={styles.quantityControls}>
                            <button
                              onClick={() => decreaseItem('student', item.id, student.id)}
                              disabled={quantity === 0}
                            >
                              -
                            </button>
                            <span>{quantity}</span>
                            <button
                              onClick={() => handleItemChange('student', item.id, student.id)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className={styles.parentItemsSection}>
          <h2>Add Parent Items</h2>
          
          <div className={styles.itemsGrid}>
            {parentItems.map(item => {
              const itemKey = `parent_${item.id}`;
              const quantity = selectedItems[itemKey] || 0;
              
              return (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemInfo}>
                    <span>{item.name}</span>
                    <span className={styles.itemPrice}>${(item.amount / 100).toFixed(2)}</span>
                  </div>
                  
                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => decreaseItem('parent', item.id)}
                      disabled={quantity === 0}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      onClick={() => handleItemChange('parent', item.id)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        
        {Object.keys(selectedItems).length > 0 && (
          <div className={styles.updateSection}>
            <button
              onClick={handleUpdate}
              className={styles.updateButton}
              disabled={updateStatus === 'Updating...'}
            >
              Add Items
            </button>
            {updateStatus && (
              <p className={
                updateStatus.includes('success')
                  ? styles.successStatus
                  : styles.errorStatus
              }>
                {updateStatus}
              </p>
            )}
          </div>
        )}
        
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
