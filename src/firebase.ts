import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyA5zek053bpwuwt4w_FevuiD-1bpG1C8yY",
    authDomain: "lector-epub-pwa.firebaseapp.com",
    projectId: "lector-epub-pwa",
    storageBucket: "lector-epub-pwa.firebasestorage.app",
    messagingSenderId: "860478707530",
    appId: "1:860478707530:web:2d896fe498d50b182c13b3"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with modern persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);

// Connectivity check (Global log)
import { onSnapshotsInSync } from "firebase/firestore";
onSnapshotsInSync(db, () => {
    console.log("Firestore: Snapshots are in sync with server");
});

export default app;
