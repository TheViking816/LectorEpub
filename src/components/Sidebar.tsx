import React from 'react'
import { X, List } from 'lucide-react'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    toc: any[]
    onSelectChapter: (href: string) => void
    theme: 'white' | 'sepia' | 'dark'
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, toc, onSelectChapter, theme }) => {
    const themes = {
        white: 'bg-white text-gray-900 border-gray-100',
        sepia: 'bg-[#fbf0d9] text-[#5b4636] border-[#e8dcc4]',
        dark: 'bg-[#1a1a1a] text-gray-300 border-gray-800',
    }

    const hoverThemes = {
        white: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100',
        sepia: 'hover:bg-[#f7e7c3] hover:text-[#5b4636] hover:border-[#e1cd9f]',
        dark: 'hover:bg-white/5 hover:text-white hover:border-white/10',
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 w-80 h-full shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r ${themes[theme]
                    } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <List className="w-5 h-5" />
                            Contenido
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {toc.length === 0 ? (
                            <p className="opacity-50 italic">No se encontró tabla de contenidos.</p>
                        ) : (
                            <ul className="space-y-1">
                                {toc.map((item, index) => (
                                    <li key={index}>
                                        <button
                                            onClick={() => {
                                                onSelectChapter(item.href)
                                                onClose()
                                            }}
                                            className={`w-full text-left p-3 rounded-xl transition-all text-sm font-medium border border-transparent ${hoverThemes[theme]}`}
                                        >
                                            {item.label}
                                        </button>
                                        {item.subitems && item.subitems.length > 0 && (
                                            <ul className="ml-4 mt-1 border-l-2 border-current/10 pl-2">
                                                {item.subitems.map((sub: any, subIndex: number) => (
                                                    <li key={subIndex}>
                                                        <button
                                                            onClick={() => {
                                                                onSelectChapter(sub.href)
                                                                onClose()
                                                            }}
                                                            className={`w-full text-left p-2 rounded transition-colors text-xs opacity-70 ${hoverThemes[theme]}`}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Sidebar
