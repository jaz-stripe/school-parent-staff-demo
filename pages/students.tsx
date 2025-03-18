// pages/students.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopBar from '../components/TopBar';
import styles from '../styles/Students.module.css';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  year: number;
  parentFirstName: string;
  parentLastName: string;
  parentId: number;
}

interface Product {
  id: number;
  name: string;
  type: string;
  amount: number;
}

export default function StudentsPage() {
  const [staff, setStaff] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [studentItems, setStudentItems] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  
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
        
        // Fetch students
        const studentsRes = await fetch('/api/staff/students');
        const studentsData = await studentsRes.json();
        
        if (studentsData.success) {
          setStudents(studentsData.students);
          setFilteredStudents(studentsData.students);
        }
        
        // Fetch student items
        const itemsRes = await fetch('/api/products?type=studentItem');
        const itemsData = await itemsRes.json();
        
        if (itemsData.success) {
          setStudentItems(itemsData.products);
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
    // Filter students based on search term and year
    let filtered = students;
    
    if (searchTerm) {
      filtered = filtered.filter(student => 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${student.parentFirstName} ${student.parentLastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (yearFilter !== '') {
      filtered = filtered.filter(student => student.year === yearFilter);
    }
    
    setFilteredStudents(filtered);
    
    // Clear selection when filters change
    setSelectedStudents([]);
  }, [searchTerm, yearFilter, students]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'staff' })
    });
    router.push('/');
  };

  const handleStudentSelect = (studentId: number) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
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
    if (selectedStudents.length === 0 || Object.keys(selectedItems).length === 0) {
      setUpdateStatus('Please select students and items first');
      return;
    }
    
    try {
      setUpdateStatus('Updating...');
      
      const response = await fetch('/api/staff/update-student-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentIds: selectedStudents,
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
        <h1>Manage Students</h1>
        
        <div className={styles.filtersContainer}>
          <input
            type="text"
            placeholder="Search by name or parent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            className={styles.yearFilter}
          >
            <option value="">All Years</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(year => (
              <option key={year} value={year}>Year {year}</option>
            ))}
          </select>
        </div>
        
        <section className={styles.studentsSection}>
          <div className={styles.studentsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.headerCheckbox}>
                <input 
                  type="checkbox" 
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={handleSelectAll}
                />
              </div>
              <div className={styles.headerName}>Student</div>
              <div className={styles.headerYear}>Year</div>
              <div className={styles.headerParent}>Parent</div>
              <div className={styles.headerAction}>Action</div>
            </div>
            
            {filteredStudents.length === 0 ? (
              <div className={styles.emptyState}>No students found</div>
            ) : (
              filteredStudents.map(student => (
                <div key={student.id} className={styles.tableRow}>
                  <div className={styles.rowCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleStudentSelect(student.id)}
                    />
                  </div>
                  <div className={styles.rowName}>
                    {student.firstName} {student.lastName}
                  </div>
                  <div className={styles.rowYear}>Year {student.year}</div>
                  <div className={styles.rowParent}>
                    {student.parentFirstName} {student.parentLastName}
                  </div>
                  <div className={styles.rowAction}>
                    <button 
                      onClick={() => handleViewParent(student.parentId)}
                      className={styles.viewButton}
                    >
                      View Parent
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        
        {selectedStudents.length > 0 && (
          <section className={styles.itemsSection}>
            <h2>Add Items to Selected Students ({selectedStudents.length})</h2>
            
            <div className={styles.itemsGrid}>
              {studentItems.map(item => {
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
                  selectedStudents.length === 0 || 
                  Object.keys(selectedItems).length === 0 ||
                  updateStatus === 'Updating...'
                }
              >
                Add Items to Selected Students
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

                  
