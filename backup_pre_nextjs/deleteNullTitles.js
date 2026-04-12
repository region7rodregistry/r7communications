// deleteNullTitles.js
const admin = require('firebase-admin');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyAiDFpdkWI3BiZwdjp6mHN01hmvBItMk6o",
    authDomain: "ro7mbms.firebaseapp.com",
    projectId: "ro7mbms",
    storageBucket: "ro7mbms.firebasestorage.app",
    messagingSenderId: "379123096432",
    appId: "1:379123096432:web:b790b0eaf620840af80db5",
    measurementId: "G-JX5VHXX3GH"
};

const app = admin.initializeApp(firebaseConfig);
const db = getFirestore(app);

const deleteNullTitles = async () => {
  const snapshot = await getDocs(collection(db, "memos"));
  let deletedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (
      !data.title ||         // missing or undefined
      data.title === null || // explicitly null
      data.title === "null"  // string "null"
    ) {
      await deleteDoc(doc(db, "memos", docSnap.id));
      console.log(`✅ Deleted doc: ${docSnap.id}`);
      deletedCount++;
    }
  }

  console.log(`✅ Finished. Deleted ${deletedCount} document(s).`);
};

deleteNullTitles().catch(console.error);
