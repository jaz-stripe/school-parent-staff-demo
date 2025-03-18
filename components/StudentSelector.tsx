// components/StudentSelector.tsx
import { useState, useEffect } from 'react';
import { children } from '../data/PeterRabbitAndFriends';
import styles from '../styles/StudentSelector.module.css';

interface Student {
  firstName: string;
  lastName: string;
  year: number;
}

interface StudentSelectorProps {
  parentLastName: string;
  onChange: (students: Student[]) => void;
}

export default function StudentSelector({ parentLastName, onChange }: StudentSelectorProps) {
  // Initialize with one random child
  const getRandomChild = () => {
    const randomIndex = Math.floor(Math.random() * children.length);
    return children[randomIndex];
  };
  
  const initialChild = getRandomChild();
  const [students, setStudents] = useState<Student[]>([{
    firstName: initialChild.firstName,
    lastName: initialChild.lastName,
    year: initialChild.year
  }]);

  // Only call onChange when students state changes
  useEffect(() => {
    onChange(students);
  }, [students, onChange]);

  const handleAddStudent = () => {
    // Pick a random child for the new entry
    const randomChild = getRandomChild();
    
    const newStudents = [
      ...students, 
      { 
        firstName: randomChild.firstName, 
        lastName: randomChild.lastName, 
        year: randomChild.year 
      }
    ];
    
    setStudents(newStudents);
  };

  const handleRemoveStudent = (index: number) => {
    if (students.length > 1) {
      const newStudents = [...students];
      newStudents.splice(index, 1);
      setStudents(newStudents);
    }
  };

  const handleChange = (index: number, field: keyof Student, value: string | number) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };
    setStudents(newStudents);
  };

  return (
    <div className={styles.container}>
      <h3>Children Information</h3>
      
      {students.map((student, index) => (
        <div key={index} className={styles.studentRow}>
          <div className={styles.inputGroup}>
            <label htmlFor={`firstName-${index}`}>First Name</label>
            <input
              id={`firstName-${index}`}
              type="text"
              value={student.firstName}
              onChange={(e) => handleChange(index, 'firstName', e.target.value)}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor={`lastName-${index}`}>Last Name</label>
            <input
              id={`lastName-${index}`}
              type="text"
              value={student.lastName}
              onChange={(e) => handleChange(index, 'lastName', e.target.value)}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor={`year-${index}`}>Year</label>
            <select
              id={`year-${index}`}
              value={student.year}
              onChange={(e) => handleChange(index, 'year', parseInt(e.target.value, 10))}
              required
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((year) => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          
          {students.length > 1 && (
            <button 
              type="button" 
              className={styles.removeButton}
              onClick={() => handleRemoveStudent(index)}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      
      <button 
        type="button" 
        className={styles.addButton}
        onClick={handleAddStudent}
      >
        + Add Another Child
      </button>
    </div>
  );
}
