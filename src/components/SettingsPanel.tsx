import React from 'react'
import { X, Type, Sun, Moon, Coffee, Minus, Plus } from 'lucide-react'

interface SettingsPanelProps {
    isOpen: boolean
    onClose: () => void
    settings: {
        theme: 'white' | 'sepia' | 'dark'
        fontSize: number
        fontFamily: 'sans' | 'serif' | 'mono'
        lineHeight: number
    }
    onUpdateSettings: (newSettings: any) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
    const panelThemes = {
        white: 'bg-white text-gray-900 border-gray-100',
        sepia: 'bg-[#fbf0d9] text-[#5b4636] border-[#e8dcc4]',
        dark: 'bg-[#1a1a1a] text-gray-300 border-gray-800',
    }

    const sectionThemes = {
        white: 'bg-gray-50 border-gray-100 text-gray-400',
        sepia: 'bg-[#f7e7c3]/50 border-[#e1cd9f]/30 text-[#5b4636]/60',
        dark: 'bg-white/5 border-white/5 text-gray-500',
    }

    const themes = [
        { id: 'white', name: 'Original', icon: <Sun className="w-4 h-4" />, bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
        { id: 'sepia', name: 'Sepia', icon: <Coffee className="w-4 h-4" />, bg: 'bg-[#fbf0d9]', text: 'text-[#5b4636]', border: 'border-[#e8dcc4]' },
        { id: 'dark', name: 'Noche', icon: <Moon className="w-4 h-4" />, bg: 'bg-[#1a1a1a]', text: 'text-gray-300', border: 'border-gray-800' },
    ]

    const fonts = [
        { id: 'sans', name: 'Sans Serif', class: 'font-sans' },
        { id: 'serif', name: 'Serif', class: 'font-serif' },
        { id: 'mono', name: 'Monospace', class: 'font-mono' },
    ]

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/10 z-40"
                    onClick={onClose}
                />
            )}

            <div
                className={`fixed bottom-0 right-0 w-full sm:w-96 sm:m-4 sm:rounded-3xl shadow-2xl z-50 transform transition-all duration-500 ease-in-out border ${panelThemes[settings.theme]
                    } ${isOpen ? 'translate-y-0 sm:translate-y-0' : 'translate-y-full sm:translate-y-[120%]'
                    }`}
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            <Type className="w-6 h-6 text-blue-500" />
                            Ajustes de Lectura
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 opacity-50" />
                        </button>
                    </div>

                    {/* Theme selection */}
                    <div className="mb-10">
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-4">Color de fondo</p>
                        <div className="flex gap-4">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => onUpdateSettings({ ...settings, theme: t.id as any })}
                                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${settings.theme === t.id
                                            ? 'border-blue-500 ring-4 ring-blue-500/10 scale-105 shadow-lg'
                                            : `border-transparent ${t.bg} hover:border-blue-200`
                                        }`}
                                >
                                    <div className={`${t.text}`}>{t.icon}</div>
                                    <span className={`text-[10px] font-bold ${t.text}`}>{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font selection */}
                    <div className="mb-10">
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-4">Tipografía</p>
                        <div className={`grid grid-cols-3 gap-2 p-1 rounded-2xl ${sectionThemes[settings.theme]}`}>
                            {fonts.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => onUpdateSettings({ ...settings, fontFamily: f.id as any })}
                                    className={`p-3 rounded-xl text-sm transition-all duration-300 ${settings.fontFamily === f.id
                                            ? 'bg-blue-500 text-white shadow-lg font-bold'
                                            : 'hover:bg-black/5 opacity-70 hover:opacity-100'
                                        } ${f.class}`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font size */}
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Tamaño del texto</p>
                            <span className="text-xs font-bold text-blue-500">{settings.fontSize}px</span>
                        </div>
                        <div className={`flex items-center gap-4 p-2 rounded-2xl border border-transparent ${sectionThemes[settings.theme]}`}>
                            <button
                                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.max(12, settings.fontSize - 1) })}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all shadow-sm"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <input
                                type="range"
                                min="12"
                                max="48"
                                value={settings.fontSize}
                                onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                                className="flex-1 accent-blue-500 h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <button
                                onClick={() => onUpdateSettings({ ...settings, fontSize: Math.min(48, settings.fontSize + 1) })}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Line height */}
                    <div>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-4">Interlineado</p>
                        <div className={`flex gap-2 p-1 rounded-2xl ${sectionThemes[settings.theme]}`}>
                            {[1.25, 1.5, 2.0].map((h) => (
                                <button
                                    key={h}
                                    onClick={() => onUpdateSettings({ ...settings, lineHeight: h })}
                                    className={`flex-1 py-3 rounded-xl text-xs transition-all duration-300 ${settings.lineHeight === h
                                            ? 'bg-blue-500 text-white shadow-lg font-bold'
                                            : 'hover:bg-black/5 opacity-70 hover:opacity-100'
                                        }`}
                                >
                                    {h === 1.25 ? 'Compacto' : h === 1.5 ? 'Normal' : 'Amplio'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SettingsPanel
