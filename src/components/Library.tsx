import React, { useEffect, useState } from 'react'
import { Plus, Book as BookIcon, Loader2, Search, Trash2, GripVertical, DownloadCloud, Smartphone, Settings, BookOpen, Sun, Moon, Coffee } from 'lucide-react'
import ePub from 'epubjs'
import { saveBookLocally, getAllLocalBooks, deleteLocalBook, LocalBook } from '../localDb'
import { db } from '../firebase'
import { collection, query, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore'
import { uploadBookToFirestore, downloadBookFromFirestore, deleteBookFromFirestore } from '../cloudStorage'
import { getAllReadingStates, markBookAsFinished, unmarkBookAsFinished } from '../bookmarkManager'

// DND Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DisplayBook extends Omit<LocalBook, 'data'> {
    data?: ArrayBuffer
    isDownloaded: boolean
    isDownloading?: boolean
    isFinished?: boolean
}

interface LibraryProps {
    onSelectBook: (book: LocalBook) => void
    theme: 'white' | 'sepia' | 'dark'
    onOpenSettings: () => void
    onUpdateTheme: (theme: 'white' | 'sepia' | 'dark') => void
}

// Sortable Item Component
const SortableBookCard = ({
    book,
    onSelect,
    onDelete,
    onDownload,
    onToggleFinished,
    cardClass
}: {
    book: DisplayBook,
    onSelect: any,
    onDelete: any,
    onDownload: any,
    onToggleFinished: any,
    cardClass: string
}) => {
    const [imageError, setImageError] = useState(false)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: book.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1
    }

    const handleAction = (e: React.MouseEvent) => {
        if (book.isDownloading) {
            e.stopPropagation()
            return
        }
        if (!book.isDownloaded) {
            onDownload(e, book)
        } else {
            onSelect(book)
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={handleAction}
            className={`flex flex-col cursor-pointer transition-all duration-300 rounded-3xl p-3 border-2 group relative ${cardClass}`}
        >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-4 shadow-md bg-black/5 relative">
                {book.coverUrl && !imageError ? (
                    <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <BookIcon className="w-10 h-10" />
                    </div>
                )}

                {/* Status Indicator */}
                <div className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-lg backdrop-blur-md">
                    {book.isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : book.isDownloaded ? (
                        <Smartphone className="w-3.5 h-3.5 opacity-70" />
                    ) : (
                        <DownloadCloud className="w-3.5 h-3.5 text-blue-400" />
                    )}
                </div>

                {/* Grip handle for dragging */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    style={{ touchAction: 'none' }}
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            </div>

            {/* Delete button (visible on hover) */}
            <button
                onClick={(e) => onDelete(e, book.id)}
                className="absolute top-5 right-5 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Finished badge */}
            {book.isFinished && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-[8px] font-bold rounded-lg shadow-lg z-10">
                    ✓ LEÍDO
                </div>
            )}

            <h3 className="font-bold text-sm line-clamp-2 mb-1 px-1">{book.title}</h3>
            <p className="text-[10px] opacity-50 font-bold uppercase tracking-wider px-1">{book.author}</p>

            {/* Toggle finished button */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onToggleFinished(book.id, book.isFinished)
                }}
                className={`mt-2 w-full px-2 py-1 rounded-lg text-[8px] font-bold transition-all ${book.isFinished
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
            >
                {book.isFinished ? 'Marcar como no leído' : 'Marcar como leído'}
            </button>
        </div>
    )
}

interface LibraryProps {
    onSelectBook: (book: LocalBook) => void
    theme: 'white' | 'sepia' | 'dark'
    onOpenSettings: () => void
    onUpdateTheme: (theme: 'white' | 'sepia' | 'dark') => void
}

const Library: React.FC<LibraryProps> = ({ onSelectBook, theme, onOpenSettings, onUpdateTheme }) => {
    const [books, setBooks] = useState<DisplayBook[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [isSyncing, setIsSyncing] = useState(true)
    const [readingStates, setReadingStates] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    // Monitor browser online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Load reading states
    useEffect(() => {
        const loadReadingStates = async () => {
            try {
                console.log("Loading reading states...")
                const states = await getAllReadingStates()
                console.log("Reading states loaded:", states.length)
                setReadingStates(states)
            } catch (e) {
                console.error('Error loading reading states:', e)
                setReadingStates([])
            }
        }
        loadReadingStates()
    }, [])

    // Sync books from Firestore (Source of Truth)
    useEffect(() => {
        // 1. Initial Local Load (Fastest path)
        const loadLocalOnly = async () => {
            try {
                const localBooks = await getAllLocalBooks()
                if (localBooks.length > 0) {
                    console.log("Loaded local books immediately:", localBooks.length)
                    const displayBooks: DisplayBook[] = localBooks.map(lb => ({
                        ...lb,
                        isDownloaded: true,
                        isDownloading: false,
                        isFinished: false // Default, will update when reading states load
                    }))
                    setBooks(prev => {
                        // Only set if we don't have books yet (avoid flickering)
                        return prev.length === 0 ? displayBooks : prev
                    })
                    // If we found local books, we can stop the "full screen" loading
                    // But we keep the small header spinner to show "Syncing"
                    setLoading(false)
                }
            } catch (err) {
                console.error("Error loading local books:", err)
            }
        }

        loadLocalOnly()

        // 2. Safety timeout
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.log("Firestore sync timeout - Forcing UI load with what we have");
                setLoading(false);
            }
        }, 5000);

        // 3. Cloud Sync
        const q = query(collection(db, 'books'))
        setIsSyncing(true)

        console.log("Setting up Firestore listener...")

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
            try {
                // Clear timeout since we got a response
                clearTimeout(safetyTimeout)

                const isFromCache = snapshot.metadata.fromCache
                const hasPendingWrites = snapshot.metadata.hasPendingWrites

                console.log(`Firestore Sync: Received ${snapshot.docs.length} books. Source: ${isFromCache ? 'CACHE' : 'SERVER'}. Pending writes: ${hasPendingWrites}`)

                const cloudBooks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as DisplayBook[]

                // Always re-fetch local books to ensure synchronization
                const localBooks = await getAllLocalBooks()

                const mergedBooks = cloudBooks.map(cb => {
                    const local = localBooks.find(lb => lb.id === cb.id)
                    const readingState = readingStates.find(rs => rs.bookId === cb.id)
                    return {
                        ...cb,
                        isDownloaded: !!local,
                        data: local?.data,
                        isFinished: readingState?.isFinished || false
                    }
                })

                console.log("Merged books:", mergedBooks.length)
                setBooks(mergedBooks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (b.createdAt ?? 0) - (a.createdAt ?? 0)))
            } catch (e: any) {
                console.error("Error processing Firestore data:", e)
                setError(e.message)
            } finally {
                setLoading(false)
                setIsSyncing(false)
            }
        }, (err) => {
            console.error("Firestore sync error:", err)
            setError(err.message)
            setLoading(false)
            setIsSyncing(false)
        })

        return () => {
            console.log("Unsubscribing from Firestore...")
            unsubscribe()
            clearTimeout(safetyTimeout)
        }
    }, [readingStates])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !file.name.endsWith('.epub')) return

        setUploading(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const book = ePub(arrayBuffer)
            const metadata = await book.loaded.metadata
            let coverUrl = await book.coverUrl()

            if (coverUrl && coverUrl.startsWith('blob:')) {
                const resp = await fetch(coverUrl)
                const blob = await resp.blob()
                coverUrl = await new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
            }

            const bookId = crypto.randomUUID()
            const bookMetadata = {
                id: bookId,
                title: metadata.title || file.name,
                author: metadata.creator || 'Autor desconocido',
                coverUrl: coverUrl || null,
                createdAt: Date.now(),
                order: books.length
            }

            // 1. Save locally
            await saveBookLocally({ ...bookMetadata, data: arrayBuffer })
            console.log("Book saved locally:", bookMetadata.title)

            // 2. Save to Firestore Cloud
            await setDoc(doc(db, 'books', bookId), bookMetadata)
            await uploadBookToFirestore(bookId, arrayBuffer)

            alert("¡Libro subido con éxito a la nube!")

        } catch (error) {
            console.error("Upload error:", error)
            alert("Error al subir el libro a la nube.")
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (confirm("¿Eliminar este libro de la nube y de todos tus dispositivos?")) {
            await deleteLocalBook(id)
            await deleteBookFromFirestore(id)
        }
    }

    const handleDownload = async (e: React.MouseEvent, book: DisplayBook) => {
        e.stopPropagation()
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, isDownloading: true } : b))
        try {
            console.log("Starting download for book:", book.id, book.title)
            const data = await downloadBookFromFirestore(book.id)
            await saveBookLocally({ ...book, data })
            console.log("Download completed successfully for:", book.title)

            // Force UI update
            setBooks(prev => prev.map(b =>
                b.id === book.id
                    ? { ...b, isDownloaded: true, isDownloading: false, data }
                    : b
            ))
        } catch (error) {
            console.error("Download error:", error)
            alert("Error al descargar el libro de la nube: " + error)
            setBooks(prev => prev.map(b => b.id === book.id ? { ...b, isDownloading: false } : b))
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = books.findIndex(b => b.id === active.id)
            const newIndex = books.findIndex(b => b.id === over.id)
            const newArray = arrayMove(books, oldIndex, newIndex)
            setBooks(newArray)

            try {
                const promises = newArray.map((book, index) =>
                    updateDoc(doc(db, 'books', book.id), { order: index })
                )
                await Promise.all(promises)
            } catch (err) {
                console.error("Order sync error:", err)
            }
        }
    }

    const handleToggleFinished = async (bookId: string, currentlyFinished: boolean) => {
        try {
            if (currentlyFinished) {
                await unmarkBookAsFinished(bookId)
            } else {
                await markBookAsFinished(bookId)
            }

            // Refresh reading states
            const states = await getAllReadingStates()
            setReadingStates(states)

            // Update books list
            setBooks(prev => prev.map(book =>
                book.id === bookId
                    ? { ...book, isFinished: !currentlyFinished }
                    : book
            ))
        } catch (e) {
            console.error('Error toggling finished status:', e)
        }
    }

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const themeClasses = {
        white: 'bg-[#f8fafc] text-slate-900',
        sepia: 'bg-[#fbf0d9] text-[#5b4636]',
        dark: 'bg-[#0f172a] text-slate-200',
    }

    const cardClasses = {
        white: 'bg-white border-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1',
        sepia: 'bg-[#f7e7c3]/50 border-[#e1cd9f]/30 hover:shadow-2xl hover:shadow-[#5b4636]/10 hover:-translate-y-1',
        dark: 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1',
    }

    return (
        <div className={`min-h-screen p-4 sm:p-12 transition-colors duration-500 overflow-x-hidden ${themeClasses[theme]}`}>
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8 sm:mb-12 gap-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'}`}>
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-none mb-1">LECTOR</h2>
                            <div className="flex flex-wrap gap-2">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isOnline ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                    {isOnline ? 'Online' : 'Offline'}
                                    {isSyncing && <Loader2 className="w-2 h-2 animate-spin ml-0.5" />}
                                </div>
                                {error && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                                        Error de conexión
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quick Theme Switcher */}
                        <div className={`flex items-center p-1 rounded-2xl mr-1 sm:mr-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            {[
                                { id: 'white', icon: <Sun className="w-4 h-4" /> },
                                { id: 'sepia', icon: <Coffee className="w-4 h-4" /> },
                                { id: 'dark', icon: <Moon className="w-4 h-4" /> }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onUpdateTheme(t.id as any)}
                                    className={`p-1.5 sm:p-2 rounded-xl transition-all ${theme === t.id ? 'bg-blue-500 text-white shadow-md' : 'opacity-50 hover:opacity-100'}`}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onOpenSettings}
                            className={`p-2.5 rounded-2xl transition-all border-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-100 hover:bg-slate-50'} shadow-sm active:scale-95`}
                        >
                            <Settings className="w-5 h-5 opacity-70" />
                        </button>

                        <label className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-all shadow-lg shadow-blue-500/25 active:scale-95 whitespace-nowrap">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span className="hidden sm:inline">{uploading ? 'Subiendo...' : 'Añadir'}</span>
                            <input type="file" accept=".epub" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                    </div>
                </div>

                {/* Sub-header with search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className={`relative flex-1 md:max-w-md group`}>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
                        <input
                            type="text"
                            placeholder="Buscar en tu biblioteca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 rounded-2xl border-2 transition-all outline-none text-sm font-medium ${theme === 'dark' ? 'bg-slate-800/50 border-transparent focus:border-blue-500/30' : 'bg-slate-100/50 border-transparent focus:border-blue-500/30'}`}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="font-bold text-center">Sincronizando con la nube...</p>
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="text-center py-32 border-2 border-dashed border-current/10 rounded-3xl">
                        <BookIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-xl font-bold opacity-30 px-4">
                            {searchTerm
                                ? 'No se encontraron libros'
                                : error
                                    ? `Error de conexión: ${error}`
                                    : 'Tu biblioteca en la nube está vacía. ¡Sube un EPUB!'}
                        </p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredBooks.map(b => b.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {filteredBooks.map((book) => (
                                    <SortableBookCard
                                        key={book.id}
                                        book={book}
                                        onSelect={(b: any) => onSelectBook(b as LocalBook)}
                                        onDelete={handleDelete}
                                        onDownload={handleDownload}
                                        onToggleFinished={handleToggleFinished}
                                        cardClass={cardClasses[theme]}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    )
}

export default Library
