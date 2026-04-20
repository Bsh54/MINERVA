# MINERVA

Plateforme d'apprentissage STEM alimentée par l'IA qui génère des cours personnalisés à partir de n'importe quel contenu texte.

## Fonctionnalités

- **Génération de cours par IA** : Transformez n'importe quel texte en cours structuré avec modules et topics
- **Explications détaillées** : Chaque topic dispose d'une explication complète générée par IA avec formatage riche
- **Quiz interactifs** : QCM et Vrai/Faux pour chaque topic et module
- **Suivi de progression** : Sauvegarde automatique de votre avancement
- **Multilingue** : Support complet français et anglais
- **Interface moderne** : Design épuré avec Tailwind CSS

## Stack technique

- **Framework** : Next.js 16.2.4 (App Router)
- **Langage** : TypeScript
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **IA** : DeepSeek API
- **Styling** : Tailwind CSS 4
- **Internationalisation** : next-intl

## Installation

1. Cloner le repository
```bash
git clone https://github.com/Bsh54/MINERVA.git
cd MINERVA/stem-app
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement

Créer un fichier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_URL=your_deepseek_api_url
DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. Configurer la base de données

Exécuter les migrations SQL dans Supabase Dashboard :
- `supabase/migrations/20260420_create_courses_table.sql`
- `supabase/migrations/20260420_create_course_system_tables.sql`

5. Lancer le serveur de développement
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du projet

```
stem-app/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── [locale]/          # Routes internationalisées
│   │   └── api/               # API routes
│   ├── components/            # Composants React
│   ├── contexts/              # Context API (état global)
│   ├── i18n/                  # Configuration i18n
│   └── utils/                 # Utilitaires
├── supabase/
│   └── migrations/            # Migrations SQL
└── public/                    # Assets statiques
```

## Utilisation

1. **Créer un compte** : Inscription via email/mot de passe
2. **Créer un cours** : Coller n'importe quel texte et choisir le niveau d'explication
3. **Personnaliser** : Sélectionner les topics à inclure, réorganiser, ajouter des topics personnalisés
4. **Apprendre** : Cliquer sur un topic pour voir l'explication détaillée
5. **Tester** : Passer les quiz pour valider vos connaissances
6. **Progresser** : Votre avancement est sauvegardé automatiquement

## Architecture

### Génération de contenu

- Les cours sont générés via DeepSeek API avec des prompts structurés
- Les explications utilisent du markdown pour un formatage riche
- Les quiz combinent QCM (4 options) et questions Vrai/Faux

### Base de données

- **courses** : Stocke les cours avec leur plan (JSONB)
- **topic_explanations** : Cache des explications générées
- **quizzes** : Cache des quiz générés
- **user_progress** : Progression utilisateur (topics/modules complétés, scores)

### Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Authentification via Supabase Auth
- Les utilisateurs ne voient que leurs propres données

## Développement

```bash
# Lancer en mode développement
npm run dev

# Build de production
npm run build

# Lancer la version de production
npm start

# Linter
npm run lint
```

## Licence

MIT

## Auteur

Bsh54
