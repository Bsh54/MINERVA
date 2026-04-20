# Configuration Supabase pour Vercel

## URLs de redirection à configurer dans Supabase Dashboard

1. Aller dans **Authentication** → **URL Configuration**

2. Ajouter ces URLs dans **Redirect URLs**:
   - `https://votre-domaine.vercel.app/auth/callback`
   - `https://votre-domaine.vercel.app/*`

3. Configurer **Site URL**: `https://votre-domaine.vercel.app`

## Variables d'environnement Vercel

Ajouter dans Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_URL=your_deepseek_api_url
DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Callback route

Le callback est géré automatiquement par Supabase Auth. Assurez-vous que la route `/auth/callback` existe dans votre application.
