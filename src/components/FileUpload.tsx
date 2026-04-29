import React, { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Warning } from '@phosphor-icons/react';
import { BatteryReading } from '@/lib/types';

const MAX_FILE_SIZE_MB = 50;

interface FileUploadProps {
  onDataParsed: (readings: BatteryReading[]) => void;
}

export function FileUpload({ onDataParsed }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const handleFileRead = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    // Terminate any previous worker that may still be running
    workerRef.current?.terminate();
    workerRef.current = null;

    try {
      setProgress(10);
      const content = await file.text();
      setProgress(20);

      const readings = await new Promise<BatteryReading[]>((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/csv-parser.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'progress') {
            setProgress(msg.progress);
          } else if (msg.type === 'result') {
            worker.terminate();
            workerRef.current = null;
            resolve(msg.readings);
          } else if (msg.type === 'error') {
            worker.terminate();
            workerRef.current = null;
            reject(new Error(msg.message));
          }
        };

        worker.onerror = (e) => {
          worker.terminate();
          workerRef.current = null;
          reject(new Error(e.message || 'Worker error'));
        };

        worker.postMessage({ type: 'parse', content });
      });

      if (readings.length === 0) {
        throw new Error('No valid battery readings found in file');
      }

      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      onDataParsed(readings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onDataParsed]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    
    handleFileRead(file);
  }, [handleFileRead]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <Card>
      <CardContent className="p-8">
        <div
          className={`upload-zone rounded-lg p-12 text-center transition-all duration-300 ${
            dragOver ? 'drag-over' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload size={32} className="text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload Battery Telemetry</h3>
              <p className="text-muted-foreground">
                Drop your CSV file here or click to browse
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>CSV format required</span>
              </div>
              <span>Maximum file size: {MAX_FILE_SIZE_MB}MB</span>
            </div>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="mt-4"
            >
              {uploading ? 'Processing...' : 'Select File'}
            </Button>
          </div>
        </div>
        
        {uploading && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing file...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {error && (
          <Alert className="mt-6" variant="destructive">
            <Warning size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}