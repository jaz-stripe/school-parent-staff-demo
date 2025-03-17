// components/StudentSelector.tsx
import { useState } from 'react';
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
  const [students, setStudents] = useState<Student[]>([
    { firstName: '', lastName: parentLastName || '', year: 1 }
  ]);

  const firstNames = children.map(child => child.firstName);
  
  const handleAddStudent = () => {
    setStudents([...students, { firstName: '', lastName: parentLastName || '', year: 1 }]);
  };

  const handleRemoveStudent = (index: number) => {
    if (students.length > 1) {
      const newStudents = [...students];
      newStudents.splice(index, 1);
      setStudents(newStudents);
      onChange(newStudents);
    }
  };

  const handleChange = (index: number, field: keyof Student, value: string | number) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };
    setStudents(newStudents);
    onChange(newStudents);
  };

  return (
    <div className={styles.container}>
      <h3>Children Information</h3>
      
      {students.map((student, index) => (
        <div key={index} className={styles.studentRow}>
          <div className={styles.inputGroup}>
            <label htmlFor={`firstName-${index}`}>First Name</label>
            <select
              id={`firstName-${index}`}
              value={student.firstName}
              onChange={(e) => handleChange(index, 'firstName', e.target.value)}
              required
            >
              <option value="">Select First Name</option>
              {firstNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
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
