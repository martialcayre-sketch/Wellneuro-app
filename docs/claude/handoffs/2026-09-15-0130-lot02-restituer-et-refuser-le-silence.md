# Handoff — 2026-09-15 — LOT-02 : restituer la décision, et refuser le silence

Troisième lot de la campagne « 5. Actions — le protocole assisté », et le premier qui
touche l'écran. Aucune décision requise.

## Branche et état Git

- Branche `lot02-restituer-et-refuser-le-silence`, partie d'`origin/main` à `c5903dc3`.
- Sur `main` cette nuit : #1103 (clôture `D-179`), #1104 (ouverture de campagne),
  #1106 (`D-188`, LOT-01), #1108 (`D-189`, LOT-00).

## Ce qui est livré

**La décision revient sous les yeux du praticien.** `DecisionSummaryCard` se monte une
seconde fois dans `#protocol-version-builder`, sous le titre « Ce que la décision a
retenu ». Le composant reçoit une prop `titre` et un `useId()` : son titre et son `id`
étaient codés en dur **à deux endroits**, et `e2e/mode-consultation.spec.ts` interroge
« Priorité et limites » en mode strict.

**Plus rien ne se pose en silence.** `emptyAction` ne pose plus `type: 'food'` ; la
charge ne vaut plus `'light'` par défaut. Les deux sélecteurs s'ouvrent sur une option
d'absence — **non désactivée** : c'est le refus à l'enregistrement qui garde, pas la
désactivation d'une option (patron `D-186`). Le refus **nomme l'action** qui attend son
type.

**Le refus se voit et survit à la frappe.** Il vivait dans `message`, que `markDirty`
vide : le motif disparaissait au premier caractère tapé. Deux états distincts
désormais, `role="alert"`, couleur de danger, `aria-invalid` sur les champs fautifs.

**Le parcours nominal a son banc** : `web/e2e/protocole-constructeur.spec.ts`.

## Trois décisions de conception, et leur motif

1. La carte se monte sur **`phase === 'actions'`**, et non `affiche('actions')` : en
   mode « tout » le cockpit défile d'un bloc, la carte de la phase Décision est déjà à
   l'écran, et la répéter dédouble ses textes. Deux tests de
   `ClinicalRuntimeSection.test.tsx` l'ont établi en tombant sur « Found multiple
   elements ».
2. Elle est **montée conditionnellement**, là où le conteneur du constructeur est
   seulement masqué : le constructeur porte un brouillon local qu'un démontage
   perdrait ; la carte est pure (une prop, aucun état, aucun fetch).
3. L'option d'absence reste **atteignable** — le praticien doit pouvoir revenir en
   arrière.

## Deux pièges rencontrés

1. **Lancer Playwright directement ne provisionne aucune base.** `npx playwright test`
   échoue en erreur Prisma dans le nettoyage, ce qui ressemble à un bug du spec :
   c'est `npm run test:worktree` qui monte le PostgreSQL éphémère.
2. **Next.js pose son propre `role="alert"`** (`__next-route-announcer__`). Un
   `getByRole('alert')` de page entière viole le mode strict en résolvant deux nœuds ;
   le sélecteur se borne à `#protocol-version-builder`.

## Bancs

- `ProtocolMiniBuilder.test.tsx` : l'aide `fillFirstAction` pose désormais le type,
  une aide `choisirCharge` est ajoutée, et **cinq bancs neufs** couvrent ce que le
  silence laissait passer — refus nommant l'action, sélecteur ouvert sans valeur,
  refus de charge non déclarée, refus qui survit à la frappe, et transmission du type
  choisi.
- Les refus se lisent désormais en `role="alert"` : les assertions `role="status"` qui
  visaient un refus ont suivi.

## Validations exécutées

- T1 vert.
- T2 : voir le fil de la PR. **Réserve connue** : `portail-dossier-deux-voix` tombe sur
  iPhone 13 (WebKit) par `page.goto` expiré — signature `D-049`, macOS seulement,
  jamais observée en CI.

## Ce qui reste ouvert

- **Le marquage « votre patient lira ceci »** appartient au LOT-03 : posé ici, il
  mentirait, le portail ne servant encore qu'une action sur trois.
- **Le LOT-03 attend l'arbitrage** de `D-189` sur la forme de la vue patient — le
  contrat `PatientProtocolView` exige une `DecisionCard` qu'aucune table ne persiste.
- L'hydratation du constructeur depuis la version active reste une dette nommée.

## Prochaine action exacte

**LOT-04 — citer.** Il dépend de `D-189` (rendue) et du LOT-02 (ce lot). Le LOT-05
(suspendre) est ouvert aussi ; le LOT-03 ne l'est pas.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture par
`scalingo run -d`, écriture par migration relue puis `release-db` approuvée ; pas de
`schema.prisma` ni de clinique/scoring sans demande explicite.
