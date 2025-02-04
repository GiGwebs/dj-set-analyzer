"use client";

import { useState, useEffect } from "react";
import { PlaylistGenerator, PlaylistTrack } from '@/lib/playlist-generator';
import { AIPlaylistGenerator, AIPlaylistOptions } from '@/lib/ai-playlist-generator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Music4, Save, Download, ArrowUp, ArrowDown, X, Undo, Search, Sparkles } from "lucide-react";
import { supabase } from '@/lib/supabase/client';
import debounce from 'lodash/debounce';
import { AIInsights } from "@/components/ai-insights";

export function PlaylistGeneratorView() {
  const [seedTrackId, setSeedTrackId] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [targetLength, setTargetLength] = useState(10);
  const [maxBpmChange, setMaxBpmChange] = useState(8);
  const [preferHarmonicMixing, setPreferHarmonicMixing] = useState(true);
  const [energyMode, setEnergyMode] = useState<'smooth' | 'dynamic' | 'high'>('smooth');
  const [useAI, setUseAI] = useState(false);
  const [aiStyle, setAIStyle] = useState<'balanced' | 'experimental' | 'safe'>('balanced');
  const [aiMood, setAIMood] = useState<'energetic' | 'chill' | 'progressive'>('progressive');
  const [aiTransitionComplexity, setAITransitionComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate');
  const [generatedPlaylist, setGeneratedPlaylist] = useState<PlaylistTrack[]>([]);
  const [playlistHistory, setPlaylistHistory] = useState<PlaylistTrack[][]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportFormat, setExportFormat] = useState<'rekordbox' | 'virtualdj' | 'm3u'>('rekordbox');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInsights, setAIInsights] = useState<any[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const { toast } = useToast();

  // Auto-save playlist changes
  useEffect(() => {
    if (generatedPlaylist.length > 0) {
      const debouncedSave = debounce(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && playlistName) {
          try {
            await PlaylistGenerator.savePlaylist(
              `${playlistName} (Auto-saved)`,
              generatedPlaylist,
              user.id
            );
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, 5000);

      debouncedSave();
      return () => debouncedSave.cancel();
    }
  }, [generatedPlaylist, playlistName]);

  const handleTransitionChange = async (fromId: string, toId: string, newTrack: PlaylistTrack) => {
    const newPlaylist = [...generatedPlaylist];
    const toIndex = newPlaylist.findIndex(t => t.id === toId);
    
    if (toIndex !== -1) {
      // Save to history before changing
      setPlaylistHistory(prev => [...prev, generatedPlaylist]);
      
      // Update the track
      newPlaylist[toIndex] = { ...newTrack, position: toIndex };
      setGeneratedPlaylist(newPlaylist);
      
      // Update insights
      if (useAI) {
        const updatedInsights = await AIPlaylistGenerator.getPlaylistInsights(newPlaylist);
        setAIInsights(updatedInsights);
      }
      
      toast({
        title: "Transition Updated",
        description: "Playlist has been updated with the new transition",
      });
    }
  };

  const handlePlaylistRate = async (rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to rate playlists",
          variant: "destructive",
        });
        return;
      }

      await supabase
        .from('playlist_ratings')
        .insert([{
          user_id: user.id,
          playlist_id: generatedPlaylist[0]?.id,
          rating,
          is_ai_generated: useAI
        }]);

      toast({
        title: "Thank You!",
        description: "Your rating helps improve our AI recommendations",
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!seedTrackId) {
      toast({
        title: "Error",
        description: "Please select a seed track",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      let playlist: PlaylistTrack[];
      let insights: any[] = [];
      
      if (useAI) {
        const aiOptions: AIPlaylistOptions = {
          targetLength,
          maxBpmChange,
          preferHarmonicMixing,
          energyMode,
          style: aiStyle,
          mood: aiMood,
          transitionComplexity: aiTransitionComplexity
        };
        
        playlist = await AIPlaylistGenerator.generateAIPlaylist(seedTrackId, aiOptions);
        insights = await AIPlaylistGenerator.getPlaylistInsights(playlist);
        
        setAIInsights(insights);
        setShowInsights(true);
        
        toast({
          title: "AI Enhancement",
          description: "Playlist optimized using AI-powered analysis",
        });
      } else {
        playlist = await PlaylistGenerator.generatePlaylist(seedTrackId, {
          targetLength,
          maxBpmChange,
          preferHarmonicMixing,
          energyMode
        });
        setShowInsights(false);
      }

      // Save current playlist to history before updating
      if (generatedPlaylist.length > 0) {
        setPlaylistHistory(prev => [...prev, generatedPlaylist]);
      }

      setGeneratedPlaylist(playlist);
      
      toast({
        title: "Success",
        description: `Generated playlist with ${playlist.length} tracks`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate playlist",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!playlistName) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to save playlists",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await PlaylistGenerator.savePlaylist(playlistName, generatedPlaylist, user.id);
      toast({
        title: "Success",
        description: "Playlist saved successfully",
      });
      setPlaylistName("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save playlist",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await PlaylistGenerator.exportPlaylist(generatedPlaylist, exportFormat);
      
      const blob = new Blob([exportData], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${playlistName || 'playlist'}.${
        exportFormat === 'rekordbox' ? 'xml' : 
        exportFormat === 'virtualdj' ? 'csv' : 'm3u'
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Playlist exported in ${exportFormat} format`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export playlist",
        variant: "destructive",
      });
    }
  };

  const handleUndo = () => {
    if (playlistHistory.length > 0) {
      const previousPlaylist = playlistHistory[playlistHistory.length - 1];
      setGeneratedPlaylist(previousPlaylist);
      setPlaylistHistory(prev => prev.slice(0, -1));
      
      toast({
        title: "Success",
        description: "Reverted to previous playlist state",
      });
    }
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === generatedPlaylist.length - 1)
    ) {
      return;
    }

    const newPlaylist = [...generatedPlaylist];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newPlaylist[index], newPlaylist[newIndex]] = [newPlaylist[newIndex], newPlaylist[index]];
    
    newPlaylist.forEach((track, i) => {
      track.position = i;
    });

    setGeneratedPlaylist(newPlaylist);
  };

  const removeTrack = (index: number) => {
    setPlaylistHistory(prev => [...prev, generatedPlaylist]);
    const newPlaylist = generatedPlaylist.filter((_, i) => i !== index);
    newPlaylist.forEach((track, i) => {
      track.position = i;
    });
    setGeneratedPlaylist(newPlaylist);
  };

  const filteredPlaylist = generatedPlaylist.filter(track => 
    searchTerm === "" || 
    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music4 className="h-5 w-5" />
          Smart Playlist Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Seed Track</Label>
            <Input
              placeholder="Select a track to start with..."
              value={seedTrackId}
              onChange={(e) => setSeedTrackId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Length: {targetLength} tracks</Label>
            <Slider
              value={[targetLength]}
              onValueChange={([value]) => setTargetLength(value)}
              min={5}
              max={20}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Max BPM Change: {maxBpmChange} BPM</Label>
            <Slider
              value={[maxBpmChange]}
              onValueChange={([value]) => setMaxBpmChange(value)}
              min={2}
              max={16}
              step={1}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={preferHarmonicMixing}
              onCheckedChange={setPreferHarmonicMixing}
            />
            <Label>Prefer Harmonic Mixing</Label>
          </div>

          <div className="space-y-2">
            <Label>Energy Mode</Label>
            <Select value={energyMode} onValueChange={(value: 'smooth' | 'dynamic' | 'high') => setEnergyMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smooth">Smooth Progression</SelectItem>
                <SelectItem value="dynamic">Dynamic Flow</SelectItem>
                <SelectItem value="high">High Energy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useAI}
                onCheckedChange={setUseAI}
              />
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Use AI Enhancement
              </Label>
            </div>

            {useAI && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>AI Style</Label>
                  <Select 
                    value={aiStyle} 
                    onValueChange={(value: 'balanced' | 'experimental' | 'safe') => setAIStyle(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="experimental">Experimental</SelectItem>
                      <SelectItem value="safe">Safe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI Mood</Label>
                  <Select 
                    value={aiMood} 
                    onValueChange={(value: 'energetic' | 'chill' | 'progressive') => setAIMood(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="chill">Chill</SelectItem>
                      <SelectItem value="progressive">Progressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transition Complexity</Label>
                  <Select 
                    value={aiTransitionComplexity} 
                    onValueChange={(value: 'simple' | 'moderate' | 'complex') => setAITransitionComplexity(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !seedTrackId}
            className="w-full"
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {useAI ? 'Generate AI-Enhanced Playlist' : 'Generate Playlist'}
          </Button>
        </div>

        {generatedPlaylist.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tracks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleUndo}
                disabled={playlistHistory.length === 0}
              >
                <Undo className="mr-2 h-4 w-4" />
                Undo
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actions</TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>BPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlaylist.map((track, index) => (
                    <TableRow key={track.id}>
                      <TableCell className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveTrack(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveTrack(index, 'down')}
                          disabled={index === generatedPlaylist.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTrack(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>{track.position + 1}</TableCell>
                      <TableCell className="font-medium">{track.title}</TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell>{track.key || 'N/A'}</TableCell>
                      <TableCell>{track.bpm?.toFixed(1) || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {showInsights && generatedPlaylist.length > 0 && (
              <AIInsights
                playlist={generatedPlaylist}
                insights={aiInsights}
                onTransitionChange={handleTransitionChange}
                onPlaylistRate={handlePlaylistRate}
              />
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Enter playlist name..."
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="flex-1"
              />
              <Select
                value={exportFormat}
                onValueChange={(value: 'rekordbox' | 'virtualdj' | 'm3u') => setExportFormat(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rekordbox">Rekordbox</SelectItem>
                  <SelectItem value="virtualdj">VirtualDJ</SelectItem>
                  <SelectItem value="m3u">M3U Playlist</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExport}
                disabled={generatedPlaylist.length === 0}
                className="min-w-[100px]"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !playlistName}
                className="min-w-[100px]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}