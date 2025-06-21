// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, runTransaction, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAiDFpdkWI3BiZwdjp6mHN01hmvBItMk6o",
    authDomain: "ro7mbms.firebaseapp.com",
    projectId: "ro7mbms",
    storageBucket: "ro7mbms.firebasestorage.app",
    messagingSenderId: "379123096432",
    appId: "1:379123096432:web:b790b0eaf620840af80db5",
    measurementId: "G-JX5VHXX3GH"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Memo Functions
async function createMemo(memoData) {
    try {
        // Add timestamp - preserve createdAt if it's an antedated memo
        const memoWithTimestamp = {
            ...memoData,
            createdAt: memoData.createdAt || new Date(),
            status: 'pending'
        };

        // Add to memos collection
        const docRef = await addDoc(collection(db, "memos"), memoWithTimestamp);

        // Only update the memo number counter for non-antedated memos
        if (!memoData.isAntedated) {
            const memoType = memoData.memoType;
            let memoNumberKey;
            switch (memoType) {
                case 'PO':
                    memoNumberKey = 'current';
                    break;
                case 'CO':
                    memoNumberKey = 'coCurrent';
                    break;
                case 'Office Order':
                    memoNumberKey = 'officeOrder';
                    break;
                case 'Advisory':
                    memoNumberKey = 'advisory';
                    break;
                case 'Bulletin':
                    memoNumberKey = 'bulletin';
                    break;
                case 'Acknowledgment':
                    memoNumberKey = 'acknowledgment';
                    break;
                default:
                    throw new Error('Unknown memo type');
            }
            const memoNumberRef = doc(db, "memoNumbers", memoNumberKey);
            // Get the last part of the memo number which is the sequential number
            const currentNumber = parseInt(memoData.memoNumber.split('-').pop());
            await updateDoc(memoNumberRef, { number: currentNumber });
        }

        return docRef.id;
    } catch (error) {
        console.error("Error creating memo: ", error);
        throw error;
    }
}

async function getMemosByDepartment(department, callback) {
    try {
        const q = query(
            collection(db, "memos"),
            where("department", "==", department)
        );
        
        // Return the unsubscribe function from onSnapshot
        return onSnapshot(q, (querySnapshot) => {
            const memos = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort memos by createdAt in memory
            memos.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
            callback(memos);
        });
    } catch (error) {
        console.error("Error getting memos: ", error);
        throw error;
    }
}

async function getAllMemos() {
    try {
        const querySnapshot = await getDocs(collection(db, "memos"));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting all memos: ", error);
        throw error;
    }
}

async function updateMemoStatus(memoId, status) {
    try {
        const memoRef = doc(db, "memos", memoId);
        await updateDoc(memoRef, {
            status: status,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Error updating memo status: ", error);
        throw error;
    }
}

async function deleteMemoFromFirestore(memoId) {
    try {
        const memoRef = doc(db, "memos", memoId);
        await deleteDoc(memoRef);
    } catch (error) {
        console.error("Error deleting memo: ", error);
        throw error;
    }
}

// Memo Number Functions
async function getNextMemoNumber(memoType = 'PO') {
    try {
        let memoNumberKey;
        switch (memoType) {
            case 'PO':
                memoNumberKey = 'current';
                break;
            case 'CO':
                memoNumberKey = 'coCurrent';
                break;
            case 'Office Order':
                memoNumberKey = 'officeOrder';
                break;
            case 'Advisory':
                memoNumberKey = 'advisory';
                break;
            case 'Bulletin':
                memoNumberKey = 'bulletin';
                break;
            case 'Acknowledgment':
                memoNumberKey = 'acknowledgment';
                break;
            default:
                throw new Error('Unknown memo type');
        }
        const memoNumberRef = doc(db, "memoNumbers", memoNumberKey);
        const memoNumberDoc = await runTransaction(db, async (transaction) => {
            const doc = await transaction.get(memoNumberRef);
            if (!doc.exists()) {
                transaction.set(memoNumberRef, { number: 1 });
                return { number: 1 };
            }
            const currentNumber = doc.data().number;
            transaction.update(memoNumberRef, { number: currentNumber + 1 });
            return { number: currentNumber };
        });
        return memoNumberDoc.number;
    } catch (error) {
        console.error("Error getting next memo number: ", error);
        throw error;
    }
}

async function getCurrentMemoNumber(memoType = 'PO') {
    try {
        let memoNumberKey;
        switch (memoType) {
            case 'PO':
                memoNumberKey = 'current';
                break;
            case 'CO':
                memoNumberKey = 'coCurrent';
                break;
            case 'Office Order':
                memoNumberKey = 'officeOrder';
                break;
            case 'Advisory':
                memoNumberKey = 'advisory';
                break;
            case 'Bulletin':
                memoNumberKey = 'bulletin';
                break;
            case 'Acknowledgment':
                memoNumberKey = 'acknowledgment';
                break;
            default:
                throw new Error('Unknown memo type');
        }
        const memoNumberRef = doc(db, "memoNumbers", memoNumberKey);
        const memoNumberDoc = await getDoc(memoNumberRef);
        if (!memoNumberDoc.exists()) {
            return 0;
        }
        return memoNumberDoc.data().number;
    } catch (error) {
        console.error("Error getting current memo number: ", error);
        throw error;
    }
}

// User Functions
async function authenticateUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Error authenticating user: ", error);
        throw error;
    }
}

async function getUserData(email) {
    try {
        // First check if user is authenticated
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        // Try to get user data
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log('Found user data:', userData);
            return userData;
        }
        
        console.log('No user document found, creating new one for:', email);
        
        // If user document doesn't exist, create it based on email
        const userData = {
            email: email,
            username: email.split('@')[0],
            department: email.includes('ord') ? 'ORD' : 
                       email.includes('rod') ? 'ROD' : 
                       email.includes('fasd') ? 'FASD' : 'Administration',
            role: email.includes('@tesda.gov.ph') ? 'admin' : 'user',
            createdAt: new Date()
        };
        
        // Create the user document
        const docRef = await addDoc(collection(db, "users"), userData);
        console.log('Created new user document with ID:', docRef.id);
        return userData;
    } catch (error) {
        console.error("Error getting user data:", error);
        console.error("Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
        throw error;
    }
}

// Initialize Users in Firestore
async function initializeUsers() {
    const users = [
        {
            email: "ord7.communication@gmail.com",
            username: "ORD",
            department: "ORD",
            role: "user"
        },
        {
            email: "region7.rod@gmail.com",
            username: "ROD",
            department: "ROD",
            role: "user"
        },
        {
            email: "region7.fasd@gmail.com",
            username: "FASD",
            department: "FASD",
            role: "user"
        },
        {
            email: "region7@tesda.gov.ph",
            username: "admintesda",
            department: "Administration",
            role: "admin"
        }
    ];

    try {
        for (const user of users) {
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                await addDoc(collection(db, "users"), user);
                console.log(`Created user document for ${user.email}`);
            }
        }
    } catch (error) {
        console.error("Error initializing users: ", error);
        throw error;
    }
}

// Export functions
export {
    db,
    auth,
    createMemo,
    getMemosByDepartment,
    getAllMemos,
    updateMemoStatus,
    deleteMemoFromFirestore,
    authenticateUser,
    getUserData,
    logoutUser,
    initializeUsers,
    getCurrentMemoNumber
}; 