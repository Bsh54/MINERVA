# MINERVA

AI-powered STEM learning platform that generates personalized courses from any text content with interactive 3D avatar and voice conversations.

## Features

- **AI Course Generation**: Transform any text into structured courses with modules and topics
- **Detailed Explanations**: Each topic includes comprehensive AI-generated explanations with rich formatting
- **Interactive Quizzes**: Multiple choice and true/false questions for every topic and module
- **AI Meeting (Beta)**: Voice conversations with a 3D VRM avatar using OpenAI Realtime API
- **AI Chatbot Widget**: Contextual AI assistant available throughout the platform
- **3D Avatar**: Animated VRM avatar with lip-sync, facial expressions, and body animations
- **Progress Tracking**: Automatic saving of your learning progress
- **Multilingual**: Full support for English and French
- **Modern Interface**: Clean design with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: DeepSeek API + OpenAI Realtime API
- **3D Rendering**: Three.js + @pixiv/three-vrm
- **Styling**: Tailwind CSS 4
- **Internationalization**: next-intl
- **HTTP Client**: Axios

## Installation

1. Clone the repository
```bash
git clone https://github.com/Bsh54/MINERVA.git
cd MINERVA/stem-app
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_URL=your_deepseek_api_url
DEEPSEEK_API_KEY=your_deepseek_api_key
```

**Note**: The AI Meeting feature requires additional configuration via a proxy service for OpenAI Realtime API access.

4. Set up the database

Run the SQL migration in Supabase Dashboard:
- Navigate to SQL Editor in your Supabase project
- Copy and execute `supabase/migrations/20260423_complete_schema.sql`
- This will create all tables, indexes, RLS policies, and triggers

5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
stem-app/
├── src/
│   ├── app/                    # Next.js pages (App Router)
│   │   ├── [locale]/          # Internationalized routes
│   │   │   ├── dashboard/     # Dashboard pages
│   │   │   │   ├── meeting/   # AI Meeting with VRM avatar
│   │   │   │   ├── course/    # Course viewer
│   │   │   │   └── profile/   # User profile
│   │   └── api/               # API routes
│   │       ├── chat/          # Chatbot API
│   │       └── courses/       # Course management
│   ├── components/            # React components
│   │   ├── chatbot/          # Chatbot widget components
│   │   ├── course/           # Course-related components
│   │   ├── dashboard/        # Dashboard components
│   │   └── VRMAvatar.tsx     # 3D avatar component
│   ├── contexts/              # Context API (global state)
│   │   ├── ChatbotContext.tsx
│   │   └── CourseContext.tsx
│   ├── i18n/                  # i18n configuration
│   └── utils/                 # Utilities
├── supabase/
│   └── migrations/            # SQL migrations
├── public/
│   └── models/                # VRM 3D models
└── messages/                  # i18n translations
```

## Usage

1. **Create an account**: Sign up via email/password or Google OAuth
2. **Create a course**: Paste any text and choose the explanation level
3. **Customize**: Select topics to include, reorganize, add custom topics
4. **Learn**: Click on a topic to view detailed explanations
5. **Test**: Take quizzes to validate your knowledge
6. **AI Meeting**: Start a voice conversation with the 3D avatar tutor
7. **Ask questions**: Use the chatbot widget for instant help
8. **Progress**: Your progress is automatically saved

## Architecture

### Content Generation

- Courses are generated via DeepSeek API with structured prompts
- Explanations use markdown for rich formatting
- Quizzes combine multiple choice (4 options) and true/false questions
- Content is cached in database to avoid regeneration

### Database

- **courses**: Stores courses with their plan (JSONB)
- **topic_explanations**: Cache for generated explanations
- **quizzes**: Cache for generated quizzes
- **user_progress**: User progress (completed topics/modules, scores)

All tables include:
- Proper indexes for performance
- Row Level Security (RLS) policies
- Foreign key constraints with CASCADE DELETE
- Automatic `updated_at` triggers

### 3D Avatar System

- **VRM Model**: Standard Japanese 3D avatar format
- **Animations**: Idle breathing, head movements, hand gestures
- **Lip Sync**: Real-time mouth animation based on audio level
- **Expressions**: Happy, relaxed, surprised, blinking
- **Three.js**: WebGL rendering with optimized performance

### AI Meeting

- **OpenAI Realtime API**: Low-latency voice conversations
- **Server VAD**: Automatic speech detection
- **Audio Processing**: PCM16 format at 24kHz
- **Streaming**: Real-time audio playback with queue management
- **Transcription**: Automatic conversation transcription

### Security

- Row Level Security (RLS) enabled on all tables
- Authentication via Supabase Auth
- Users only see their own data

## Development

```bash
# Run in development mode
npm run dev

# Production build
npm run build

# Run production version
npm start

# Linter
npm run lint
```

## Performance Optimizations

- API calls are cached to prevent duplicate content generation
- Explanations and quizzes are stored in database after first generation
- Frontend uses `useCallback` to prevent unnecessary re-renders
- Content is only fetched once per session
- Database indexes on frequently queried columns
- VRM avatar uses requestAnimationFrame for smooth 60fps animations
- Audio streaming with queue management for seamless playback

## License

MIT

## Author

Bsh54
