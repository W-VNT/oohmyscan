# Web Push notifications — setup

Toute la logique code est en place. Reste 3 étapes de config à faire une seule fois :

## 1. VAPID keys

J'ai généré un jeu de clés pour toi (garde-les en lieu sûr, ne les commit pas) :

```
Public  : BAzPcKS7j7tNwm8ECMEJWb1QnjGaMjUkXBLfMxLikrpT8Qg41fnlJqraEmU7cRhKNX71zsESbY_bSuKjlahe1Qk
Private : L2vxKOlG9WRDT_S9hi3NnwGKTeZSPPrdx3joNb-hu-4
Subject : mailto:contact@oohmyad.com
```

Si tu veux en regenerer un nouveau jeu :

```bash
npx web-push generate-vapid-keys
```

## 2. Set les variables d'environnement

### Client (Vercel + `.env.local`)

Ajoute dans `.env.local` :

```
VITE_VAPID_PUBLIC_KEY=BAzPcKS7j7tNwm8ECMEJWb1QnjGaMjUkXBLfMxLikrpT8Qg41fnlJqraEmU7cRhKNX71zsESbY_bSuKjlahe1Qk
```

Dans **Vercel** : Settings → Environment Variables → ajoute la même clé pour Production + Preview + Development.

### Serveur (Supabase edge function)

Depuis un terminal, dans le repo (Supabase CLI installé) :

```bash
supabase secrets set VAPID_PUBLIC_KEY=BAzPcKS7j7tNwm8ECMEJWb1QnjGaMjUkXBLfMxLikrpT8Qg41fnlJqraEmU7cRhKNX71zsESbY_bSuKjlahe1Qk
supabase secrets set VAPID_PRIVATE_KEY=L2vxKOlG9WRDT_S9hi3NnwGKTeZSPPrdx3joNb-hu-4
supabase secrets set VAPID_SUBJECT=mailto:contact@oohmyad.com
```

Ou depuis Dashboard Supabase → Edge Functions → Settings → Add secret.

## 3. Deploy l'edge function

```bash
supabase functions deploy send-push
```

## 4. Configure le Database Webhook

**Supabase Dashboard** → Database → Webhooks → **Create a new hook** :

- **Name** : `notification-to-push`
- **Table** : `notifications`
- **Events** : `INSERT`
- **Type** : `Supabase Edge Functions`
- **Function** : `send-push`
- **HTTP headers** : `Content-Type: application/json` (déjà par défaut)
- **HTTP params** : rien
- **Timeout** : 5000 ms

Save. Le webhook postera à chaque INSERT dans notifications le payload standard `{type: 'INSERT', table: 'notifications', record: {...}}`.

## 5. Applique les migrations

```bash
# Depuis Supabase Studio SQL Editor
supabase/migrations/20260703_notifications.sql
supabase/migrations/20260703_push_subscriptions.sql
```

Note : ordre important. `notifications` avant `push_subscriptions` (pas de dépendance mais logique).

## Test

1. Ouvre la PWA sur iPhone (installée sur écran d'accueil, iOS ≥ 16.4)
2. Va dans Profil → activer les notifications → autoriser
3. Sur un autre device connecté en tant qu'op, signale un panneau
4. L'iPhone devrait recevoir la notif système en quelques secondes
5. Tap sur la notif → ouvre la fiche panneau

Si ça marche pas :
- Vérifie que la subscription est bien en DB (`SELECT * FROM push_subscriptions`)
- Vérifie les logs de l'edge function (`supabase functions logs send-push`)
- Vérifie que le webhook est enabled dans Dashboard
