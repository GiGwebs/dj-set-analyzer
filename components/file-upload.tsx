"use client";

import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Music2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FileUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsProcessing(true);
    try {
      // Here we would process the files and extract metadata
      // For now, we'll just show a success message
      toast({
        title: "Files Selected",
        description: `Selected ${files.length} file(s)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process audio files",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          Local Track Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".mp3,.m4a,.wav,.aiff"
            multiple
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="flex-1"
            disabled={isProcessing}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="min-w-[120px]"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : "Upload"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}