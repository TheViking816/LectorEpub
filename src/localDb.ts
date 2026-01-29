import { openDB, IDBPDatabase } from 'idb';

export interface LocalBook {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    data: ArrayBuffer;
    createdAt: number;
    order?: number;
}

const DB_NAME = 'epub-reader-db';
const STORE_NAME = 'books';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDb = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

export const saveBookLocally = async (book: LocalBook) => {
    const db = await getDb();
    await db.put(STORE_NAME, book);
};

export const getAllLocalBooks = async (): Promise<LocalBook[]> => {
    const db = await getDb();
    return db.getAll(STORE_NAME);
};

export const getLocalBook = async (id: string): Promise<LocalBook | undefined> => {
    const db = await getDb();
    return db.get(STORE_NAME, id);
};

export const deleteLocalBook = async (id: string) => {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
};
