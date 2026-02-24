# 🚀 PharmaGest — Guide de déploiement

## STRUCTURE DU REPO
```
/                    → Landing page (index.html)
/app/                → Application pharmacie
/admin/              → Super-admin (admin/index.html)
/supabase/functions/ → Edge function relance automatique
_headers             → CSP Netlify (sécurité)
_redirects           → Routes Netlify
netlify.toml         → Config build
```

---

## ÉTAPE 1 — Supabase (15 min)

1. Ouvrir https://supabase.com → votre projet
2. **SQL Editor** → coller le contenu de `supabase_saas.sql` → **Run**
3. Vérifier que les 11 tables apparaissent avec ✅

---

## ÉTAPE 2 — Netlify (10 min)

1. Aller sur https://netlify.com → **Add new site** → **Import an existing project**
2. Connecter votre repo GitHub
3. **Build settings** :
   - Base directory : (laisser vide)
   - Publish directory : `.` (point)
   - Build command : (laisser vide)
4. Cliquer **Deploy site**
5. Votre URL sera : `https://xxxxx.netlify.app`

### Pour changer l'URL Netlify :
- Site settings → General → Site name → changer en `pharmagest-sn`
- URL : `https://pharmagest-sn.netlify.app`

---

## ÉTAPE 3 — Resend Email (10 min)

1. Créer compte sur https://resend.com
2. **API Keys** → Create API Key → copier la clé
3. Coller dans `index.html` :
   ```js
   const RESEND_API_KEY = 'votre_clé_ici';
   ```
4. Coller dans `admin/index.html` :
   ```js
   const RESEND_API_KEY_ADMIN = 'votre_clé_ici';
   ```
5. Redéployer sur Netlify (git push)

> ⚠️ Sans domaine vérifié sur Resend, les emails partent de `onboarding@resend.dev`
> Pour envoyer depuis `noreply@pharmagest.sn`, vérifier votre domaine dans Resend.

---

## ÉTAPE 4 — Wave API (quand vous avez 10+ clients)

1. Créer compte Wave Business : https://wave.com/business
2. Dashboard → **Developers** → Create API Key
3. Coller dans `app/index.html` :
   ```js
   const WAVE_API_KEY = 'votre_clé_wave_ici';
   ```
4. Mettre à jour l'URL de succès :
   ```js
   const APP_URL = 'https://pharmagest-sn.netlify.app';
   ```

---

## ÉTAPE 5 — Relances automatiques (Supabase Edge Functions)

1. Installer Supabase CLI : `npm install -g supabase`
2. Se connecter : `supabase login`
3. Lier le projet : `supabase link --project-ref tmshposkrebpwhtuxfaf`
4. Ajouter les variables d'environnement :
   ```bash
   supabase secrets set RESEND_API_KEY=votre_clé
   supabase secrets set ADMIN_WA_TEL=221770000000
   supabase secrets set APP_URL=https://pharmagest-sn.netlify.app
   ```
5. Déployer la fonction :
   ```bash
   supabase functions deploy relance-trial
   ```
6. Configurer le cron dans Supabase Dashboard :
   - Database → Edge Functions → relance-trial
   - Schedule : `0 9 * * *` (chaque jour à 9h UTC)

---

## WORKFLOW COMPLET

```
Pharmacien → pharmagest-sn.netlify.app
    ↓
Inscription → Supabase crée la pharmacie (statut: trial)
    ↓
Email confirmation envoyé via Resend
    ↓
Pharmacien accède à /app/?ph=ph_xxx → onboarding wizard
    ↓
Utilise l'app 30 jours gratuitement
    ↓
J-7, J-3, J-1 : email de relance automatique (Edge Function)
    ↓
Admin voit dans /admin/ → clique "Activer"
    ↓
Client paie via Wave → statut passe à "active"
```

---

## VARIABLES À CONFIGURER

| Fichier | Variable | Valeur |
|---------|----------|--------|
| `index.html` | `RESEND_API_KEY` | Clé Resend |
| `index.html` | `ADMIN_WA_TEL` | Votre numéro WhatsApp |
| `admin/index.html` | `RESEND_API_KEY_ADMIN` | Clé Resend |
| `app/index.html` | `WAVE_API_KEY` | Clé Wave Business |
| `app/index.html` | `APP_URL` | URL Netlify |

---

## CHECKLIST MISE EN LIGNE

- [ ] SQL exécuté dans Supabase
- [ ] Repo poussé sur GitHub
- [ ] Site déployé sur Netlify
- [ ] URL testée (inscription → app → admin)
- [ ] Clé Resend configurée
- [ ] Email de test reçu
- [ ] Edge function déployée (optionnel)
- [ ] 3 pharmacies pilotes inscrites
