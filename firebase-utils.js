// Firebase utility functions
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    deleteDoc, 
    writeBatch, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase operations wrapper
class FirebaseUtils {
    constructor() {
        this.db = window.db;
        this.listeners = new Map();
    }

    // Collection operations
    async addDocument(collectionName, data) {
        try {
            const docRef = await addDoc(collection(this.db, collectionName), data);
            return docRef.id;
        } catch (error) {
            console.error('Error adding document:', error);
            throw error;
        }
    }

    async updateDocument(collectionName, docId, data) {
        try {
            const docRef = doc(this.db, collectionName, docId);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    }

    async deleteDocument(collectionName, docId) {
        try {
            await deleteDoc(doc(this.db, collectionName, docId));
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    async getDocuments(collectionName, orderByField = null) {
        try {
            let q = collection(this.db, collectionName);
            if (orderByField) {
                q = query(q, orderBy(orderByField));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting documents:', error);
            throw error;
        }
    }

    // Real-time listeners
    subscribeToCollection(collectionName, callback, orderByField = null) {
        try {
            let q = collection(this.db, collectionName);
            if (orderByField) {
                q = query(q, orderBy(orderByField));
            }

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const documents = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(documents);
            });

            // Store the unsubscribe function
            const listenerId = `${collectionName}_${Date.now()}`;
            this.listeners.set(listenerId, unsubscribe);
            
            return listenerId;
        } catch (error) {
            console.error('Error subscribing to collection:', error);
            throw error;
        }
    }

    unsubscribeFromCollection(listenerId) {
        const unsubscribe = this.listeners.get(listenerId);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(listenerId);
        }
    }

    // Batch operations
    async batchUpdate(operations) {
        try {
            const batch = writeBatch(this.db);
            
            operations.forEach(operation => {
                const { type, collectionName, docId, data } = operation;
                const docRef = doc(this.db, collectionName, docId);
                
                switch (type) {
                    case 'update':
                        batch.update(docRef, data);
                        break;
                    case 'delete':
                        batch.delete(docRef);
                        break;
                    case 'set':
                        batch.set(docRef, data);
                        break;
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error('Error in batch operation:', error);
            throw error;
        }
    }

    // Task-specific operations
    async updateTaskSerialNumbers(collectionName = 'tasks') {
        try {
            const tasksQuery = query(collection(this.db, collectionName), orderBy('serialNumber'));
            const querySnapshot = await getDocs(tasksQuery);
            const batch = writeBatch(this.db);
            
            querySnapshot.docs.forEach((docSnapshot, index) => {
                const newSerialNumber = index + 1;
                batch.update(doc(this.db, collectionName, docSnapshot.id), {
                    serialNumber: newSerialNumber
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error updating serial numbers:', error);
            throw error;
        }
    }

    // Search operations
    async searchTasks(searchTerm, collections = ['tasks']) {
        const results = [];
        
        for (const collectionName of collections) {
            try {
                const documents = await this.getDocuments(collectionName, 'serialNumber');
                const filtered = documents.filter(doc => {
                    const taskNumber = doc.serialNumber.toString();
                    const hashTaskNumber = `#${taskNumber}`;
                    
                    // Check if searchTerm matches task number with or without #
                    if (searchTerm === taskNumber || searchTerm === hashTaskNumber || 
                        searchTerm.startsWith('#') && searchTerm.slice(1) === taskNumber) {
                        return true;
                    }
                    
                    // Also search in task text content
                    if (doc.text1 && doc.text1.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return true;
                    }
                    
                    if (doc.text2 && doc.text2.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return true;
                    }
                    
                    return false;
                });
                
                if (filtered.length > 0) {
                    results.push({
                        collection: collectionName,
                        documents: filtered
                    });
                }
            } catch (error) {
                console.error(`Error searching in collection ${collectionName}:`, error);
            }
        }
        
        return results;
    }

    // Cleanup
    destroy() {
        // Unsubscribe from all listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners.clear();
    }
}

// Create global instance
window.firebaseUtils = new FirebaseUtils();

// Export for use in other modules
window.FirebaseUtils = FirebaseUtils;