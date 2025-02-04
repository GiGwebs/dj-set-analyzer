"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightFromLine, BarChart3, AlertCircle } from "lucide-react";
import { supabase } from '@/lib/supabase/client';
import { TrackAnalyzer } from '@/lib/track-analyzer';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthContainer } from './auth/auth-container';

interface TransitionData {
  fromTrack: string;
  toTrack: string;
  frequency: number;
  fromKey: string | null;
  toKey: string | null;
  fromBpm: number | null;
  toBpm: number | null;
}

export function TransitionsView() {
  const [transitions, setTransitions] = useState<TransitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchTransitions();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        fetchTransitions();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  };

  async function fetchTransitions() {
    try {
      setError(null);
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from('transitions')
        .select(`
          id,
          frequency,
          from_track:from_track_id(
            title,
            artist,
            key,
            bpm
          ),
          to_track:to_track_id(
            title,
            artist,
            key,
            bpm
          )
        `)
        .order('frequency', { ascending: false })
        .limit(10);

      if (queryError) {
        console.error('Error fetching transitions:', queryError);
        setError('Failed to load transitions. Please try again later.');
        return;
      }

      if (!data || data.length === 0) {
        setTransitions([]);
        return;
      }

      // Transform the data
      const formattedData = data.map(t => ({
        fromTrack: `${t.from_track.artist} - ${t.from_track.title}`,
        toTrack: `${t.to_track.artist} - ${t.to_track.title}`,
        frequency: t.frequency,
        fromKey: t.from_track.key ? TrackAnalyzer.normalizeKey(t.from_track.key) : null,
        toKey: t.to_track.key ? TrackAnalyzer.normalizeKey(t.to_track.key) : null,
        fromBpm: t.from_track.bpm,
        toBpm: t.to_track.bpm
      }));

      setTransitions(formattedData);
    } catch (error: any) {
      console.error('Error processing transitions:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Track Transitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>Please sign in or create an account to view transitions</AlertDescription>
            </Alert>
            <AuthContainer />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Track Transitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const chartData = transitions.map(t => ({
    name: t.fromTrack,
    transitions: t.frequency
  }));

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Track Transitions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Loading transitions...
              </div>
            ) : transitions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No transitions found. Add some tracks and transitions to see them here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    width={40}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="transitions" 
                    fill="hsl(var(--chart-1))"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="table">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Track</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To Track</TableHead>
                    <TableHead>Key Change</TableHead>
                    <TableHead>BPM Change</TableHead>
                    <TableHead className="text-right">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Loading transitions...
                      </TableCell>
                    </TableRow>
                  ) : transitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        <p>No transitions found. Add some tracks and transitions to see them here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transitions.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{t.fromTrack}</TableCell>
                        <TableCell>
                          <ArrowRightFromLine className="h-4 w-4" />
                        </TableCell>
                        <TableCell>{t.toTrack}</TableCell>
                        <TableCell>
                          {t.fromKey && t.toKey ? `${t.fromKey} → ${t.toKey}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {t.fromBpm && t.toBpm 
                            ? `${t.fromBpm.toFixed(1)} → ${t.toBpm.toFixed(1)}`
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell className="text-right">{t.frequency}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}