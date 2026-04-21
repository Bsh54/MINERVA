# MINERVA

AI-powered STEM learning platform that generates personalized courses from any text content.

## Features

- **AI Course Generation**: Transform any text into structured courses with modules and topics
- **Detailed Explanations**: Each topic includes comprehensive AI-generated explanations with rich formatting
- **Interactive Quizzes**: Multiple choice and true/false questions for every topic and module
- **Progress Tracking**: Automatic saving of your learning progress
- **Multilingual**: Full support for English and French
- **Modern Interface**: Clean design with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: DeepSeek API
- **Styling**: Tailwind CSS 4
- **Internationalization**: next-intl

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

4. Set up the database

Run SQL migrations in Supabase Dashboard:
- `supabase/migrations/20260420_create_courses_table.sql`
- `supabase/migrations/20260420_create_course_system_tables.sql`

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
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── contexts/              # Context API (global state)
│   ├── i18n/                  # i18n configuration
│   └── utils/                 # Utilities
├── supabase/
│   └── migrations/            # SQL migrations
└── public/                    # Static assets
```

## Usage

1. **Create an account**: Sign up via email/password or Google OAuth
2. **Create a course**: Paste any text and choose the explanation level
3. **Customize**: Select topics to include, reorganize, add custom topics
4. **Learn**: Click on a topic to view detailed explanations
5. **Test**: Take quizzes to validate your knowledge
6. **Progress**: Your progress is automatically saved

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

## License

MIT

## Author

Bsh54
