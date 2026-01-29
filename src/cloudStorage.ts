import { collection, doc, setDoc, getDocs, query, orderBy, deleteDoc, Bytes } from 'firebase/firestore';
import { db } from './firebase';

const CHUNK_SIZE = 512 * 1024; // 512KB per doc for reliability

export const uploadBookToFirestore = async (bookId: string, data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
    const chunksRef = collection(db, 'books', bookId, 'chunks');

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, bytes.length);
        const chunkData = bytes.slice(start, end);

        const chunkDoc = doc(chunksRef, `chunk_${i}`);
        await setDoc(chunkDoc, {
            index: i,
            data: Bytes.fromUint8Array(new Uint8Array(chunkData))
        });
        console.log(`CloudStorage: Uploaded chunk ${i + 1}/${totalChunks}`);
    }
};

export const downloadBookFromFirestore = async (bookId: string): Promise<ArrayBuffer> => {
    const chunksRef = collection(db, 'books', bookId, 'chunks');
    const q = query(chunksRef, orderBy('index'));
    const snapshot = await getDocs(q);

    const chunkDataArrays: Uint8Array[] = [];
    snapshot.forEach((doc) => {
        const chunk = doc.data().data as Bytes;
        if (chunk && typeof chunk.toUint8Array === 'function') {
            chunkDataArrays.push(chunk.toUint8Array());
        } else {
            // Fallback for old base64 data if it exists during transition
            const base64Data = doc.data().data;
            if (typeof base64Data === 'string') {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                chunkDataArrays.push(bytes);
            }
        }
    });

    // Combine chunks
    const totalLength = chunkDataArrays.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunkDataArrays) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result.buffer;
};

export const deleteBookFromFirestore = async (bookId: string) => {
    await deleteDoc(doc(db, 'books', bookId));
};
