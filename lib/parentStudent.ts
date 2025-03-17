import { getDb } from './db';
import { retrievePrice } from './stripe';

// These functions called from API endpoints, largely to local DB
// * Get all parents: `getAllParents()`, returns db objects including isOnboarded
// * Get all students `getStudents(parentId: number optional)`, returns db objectes including isOnborded and parent object, all students if no parent, or filtered by parent
// * Get all students for a parent `getStudent(studentId: number)`  returns a student

