// pages/parents.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/Parents.module.css';

interface Parent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emoji: string;
  hasPaymentMethod: boolean;
}

interface Product {
  id: number;
  name: string;
  type: string;
  amount: number;
}

export default function ParentsPage() {
  const [staff, setStaff] = useState<any>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParents, setSelectedParents] = useState<number[]>([]);
  const [parentItems, setParentItems] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  
  const router = useRouter();

  useEffect(() => {
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
        
        // Fetch parents
        const parentsRes = await fetch('/api/staff/parents');
        const parentsData = await parentsRes.json();
        
        if (parentsData.success) {
          setParents(parentsData.parents);
          setFilteredParents(parentsData.parents);
        }
        
        // Fetch parent items
        const itemsRes = await fetch('/api/products?type=parentItem');
        const itemsData = await itemsRes.json();
        
        if (itemsData.success) {
          setParentItems(itemsData.products);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  useEffect(() => {
    // Filter parents based on search term
    if (searchTerm) {
      const filtered = parents.filter(parent => 
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParents(filtered);
    } else {
      setFilteredParents(parents);
    }
  }, [searchTerm, parents]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' })
    });
    router.push('/');
  };

  const handleParentSelect = (parentId: number) => {
    setSelectedParents(prev => {
      if (prev.includes(parentId)) {
        return prev.filter(id => id !== parentId);
      } else {
        return [...prev, parentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedParents.length === filteredParents.length) {
      setSelectedParents([]);
    } else {
      setSelectedParents(filteredParents.map(parent => parent.id));
    }
  };

  const handleItemChange = (itemId: number) => {
    const key = `item_${itemId}`;
    
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

  const decreaseItem = (itemId: number) => {
    const key = `item_${itemId}`;
    
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
    if (selectedParents.length === 0 || Object.keys(selectedItems).length === 0) {
      setUpdateStatus('Please select parents and items first');
      return;
    }
    
    try {
      setUpdateStatus('Updating...');
      
      const response = await fetch('/api/staff/update-parent-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parentIds: selectedParents,
          items: selectedItems 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateStatus('Items added successfully!');
        setSelectedItems({});
        setTimeout(() => setUpdateStatus(''), 3000);
      } else {
        setUpdateStatus('Failed to add items: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating purchases:', error);
      setUpdateStatus('An error occurred while adding items');
    }
  };

  const handleViewParent = (parentId: number) => {
    router.push(`/parent?id=${parentId}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

// pages/parents.tsx (continued)
if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!staff) {
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
        <h1>Manage Parents</h1>
        
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <section className={styles.parentsSection}>
          <div className={styles.parentsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.headerCheckbox}>
                <input 
                  type="checkbox" 
                  checked={selectedParents.length === filteredParents.length && filteredParents.length > 0}
                  onChange={handleSelectAll}
                />
              </div>
              <div className={styles.headerName}>Name</div>
              <div className={styles.headerEmail}>Email</div>
              <div className={styles.headerPayment}>Payment Method</div>
              <div className={styles.headerAction}>Action</div>
            </div>
            
            {filteredParents.length === 0 ? (
              <div className={styles.emptyState}>No parents found</div>
            ) : (
              filteredParents.map(parent => (
                <div key={parent.id} className={styles.tableRow}>
                  <div className={styles.rowCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={selectedParents.includes(parent.id)}
                      onChange={() => handleParentSelect(parent.id)}
                    />
                  </div>
                  <div className={styles.rowName}>
                    <span className={styles.emoji}>{parent.emoji}</span>
                    {parent.firstName} {parent.lastName}
                  </div>
                  <div className={styles.rowEmail}>{parent.email}</div>
                  <div className={styles.rowPayment}>
                    {parent.hasPaymentMethod ? (
                      <span className={styles.hasPayment}>✓</span>
                    ) : (
                      <span className={styles.noPayment}>✗</span>
                    )}
                  </div>
                  <div className={styles.rowAction}>
                    <button 
                      onClick={() => handleViewParent(parent.id)}
                      className={styles.viewButton}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        
        {selectedParents.length > 0 && (
          <section className={styles.itemsSection}>
            <h2>Add Items to Selected Parents ({selectedParents.length})</h2>
            
            <div className={styles.itemsGrid}>
              {parentItems.map(item => {
                const itemKey = `item_${item.id}`;
                const quantity = selectedItems[itemKey] || 0;
                
                return (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemInfo}>
                      <span>{item.name}</span>
                      <span className={styles.itemPrice}>${(item.amount / 100).toFixed(2)}</span>
                    </div>
                    
                    <div className={styles.quantityControls}>
                      <button
                        onClick={() => decreaseItem(item.id)}
                        disabled={quantity === 0}
                      >
                        -
                      </button>
                      <span>{quantity}</span>
                      <button
                        onClick={() => handleItemChange(item.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className={styles.updateContainer}>
              <button
                onClick={handleUpdate}
                className={styles.updateButton}
                disabled={
                  selectedParents.length === 0 || 
                  Object.keys(selectedItems).length === 0 ||
                  updateStatus === 'Updating...'
                }
              >
                Add Items to Selected Parents
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
          </section>
        )}
      </main>
    </div>
  );
}

