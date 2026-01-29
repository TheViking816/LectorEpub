import React, { useCallback } from 'react'
import { Upload, Book } from 'lucide-react'

interface DropzoneProps {
    onFileSelect: (file: File) => void
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && file.name.endsWith('.epub')) {
            onFileSelect(file)
        }
    }, [onFileSelect])

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-white rounded-3xl shadow-soft mb-6">
                        <Book className="w-12 h-12 text-blue-600" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                        Lector EPUB
                    </h1>
                    <p className="text-slate-500 text-lg leading-relaxed">
                        Tu biblioteca digital personal, minimalista y elegante.
                    </p>
                </div>

                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="relative group bg-white border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-3xl p-12 transition-all duration-300 ease-in-out cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-center justify-center"
                >
                    <input
                        type="file"
                        accept=".epub"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) onFileSelect(file)
                        }}
                    />
                    <div className="p-5 bg-blue-50 rounded-2xl mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
                        <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-slate-900 font-bold mb-1 text-lg">Suelta tu archivo aquí</p>
                    <p className="text-slate-400 text-sm">O haz clic para buscar en tu dispositivo</p>

                    <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-medium text-slate-500">Soporta solo archivos .epub</span>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-xs">
                    Privacidad total: Tus libros no salen de tu navegador.
                </p>
            </div>
        </div>
    )
}

export default Dropzone
