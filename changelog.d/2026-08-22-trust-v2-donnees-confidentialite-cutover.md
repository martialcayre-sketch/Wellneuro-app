### Le document patient « Vos données personnelles » passe en v2 — l'hébergement dit ce qu'il est devenu (2026-08-22)

Publiée au cutover de l'hébergement (LOT-02 HDS), validée par le responsable
le 2026-08-22 : v2 immuable ajoutée au registre TRUST (`registre.ts`), hash
verrouillé par le banc, v1 conservée à l'historique.

- **La liste des prestataires cesse de mentir** : depuis la bascule DNS,
  Vercel n'héberge plus l'application ni Supabase la base — Scalingo (HDS,
  France) les porte, et les anciens hébergeurs sont déclarés pour ce qu'ils
  sont : solution de retour temporaire, puis effacement avec preuve.
- **Section neuve « Où sont hébergées vos données »** — y compris le point le
  plus délicat, dit sans détour : le contrat HDS n'est pas signé, la période
  transitoire est moins protégée, elle prend fin à la signature et se rejuge
  au plus tard le 2026-10-21 (`D-078` §3 : taire ce point rendrait
  l'information incomplète sur ce qui a précisément changé).
- **Sans acquittement requis** (décision du responsable — même régime que la
  v1) ; **sans paragraphe Sentry** : aucun DSN n'existe en production, l'outil
  n'envoie rien — le déclarer décrirait un usage qui n'existe pas.
- `gouvernance.ts` (copie morte documentée) réaligné à l'identique pour ne
  pas élargir la dette de divergence.
- C'est aussi le **support écrit du renouvellement d'information post-`D-078`**
  dont l'échéance « avant la bascule » était dépassée — publié au cutover
  même, à quelques heures près.
