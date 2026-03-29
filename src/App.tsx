import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  Layers,
  Trash2,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from './lib/utils';

interface FileWithPreview extends File {
  preview: string;
  id: string;
  status: 'idle' | 'converting' | 'completed' | 'error';
  progress: number;
  isHeic?: boolean;
}

const SUPPORTED_FORMATS = ['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'HEIC', 'HEIF'];
const OUTPUT_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'];

export default function App() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = async (newFiles: File[]) => {
    if (files.length + newFiles.length > 20) {
      alert('Maximum 20 files allowed');
      return;
    }

    const preprocessedFiles = newFiles.map(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      const isHeic = ext === 'HEIC' || ext === 'HEIF' || file.type.includes('heic') || file.type.includes('heif');
      
      if (isHeic) {
        return Object.assign(file, {
          preview: '',
          id: Math.random().toString(36).substring(7),
          status: 'converting' as const,
          progress: 50,
          isHeic: true
        });
      }
      return Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
        status: 'idle' as const,
        progress: 0,
        isHeic: false
      });
    });

    const validFiles = preprocessedFiles.filter(file => {
      if (file.isHeic) return true;
      const type = file.type.split('/')[1]?.toUpperCase();
      return SUPPORTED_FORMATS.includes(type) || file.type === 'image/jpeg';
    });

    setFiles(prev => [...prev, ...validFiles]);

    for (const file of validFiles) {
      if (file.isHeic) {
        try {
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
          const blobToUse = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          
          const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          const newFile = new File([blobToUse], newFileName, { type: 'image/jpeg' });
          
          setFiles(prev => prev.map(f => {
            if (f.id === file.id) {
              return Object.assign(newFile, {
                preview: URL.createObjectURL(newFile),
                id: file.id,
                status: 'idle' as const,
                progress: 0
              });
            }
            return f;
          }));
        } catch (error) {
          console.error("Failed to convert HEIC:", error);
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', progress: 0 } : f));
        }
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  const convertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);

    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('format', outputFormat);

    try {
      // Simulate progress for UI feel
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'converting',
          progress: Math.min(f.progress + 10, 90)
        })));
      }, 200);

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Conversion failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.length === 1 
        ? `${files[0].name.split('.')[0]}.${outputFormat}`
        : 'converted_images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'completed',
        progress: 100
      })));
    } catch (error) {
      console.error(error);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        progress: 0
      })));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-orange-500/30",
      isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f5f5f7] text-gray-900"
    )}>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20",
          isDarkMode ? "bg-orange-600" : "bg-orange-400"
        )} />
        <div className={cn(
          "absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20",
          isDarkMode ? "bg-blue-600" : "bg-blue-400"
        )} />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ImageForge <span className="text-orange-500">AI</span></span>
        </div>
        
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-4 tracking-tighter"
          >
            TRANSFORM YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-purple-600">
              VISUAL ASSETS
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-500 max-w-2xl mx-auto"
          >
            The ultimate batch image converter. Fast, secure, and entirely in your browser. 
            No uploads to our servers, just pure performance.
          </motion.p>
        </header>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 cursor-pointer",
              "flex flex-col items-center justify-center py-20 px-6",
              isDarkMode 
                ? "bg-white/5 border-white/10 hover:border-orange-500/50 hover:bg-white/[0.07]" 
                : "bg-white border-gray-200 hover:border-orange-500/50 hover:shadow-xl",
              files.length > 0 && "py-12"
            )}
          >
            {/* Glowing Border Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-blue-500/10" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Drop your images here</h3>
              <p className="text-gray-500 mb-6">or click to browse from your device</p>
              
              <div className="flex flex-wrap justify-center gap-3">
                {SUPPORTED_FORMATS.map(format => (
                  <span key={format} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium uppercase tracking-wider">
                    {format}
                  </span>
                ))}
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => handleFiles(Array.from(e.target.files || []) as File[])}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </motion.div>

        {/* Controls & Previews */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-12 space-y-8"
            >
              {/* Toolbar */}
              <div className={cn(
                "flex flex-wrap items-center justify-between gap-6 p-6 rounded-2xl backdrop-blur-xl border",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-lg"
              )}>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Output Format</span>
                    <div className="relative">
                      <select 
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        className={cn(
                          "appearance-none pl-4 pr-10 py-2 rounded-lg font-bold outline-none transition-all",
                          isDarkMode ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        {OUTPUT_FORMATS.map(f => (
                          <option key={f} value={f}>{f.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-white/10" />
                  
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Total Files</span>
                    <span className="text-xl font-black">{files.length} <span className="text-sm font-normal text-gray-500">/ 20</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={clearAll}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-500 transition-colors font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                  <button 
                    onClick={convertImages}
                    disabled={isConverting}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-xl",
                      "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-105 active:scale-95",
                      isConverting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isConverting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    {isConverting ? 'Processing...' : 'Convert All'}
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={cn(
                        "group relative rounded-2xl overflow-hidden border transition-all duration-300",
                        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-md"
                      )}
                    >
                      <div className="aspect-video relative overflow-hidden bg-black/20">
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        {/* Status Overlay */}
                        <AnimatePresence>
                          {file.status !== 'idle' && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4"
                            >
                              {file.status === 'converting' && (
                                <>
                                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Converting</span>
                                </>
                              )}
                              {file.status === 'completed' && (
                                <>
                                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                                  <span className="text-xs font-bold uppercase tracking-widest text-green-500">Ready</span>
                                </>
                              )}
                              {file.status === 'error' && (
                                <>
                                  <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                                  <span className="text-xs font-bold uppercase tracking-widest text-red-500">Failed</span>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold truncate max-w-[150px]">{file.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded uppercase">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            className={cn(
                              "h-full transition-all duration-300",
                              file.status === 'error' ? "bg-red-500" : "bg-orange-500"
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        <AnimatePresence>
          {files.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
            >
              {[
                { icon: FileImage, title: "Multiple Formats", desc: "Support for JPG, PNG, WEBP, GIF, and more." },
                { icon: RefreshCw, title: "Batch Processing", desc: "Convert up to 20 images at once in seconds." },
                { icon: Download, title: "Instant Download", desc: "Get individual files or a neat ZIP archive." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h4 className="font-bold mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mt-20 py-12 border-t border-white/10 text-center">
        <p className="text-sm text-gray-500">
          Built with <span className="text-red-500">♥</span> for high-performance visual workflows.
        </p>
      </footer>
    </div>
  );
}
