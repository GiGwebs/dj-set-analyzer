import { AnalyzerForm } from "@/components/analyzer-form";
import { FeatureGrid } from "@/components/feature-grid";
import { TransitionsView } from "@/components/transitions-view";
import { PlaylistGeneratorView } from "@/components/playlist-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">DJ Set Analyzer</h1>
            <p className="text-muted-foreground text-lg">
              Extract tracklists, analyze transitions, and generate playlists from YouTube DJ sets
            </p>
          </div>

          <AnalyzerForm />
          <TransitionsView />
          <PlaylistGeneratorView />
          <FeatureGrid />
        </div>
      </div>
    </main>
  );
}