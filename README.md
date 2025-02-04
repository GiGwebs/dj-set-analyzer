# DJ Set Analyzer

A web application for analyzing DJ sets, identifying track transitions, and generating optimized playlists.

## Features

- YouTube Set Analysis
- Track Recognition using ACRCloud
- Transition Analysis
- AI-enhanced Playlist Generation
- Supabase Integration

## Setup

1. Clone the repository:

```bash
git clone https://github.com/GiGwebs/dj-set-analyzer.git
cd dj-set-analyzer
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ACRCLOUD_HOST=identify-eu-west-1.acrcloud.com
NEXT_PUBLIC_ACRCLOUD_ACCESS_KEY=your-acr-access-key
NEXT_PUBLIC_ACRCLOUD_SECRET_KEY=your-acr-secret-key
YOUTUBE_API_KEY=your-youtube-api-key
```

4. Start development server:

```bash
npm run dev
```

## Environment Variables

See `.env.example` for required variables.

## Security

Report vulnerabilities via SECURITY.md

## License

MIT License
