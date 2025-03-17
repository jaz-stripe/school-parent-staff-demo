// pages/parent-portal.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/ParentPortal.module.css';

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
}

export default function ParentPortal() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentItems, setStudentItems] = useState<Product[]>([]);
  const [parentItems, setParentItems] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  
  const router = useRouter();

  // Fetch parent profile, students, and available items
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch parent profile
        const profileRes = await fetch('/api/parent/profile');
        const profileData = await profileRes.json();
        
        if (!profileData.success) {
          router.push('/');
          return;
        }
        
        setParent(profileData.parent);
        
        // Fetch students
        const studentsRes = await fetch('/api/parent/students');
        const studentsData = await studentsRes.json();
        
        if (studentsData.success) {
          setStudents(studentsData.students);
        }
        
        // Fetch available items
        const itemsRes = await fetch('/api/products');
        const itemsData = await itemsRes.json();
        
        if (itemsData.success) {
          setStudentItems(itemsData.products.filter((p: Product) => p.type === 'studentItem'));
          setParentItems(itemsData.products.filter((p: Product) => p.type === 'parentItem'));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load your information');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

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
    try {
      setUpdateStatus('Updating...');
      
      const response = await fetch('/api/parent/update-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateStatus('Items updated successfully!');
        setSelectedItems({});
        setTimeout(() => setUpdateStatus(''), 3000);
      } else {
        setUpdateStatus('Failed to update items: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating purchases:', error);
      setUpdateStatus('An error occurred while updating items');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!parent) {
    router.push('/');
    return null;
  }

  return (
    <div className={styles.container}>
      <TopBar
        userEmoji={parent.emoji}
        userName={`${parent.firstName} ${parent.lastName}`}
        role="parent"
        onLogout={handleLogout}
      />
      
      <main className={styles.main}>
        <h1>Welcome, {parent.firstName}!</h1>
        
        <section className={styles.studentsSection}>
          <h2>Your Children</h2>
          
          {students.length === 0 ? (
            <p>No children registered yet.</p>
          ) : (
            students.map(student => (
              <div key={student.id} className={styles.studentCard}>
                <div className={styles.studentHeader}>
                  <h3>{student.firstName} {student.lastName}</h3>
                  <span className={styles.yearBadge}>Year {student.year}</span>
                </div>
                
                <h4>Available Items</h4>
                <div className={styles.itemsGrid}>
                  {studentItems.map(item => {
                    const itemKey = `student_${student.id}_${item.id}`;
                    const quantity = selectedItems[itemKey] || 0;
                    
                    return (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemInfo}>
                          <span>{item.name}</span>
                          // pages/parent-portal.tsx (continued)
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
            ))
          )}
        </section>
        
        <section className={styles.parentItemsSection}>
          <h2>Items for Parents</h2>
          
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
              Update Purchases
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
        
        <div className={styles.portalLinkContainer}>
          <a href="/api/portal" className={styles.portalLink}>
            Go to Payments and Invoices Portal
          </a>
        </div>
      </main>
    </div>
  );
}
