---
id: "LOT-05"
titre: "Montage cockpit + route de composition et envoi réemployé"
statut: "livré"
dépend_de: "LOT-04"
---

# LOT-05 — Montage cockpit + route de composition et envoi

> Livré le 2026-07-18. Traite le report « montage cockpit + route d'envoi » du
> handoff LOT-04. **UI praticien + route de lecture. Aucune migration.** Rend C3
> réellement utilisable dans l'application (jusqu'ici : domaine + composant testés
> mais non montés).

## But

Monter la composition documentaire C3 dans le dashboard praticien (page dédiée) et
fournir la route serveur qui compose un document à partir d'une synthèse validée,
en réutilisant l'envoi patient existant.

## Résultat observable

Depuis `/dashboard/documents`, le praticien choisit un patient puis une **synthèse
validée**, obtient la **vue de composition deux colonnes** (DocumentComposer),
un **aperçu imprimable par destinataire** (patient / médecin / praticien) et peut
**imprimer** (HTML) ou **envoyer au patient** via le canal e-mail existant.

## Périmètre

- **Route** `GET /api/praticien/documents?idSynthese=…` (miroir du scaffold booklet :
  `getServerSession`, `createRequestContext`/`withCorrelationHeader`) : compose
  **côté serveur** (le `versionPrompt`/le nom patient ne sont pas dans le payload de
  `GET /api/praticien/synthese`). Garde `STATUTS_SYNTHESE_VALIDES` (422 sinon),
  charge le patient pour `patientNom`, `blocsDepuisSynthese(...)`, renvoie
  `{ ok, patientNom, dateDocument, statut, blocs }`. **Lecture seule.**
- **Page** `web/src/app/dashboard/documents/page.tsx` (server, auto-gardée par
  `dashboard/layout.tsx`) → client `DocumentsPanel`
  (`web/src/components/patient-cockpit/DocumentsPanel.tsx`).
- **Aperçu/impression** : `renderDocumentHtml(assemblerDocument(…), destinataire,
  { patientNom, dateDocument })` dans une `iframe srcDoc sandbox` + `window.print`.
- **Envoi patient** : **réemploi** de `POST /api/praticien/booklet` (nodemailer +
  garde relecture + audit `BookletEnvoi`) — **aucun nouveau canal**.
- **Nav** : entrée « Documents » dans `SidebarRail.tsx` (groupe Instruments) et le
  menu « Plus » de `MobileBottomNav.tsx`. Code d'événement d'observabilité
  `PRATICIEN.DOCUMENT_C3.COMPOSE_FAILED` ajouté.
- **Domaine rendu isomorphe** : le versionnage (`documents/versioning.ts`) utilisait
  `canonicalSha256` (`node:crypto`), non « bundlable » côté client. Comme le domaine
  est désormais **monté** (composeur), le hash de version est remplacé par un hash
  pur `hashStable` (`documents/hash.ts`, empreinte d'intégrité/égalité non
  cryptographique). Le domaine `documents` devient client-safe.

## Hors périmètre

- Aucune migration ; aucun envoi automatisé médecin (impression HTML seulement) ;
  PDF natif différé ; fil bidirectionnel médecin (report séparé).
- Ne pas élargir le `select` de la route `synthese` existante (route dédiée).

## Interdits

- Interface 100 % en français ; aucun secret ; données patient fictives seulement.
- Aucune donnée interne praticien dans l'aperçu patient/médecin (field-filter domaine).
- Aucune migration Prisma/SQL sans confirmation distincte.

## Étapes

- [x] Route `GET /api/praticien/documents` (composition serveur, lecture seule).
- [x] Page `/dashboard/documents` + `DocumentsPanel` (sélection, deux colonnes, aperçu).
- [x] Aperçu imprimable par destinataire + impression HTML.
- [x] Envoi patient par réemploi du canal booklet.
- [x] Nav desktop + mobile.
- [x] Tests (route mockée + panel jsdom).

## Tests

- `cd web && npm run type-check` ; `bash scripts/check_no_secrets.sh`
- Vitest : route (401/400/404/422/200 + provenance), `DocumentsPanel` (montage,
  aperçu patient sans champ interne, bascule médecin).

## Critères de done

- [x] Composition accessible depuis le dashboard praticien.
- [x] Aperçu par destinataire + impression HTML ; envoi patient réemployé.
- [x] Frontière de données tenue (aucune fuite dans l'aperçu patient/médecin).
- [x] Aucune migration.

## Résultats

Livré le 2026-07-18. `type-check` vert ; vitest **8/8** (route + panel) ; documents
domaine **38/38** (régression) ; `check_no_secrets` OK ; lint sans nouvelle
remarque sur les fichiers du lot. Reste reporté : fil bidirectionnel médecin
(cadrage séparé), persistance option (b) (gate non ouvert), PDF natif.
