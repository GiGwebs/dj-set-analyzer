"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Info, Wand2, Music2, ArrowRightLeft, Sparkles } from "lucide-react";
import type { PlaylistTrack } from '@/lib/playlist-generator';

interface TransitionInsight {
  fromTrack: PlaylistTrack;
  toTrack: PlaylistTrack;
  confidence: number;
  reasons: {
    type: 'bpm' | 'key' | 'history' | 'energy';
    score: number;
    description: string;
  }[];
  alternatives: {
    track: PlaylistTrack;
    score: number;
    reasons: string[];
  }[];
}

interface AIInsightsProps {
  playlist: PlaylistTrack[];
  insights: TransitionInsight[];
  onTransitionChange: (fromId: string, toId: string, newToTrack: PlaylistTrack) => void;
  onPlaylistRate: (rating: number) => void;
}

export function AIInsights({ 
  playlist, 
  insights, 
  onTransitionChange,
  onPlaylistRate 
}: AIInsightsProps) {
  const [selectedTransition, setSelectedTransition] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'bpm':
        return <Music2 className="h-4 w-4" />;
      case 'key':
        return <Wand2 className="h-4 w-4" />;
      case 'history':
        return <Star className="h-4 w-4" />;
      case 'energy':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Playlist Rating</h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="icon"
                    onClick={() => onPlaylistRate(rating)}
                  >
                    <Star 
                      className="h-5 w-5" 
                      fill={rating <= (playlist.length ? 4 : 0) ? "currentColor" : "none"} 
                    />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Overall Quality</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Transition Smoothness</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Energy Flow</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Key Compatibility</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">AI Decisions</h3>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                        {(insight.confidence * 100).toFixed(0)}%
                      </Badge>
                      <span className="text-sm">
                        {insight.fromTrack.title} → {insight.toTrack.title}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="transitions" className="space-y-4">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`mb-4 rounded-lg border p-4 ${
                    selectedTransition === index ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedTransition(index)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      <span className="font-medium">
                        {insight.fromTrack.title} → {insight.toTrack.title}
                      </span>
                    </div>
                    <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                      {(insight.confidence * 100).toFixed(0)}% Confidence
                    </Badge>
                  </div>

                  <div className="mb-4 space-y-2">
                    {insight.reasons.map((reason, rIndex) => (
                      <div key={rIndex} className="flex items-center gap-2 text-sm">
                        {getReasonIcon(reason.type)}
                        <span>{reason.description}</span>
                        <Badge variant="secondary">
                          {(reason.score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {insight.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Alternative Transitions</h4>
                      {insight.alternatives.map((alt, aIndex) => (
                        <div key={aIndex} className="flex items-center justify-between gap-2 text-sm">
                          <span>{alt.track.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {(alt.score * 100).toFixed(0)}%
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onTransitionChange(
                                insight.fromTrack.id,
                                insight.toTrack.id,
                                alt.track
                              )}
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}