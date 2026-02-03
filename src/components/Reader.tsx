import React, { useEffect, useRef, useState } from 'react'
import ePub, { Rendition } from 'epubjs'

interface ReaderProps {
    data: ArrayBuffer
    location: string | null
    onLocationChange: (cfi: string) => void
    onTocLoaded: (toc: any) => void
    settings: {
        theme: 'white' | 'sepia' | 'dark'
        fontSize: number
        fontFamily: 'sans' | 'serif' | 'mono'
        lineHeight: number
    }
    onProgress?: (progress: number) => void
    onChapterInfo?: (info: { label: string, progress: number }) => void
}

const Reader: React.FC<ReaderProps> = ({ data, location, onLocationChange, onTocLoaded, onProgress, onChapterInfo, settings }) => {
    const viewerRef = useRef<HTMLDivElement>(null)
    const [rendition, setRendition] = useState<Rendition | null>(null)

    useEffect(() => {
        console.log("Reader: Initializing with data:", data?.byteLength, "bytes");
        if (!viewerRef.current || !data) return

        // Clear previous viewer content
        viewerRef.current.innerHTML = '';

        // Convert ArrayBuffer to Blob
        const blob = new Blob([data], { type: 'application/epub+zip' });
        const book = ePub(blob as any);

        const rend = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
            manager: 'default',
            allowScriptedContent: true
        })

        const displayInitial = async () => {
            console.log("Reader: Book rendered. Waiting for ready...");
            await book.ready;

            console.log("Reader: Book ready. Displaying location:", location);
            try {
                if (location) {
                    await rend.display(location);
                } else {
                    await rend.display();
                }
                setRendition(rend);
                ; (window as any).epubRendition = rend;

                // TOUCH SWIPE HANDLING
                let touchStartX = 0;
                let touchEndX = 0;

                rend.on('touchstart', (event: TouchEvent) => {
                    touchStartX = event.changedTouches[0].screenX;
                });

                rend.on('touchend', (event: TouchEvent) => {
                    touchEndX = event.changedTouches[0].screenX;
                    const distance = touchEndX - touchStartX;
                    const threshold = 50; // pixels

                    if (distance > threshold) {
                        rend.prev();
                    } else if (distance < -threshold) {
                        rend.next();
                    }
                });


            } catch (err) {
                console.error("Reader: Initial display failed:", err);
                await rend.display();
                setRendition(rend);
                ; (window as any).epubRendition = rend;
            }
        };

        displayInitial();

        book.loaded.navigation.then((nav) => {
            onTocLoaded(nav.toc)
        })

        // Progress tracking
        rend.on('relocated', (loc: any) => {
            const currentCfi = loc.start.cfi

            // Wait for rendition to be set (which happens after the initial jump)
            // to avoid saving the "default" first page before the initial location jump
            if (rendition || (window as any).epubRendition) {
                onLocationChange(currentCfi)
            }

            if (book.locations && book.locations.length() > 0) {
                const progress = book.locations.percentageFromCfi(currentCfi)
                if (onProgress) onProgress(progress)
            }

            // Chapter Info
            const chapter = book.navigation.get(loc.start.href)

            let chapterProgress = 0;
            if (book.locations.length() > 0) {
                const currentCfi = loc.start.cfi;
                const locations = (book.locations as any)._locations;
                const currentSpineIndex = loc.start.index;
                const currentLocationIndex = book.locations.locationFromCfi(currentCfi);

                // Helper to safely get spine index
                const getSpinePos = (cfi: string) => {
                    try {
                        return new (ePub as any).CFI(cfi).spinePos
                    } catch {
                        return -1
                    }
                }

                // Find start of this chapter
                let start = currentLocationIndex;
                while (start > 0 && getSpinePos(locations[start - 1]) === currentSpineIndex) {
                    start--;
                }

                // Find end of this chapter
                let end = currentLocationIndex;
                while (end < locations.length - 1 && getSpinePos(locations[end + 1]) === currentSpineIndex) {
                    end++;
                }

                const total = end - start + 1;
                const current = currentLocationIndex - start + 1;
                chapterProgress = current / total;
            } else {
                // Fallback if locations aren't ready
                chapterProgress = loc.start.percentage;
            }

            if (onChapterInfo) {
                onChapterInfo({
                    label: chapter ? chapter.label.trim() : 'Capítulo',
                    progress: chapterProgress
                })
            }
        })

        // Generate locations for progress tracking
        book.ready.then(() => {
            return book.locations.generate(600)
        }).then(() => {
            const currentCfi = rend.location?.start?.cfi
            if (currentCfi && onProgress) {
                onProgress(book.locations.percentageFromCfi(currentCfi))
            }
        })

        // Keyboard navigation
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') rend.prev()
            if (e.key === 'ArrowRight') rend.next()
        }
        window.addEventListener('keydown', handleKeydown)

        return () => {
            book.destroy()
            window.removeEventListener('keydown', handleKeydown)
        }
    }, [data])

    // Handle window resize
    useEffect(() => {
        if (!rendition) return;

        const handleResize = () => {
            requestAnimationFrame(() => {
                if (viewerRef.current) {
                    const { width, height } = viewerRef.current.getBoundingClientRect();
                    rendition.resize(width, height);
                }
            });
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [rendition]);

    // React to external location changes (like sync from Firestore)
    useEffect(() => {
        if (rendition && location) {
            const currentCfi = rendition.location?.start?.cfi;
            if (currentCfi !== location) {
                console.log("Reader: Syncing to external location:", location);
                rendition.display(location);
            }
        }
    }, [location, rendition])

    // Apply theme settings
    useEffect(() => {
        if (!rendition) return

        const themeStyles: any = {
            'body': {
                'background-color': `${settings.theme === 'white' ? '#ffffff' : settings.theme === 'sepia' ? '#fbf0d9' : '#1a1a1a'} !important`,
                'color': `${settings.theme === 'dark' ? '#d1d1d1' : '#333333'} !important`,
            },
            'p, div, span, li': {
                'font-family': `${settings.fontFamily === 'sans' ? 'Inter, sans-serif' : settings.fontFamily === 'serif' ? 'Georgia, serif' : 'monospace'} !important`,
                'font-size': `${settings.fontSize}px !important`,
                'line-height': `${settings.lineHeight} !important`,
            }
        }

        const contents = rendition.getContents() as unknown as any[]
        contents.forEach((content: any) => {
            content.addStylesheetRules(themeStyles)
        })

        // Register themes in rendition for easier switching if needed,
        // but dynamic style injection is more flexible here
        rendition.themes.register('custom', themeStyles)
        rendition.themes.select('custom')

    }, [rendition, settings])



    return (
        <div className="w-full h-full overflow-hidden">
            <div
                ref={viewerRef}
                className="w-full h-full block"
                id="epub-viewer"
            />
        </div>
    )
}

export default Reader
