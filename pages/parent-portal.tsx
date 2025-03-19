// pages/parent-portal.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import ProductSelection from '../components/ProductSelection';
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
  const [updateLoading, setUpdateLoading] = useState(false);
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
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'parent' })
    });
    router.push('/');
  };

  // Updated item change handler that works with ProductSelection component
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
    try {
      setUpdateLoading(true);
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
    } finally {
      setUpdateLoading(false);
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
        <h1 className={styles.title}>Welcome, {parent.firstName}!</h1>
        
        <section className={styles.studentsSection}>
          <h2>Your Children</h2>
          
          {students.length === 0 ? (
            <p className={styles.emptyState}>No children registered yet.</p>
          ) : (
            students.map(student => (
              <ProductSelection
                key={student.id}
                title={`${student.firstName} ${student.lastName} (Year ${student.year})`}
                products={studentItems}
                selectedItems={selectedItems}
                keyPrefix={`student_${student.id}`}
                onItemChange={handleItemChange}
                emptyMessage="No items available for students"
              />
            ))
          )}
        </section>
        
        <ProductSelection
          title="Items for Parents"
          products={parentItems}
          selectedItems={selectedItems}
          keyPrefix="parent"
          onItemChange={handleItemChange}
          onUpdate={handleUpdate}
          updateButtonText="Update Purchases"
          status={updateStatus}
          isLoading={updateLoading}
          emptyMessage="No items available for parents"
        />
        
        <div className={styles.portalLinkContainer}>
          <a href="/api/portal" className={styles.portalLink}>
            Go to Payments and Invoices Portal
          </a>
        </div>
      </main>
    </div>
  );
}
