import { useState, useEffect, useRef } from 'react'
import { Menu, Settings, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'
import Reader from './components/Reader'
import Sidebar from './components/Sidebar'
import SettingsPanel from './components/SettingsPanel'
import Library from './components/Library'
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { LocalBook } from './localDb'
import { saveReadingState, getReadingState } from './bookmarkManager'

interface ReaderSettings {
    theme: 'white' | 'sepia' | 'dark'
    fontSize: number
    fontFamily: 'sans' | 'serif' | 'mono'
    lineHeight: number
}

const DEFAULT_SETTINGS: ReaderSettings = {
    theme: 'white',
    fontSize: 18,
    fontFamily: 'serif',
    lineHeight: 1.5,
}

function App() {
    const [view, setView] = useState<'library' | 'reader'>('library')
    const [currentBook, setCurrentBook] = useState<LocalBook | null>(null)
    const [fileData, setFileData] = useState<ArrayBuffer | null>(null)
    const [toc, setToc] = useState<any[]>([])
    const [location, setLocation] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [settings, setSettings] = useState<ReaderSettings>(() => {
        const saved = localStorage.getItem('epub-settings')
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS
    })

    console.log("App: Version 2.0 (Fixed Sync) loaded");

    // Persistence
    useEffect(() => {
        localStorage.setItem('epub-settings', JSON.stringify(settings))
    }, [settings])

    const getBookSyncId = (book: LocalBook) => {
        // Use the book's unique ID for sync - much more reliable than title/author
        return book.id;
    }

    const handleSelectBook = async (book: LocalBook) => {
        try {
            // 1. Fetch last position from local storage first (robust backup)
            const localState = await getReadingState(book.id)

            // 2. Then try Firestore as backup
            const syncId = getBookSyncId(book)
            const bookRef = doc(db, 'progress', syncId)

            console.log("App: Fetching initial position for book:", book.title)
            const bookSnap = await getDoc(bookRef)

            let initialLocation = null
            if (localState) {
                initialLocation = localState.lastLocation
                console.log("App: Local position found:", initialLocation)
            } else if (bookSnap.exists()) {
                initialLocation = bookSnap.data().lastLocation
                console.log("App: Cloud position found:", initialLocation)
            }

            // 3. Now set state and switch view
            setFileData(book.data)
            setCurrentBook(book)
            setLocation(initialLocation)
            setView('reader')

        } catch (error) {
            console.error("Error loading book:", error)
            alert("No se pudo cargar el libro.")
        }
    }

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!currentBook || !(window as any).epubRendition) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;

        // Get total locations from the book
        const rendition = (window as any).epubRendition;
        const book = rendition.book;

        if (book.locations && book.locations.length() > 0) {
            const targetCfi = book.locations.cfiFromPercentage(percentage);
            rendition.display(targetCfi);
        }
    };

    const handleLocationChange = (cfi: string) => {
        // Only save if it's different from what we currently have
        // to avoid redundant "page 1" saves during initial load
        if (location === cfi) return;

        setLocation(cfi)

        if (currentBook) {
            // Save to local storage first (robust backup)
            saveReadingState({
                bookId: currentBook.id,
                lastLocation: cfi,
                progress: progress,
                lastRead: Date.now()
            });

            // Debounce Firestore saves to once every 3 seconds
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(async () => {
                const syncId = getBookSyncId(currentBook)
                const bookRef = doc(db, 'progress', syncId)
                console.log("App: Saving bookmark to cloud...", cfi)
                try {
                    await setDoc(bookRef, {
                        lastLocation: cfi,
                        title: currentBook.title,
                        author: currentBook.author,
                        updatedAt: Date.now()
                    }, { merge: true })
                } catch (err) {
                    console.error("App: Failed to save bookmark to cloud:", err)
                }
            }, 3000);
        }
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullscreen(false)
            }
        }
    }

    const themeColors = {
        white: 'bg-white text-gray-900 border-gray-100',
        sepia: 'bg-[#fbf0d9] text-[#5b4636] border-[#e8dcc4]',
        dark: 'bg-[#1a1a1a] text-gray-300 border-gray-800',
    }

    const headerFooterClasses = `transition-colors duration-500 border-opacity-50 ${settings.theme === 'dark' ? 'bg-[#0f172a] border-slate-800' :
        settings.theme === 'sepia' ? 'bg-[#fbf0d9] border-[#e8dcc4]' :
            'bg-slate-50/80 backdrop-blur-md border-slate-200'
        }`

    if (view === 'library') {
        return (
            <Library
                onSelectBook={handleSelectBook}
                theme={settings.theme}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onUpdateTheme={(t) => setSettings({ ...settings, theme: t })}
            />
        )
    }

    return (
        <div className={`fixed inset-0 flex flex-col transition-colors duration-500 ${themeColors[settings.theme]} ${settings.theme === 'dark' ? 'dark' : ''} reader-container`}>
            {/* Header - Hidden in fullscreen */}
            {!isFullscreen && (
                <header className={`h-16 flex items-center justify-between px-4 sm:px-6 border-b z-30 ${headerFooterClasses}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                setView('library')
                                setFileData(null) // Clear buffer to save memory
                            }}
                            className={`px-4 py-2 rounded-xl transition-all text-[10px] font-black tracking-widest uppercase border-2 flex items-center gap-2 ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Biblioteca
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold tracking-tight opacity-70 truncate max-w-[200px]">
                                {currentBook?.title || 'Lector'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            title="Pantalla completa"
                        >
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex items-center justify-center">
                {/* Navigation Layers */}
                <div className="absolute inset-0 flex">
                    <div
                        className="w-16 sm:w-24 h-full flex items-center justify-center cursor-pointer group z-20"
                        onClick={() => (window as any).epubRendition?.prev()}
                    >
                        <div className="p-4 rounded-full bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-all text-transparent group-hover:text-current">
                            <ChevronLeft className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex-1 h-full" />
                    <div
                        className="w-16 sm:w-24 h-full flex items-center justify-center cursor-pointer group z-20"
                        onClick={() => (window as any).epubRendition?.next()}
                    >
                        <div className="p-4 rounded-full bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-all text-transparent group-hover:text-current">
                            <ChevronRight className="w-8 h-8" />
                        </div>
                    </div>
                </div>

                <div className={`w-full h-full max-w-5xl mx-auto overflow-hidden transition-all duration-300 ${isFullscreen ? 'px-4 py-2' : 'px-4 sm:px-16 py-6'}`}>
                    {fileData && (
                        <Reader
                            data={fileData}
                            location={location}
                            onLocationChange={handleLocationChange}
                            onTocLoaded={(tocData) => setToc(tocData)}
                            onProgress={(p) => setProgress(p)}
                            settings={settings}
                        />
                    )}
                </div>
            </main>

            {/* Footer / Progress Bar */}
            <footer className={`transition-all duration-300 z-30 flex flex-col justify-center px-4 sm:px-8 ${isFullscreen
                ? 'fixed bottom-0 left-0 right-0 h-4 bg-transparent border-none opacity-50 hover:opacity-100'
                : `h-14 border-t ${headerFooterClasses}`
                }`}>
                {!isFullscreen && (
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest leading-none">Progreso de lectura</span>
                        <span className="text-[10px] font-bold text-blue-500 leading-none">{(progress * 100).toFixed(1)}%</span>
                    </div>
                )}
                <div
                    className={`progress-bar-container relative w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden cursor-pointer ${isFullscreen ? 'h-1' : 'h-2'}`}
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-blue-500 transition-all duration-300 relative"
                        style={{ width: `${progress * 100}%` }}
                    >
                        <div className={`progress-bar-handle ${isFullscreen ? 'scale-75' : ''}`} style={{ left: `${progress * 100}%` }} />
                    </div>
                </div>
            </footer>

            {/* Components */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                toc={toc}
                theme={settings.theme}
                onSelectChapter={(href) => {
                    (window as any).epubRendition?.display(href)
                }}
            />

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onUpdateSettings={setSettings}
            />
        </div>
    )
}

export default App
