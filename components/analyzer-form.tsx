"use client";

import { useState } from "react";
import { Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface TrackResponse {
  data?: {
    title: string;
    artist: string;
    bpm: number | null;
    key: string | null;
  };
  error?: string;
}

export function AnalyzerForm() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const validateYouTubeUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const isYouTube = urlObj.hostname === 'youtube.com' || 
                       urlObj.hostname === 'www.youtube.com' || 
                       urlObj.hostname === 'youtu.be';
      const hasVideoId = urlObj.searchParams.get('v') || urlObj.pathname.slice(1);
      return isYouTube && hasVideoId;
    } catch {
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!validateYouTubeUrl(url)) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response format');
      }

      const data: TrackResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (!data.data) {
        throw new Error('No track data received from server');
      }

      const track = data.data;

      toast({
        title: "Track Analyzed",
        description: `${track.title} by ${track.artist}`,
      });
      
      if (track.bpm || track.key) {
        const details = [];
        if (track.bpm) details.push(`BPM: ${track.bpm}`);
        if (track.key) details.push(`Key: ${track.key}`);
        
        toast({
          title: "Track Details",
          description: details.join(' • '),
        });
      }
      
      setUrl("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze track';
      console.error('Error analyzing track:', { message: errorMessage });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5" />
          Analyze YouTube DJ Set
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={isAnalyzing}
            type="url"
            required
          />
          <Button
            type="submit"
            disabled={!url || isAnalyzing}
            className="min-w-[120px]"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}