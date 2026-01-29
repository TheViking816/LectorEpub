import { openDB, IDBPDatabase } from 'idb';

export interface Bookmark {
    id: string;
    bookId: string;
    cfi: string;
    label: string;
    createdAt: number;
    page?: number;
    progress?: number;
}

export interface ReadingState {
    bookId: string;
    lastLocation: string;
    progress: number;
    totalPages?: number;
    lastRead: number;
    isFinished?: boolean;
    timeSpent?: number;
}

const DB_NAME = 'epub-reader-db-v2';
const BOOKMARK_STORE = 'bookmarks';
const READING_STORE = 'readingState';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getBookmarkDb = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, VERSION, {
            upgrade(db, oldVersion, newVersion) {
                // Clear old data on upgrade
                if (newVersion && oldVersion < newVersion) {
                    if (db.objectStoreNames.contains(BOOKMARK_STORE)) {
                        db.deleteObjectStore(BOOKMARK_STORE);
                    }
                    if (db.objectStoreNames.contains(READING_STORE)) {
                        db.deleteObjectStore(READING_STORE);
                    }
                }
                
                if (!db.objectStoreNames.contains(BOOKMARK_STORE)) {
                    db.createObjectStore(BOOKMARK_STORE, { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains(READING_STORE)) {
                    const store = db.createObjectStore(READING_STORE, { keyPath: 'bookId' });
                    store.createIndex('lastRead', 'lastRead');
                }
            },
        });
    }
    return dbPromise;
};

export const saveBookmark = async (bookmark: Bookmark) => {
    const db = await getBookmarkDb();
    await db.put(BOOKMARK_STORE, bookmark);
};

export const getBookmarks = async (bookId: string): Promise<Bookmark[]> => {
    const db = await getBookmarkDb();
    const allBookmarks = await db.getAll(BOOKMARK_STORE);
    return allBookmarks.filter(bookmark => bookmark.bookId === bookId) || [];
};

export const deleteBookmark = async (bookmarkId: string) => {
    const db = await getBookmarkDb();
    await db.delete(BOOKMARK_STORE, bookmarkId);
};

export const saveReadingState = async (state: ReadingState) => {
    const db = await getBookmarkDb();
    await db.put(READING_STORE, state);
    
    // Also save to localStorage as backup
    try {
        localStorage.setItem(`reading-state-${state.bookId}`, JSON.stringify(state));
    } catch (e) {
        console.warn('Could not save reading state to localStorage:', e);
    }
};

export const getReadingState = async (bookId: string): Promise<ReadingState | null> => {
    try {
        // Try IndexedDB first
        const db = await getBookmarkDb();
        const state = await db.get(READING_STORE, bookId);
        
        if (state) return state;
        
        // Fallback to localStorage
        const localState = localStorage.getItem(`reading-state-${bookId}`);
        if (localState) {
            return JSON.parse(localState);
        }
        
        return null;
    } catch (e) {
        console.error('Error getting reading state:', e);
        return null;
    }
};

export const getAllReadingStates = async (): Promise<ReadingState[]> => {
    try {
        const db = await getBookmarkDb();
        return await db.getAll(READING_STORE) || [];
    } catch (e) {
        console.error('Error getting all reading states:', e);
        return [];
    }
};

export const markBookAsFinished = async (bookId: string) => {
    const existing = await getReadingState(bookId);
    if (existing) {
        await saveReadingState({
            ...existing,
            isFinished: true,
            progress: 1.0
        });
    } else {
        await saveReadingState({
            bookId,
            lastLocation: '',
            progress: 1.0,
            lastRead: Date.now(),
            isFinished: true
        });
    }
};

export const unmarkBookAsFinished = async (bookId: string) => {
    const existing = await getReadingState(bookId);
    if (existing) {
        await saveReadingState({
            ...existing,
            isFinished: false,
            progress: Math.min(existing.progress, 0.95)
        });
    }
};

// Sync with Firebase utilities
export const syncBookmarksWithFirebase = async (bookId: string, firebaseBookmarks: Bookmark[]) => {
    const localBookmarks = await getBookmarks(bookId);
    
    // Merge local and remote bookmarks
    const allBookmarks = [...localBookmarks, ...firebaseBookmarks];
    const uniqueBookmarks = allBookmarks.filter((bookmark, index, self) => 
        index === self.findIndex((b) => b.id === bookmark.id)
    );
    
    // Save merged bookmarks locally
    for (const bookmark of uniqueBookmarks) {
        await saveBookmark(bookmark);
    }
    
    return uniqueBookmarks;
};