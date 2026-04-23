'use client';

import { useState, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FileUploadZoneProps {
  onTextExtracted: (text: string) => void;
  onExtractionStateChange: (isExtracting: boolean) => void;
  locale: string;
}

export default function FileUploadZone({ onTextExtracted, onExtractionStateChange, locale }: FileUploadZoneProps) {
  const t = useTranslations('Dashboard');
  const tFile = useTranslations('FileUpload');
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedFormats = '.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.webp';
  const maxSizeMB = 50;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);

    // Check file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(tFile('fileTooLarge', { size: fileSizeMB.toFixed(1), max: maxSizeMB }));
      return;
    }

    // Check file type
    const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      setError(tFile('unsupportedFormat'));
      return;
    }

    setFile(selectedFile);
    await extractText(selectedFile);
  };

  const extractText = async (fileToExtract: File) => {
    setIsExtracting(true);
    onExtractionStateChange(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToExtract);
      formData.append('lang', locale);

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const data = await response.json();
      onTextExtracted(data.text);

    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(tFile('extractionError', { message: err.message }));
    } finally {
      setIsExtracting(false);
      onExtractionStateChange(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-red-500" />;
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  };

  if (isExtracting) {
    return (
      <div className="border-2 border-accent-300 rounded-2xl p-12 bg-accent-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-16 h-16 animate-spin text-accent-500" />
          <div className="text-center">
            <p className="text-lg font-bold text-stem-900 mb-2">
              {tFile('extracting')}
            </p>
            <p className="text-sm text-stem-600">
              {tFile('extractionTime')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (file && !error) {
    return (
      <div className="border-2 border-green-300 rounded-2xl p-6 bg-green-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {getFileIcon(file.name)}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-bold text-green-900">
                  {tFile('extractionSuccess')}
                </p>
              </div>
              <p className="text-sm text-green-700">{file.name}</p>
              <p className="text-xs text-green-600 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-green-700" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-stem-300 hover:border-accent-400 hover:bg-stem-50'
        }`}
      >
        <input
          type="file"
          accept={acceptedFormats}
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-16 h-16 mx-auto mb-4 text-stem-400" />
          <p className="text-lg font-bold text-stem-900 mb-2">
            {tFile('uploadLabel')}
          </p>
          <p className="text-sm text-stem-600 mb-4">
            {tFile('uploadInstruction')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-stem-500">
            <span className="px-3 py-1 bg-stem-100 rounded-full">PDF</span>
            <span className="px-3 py-1 bg-stem-100 rounded-full">JPG</span>
            <span className="px-3 py-1 bg-stem-100 rounded-full">PNG</span>
            <span className="px-3 py-1 bg-stem-100 rounded-full">BMP</span>
            <span className="px-3 py-1 bg-stem-100 rounded-full">TIFF</span>
            <span className="px-3 py-1 bg-stem-100 rounded-full">WEBP</span>
          </div>
          <p className="text-xs text-stem-500 mt-3">
            {tFile('maxSize', { max: maxSizeMB })}
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
