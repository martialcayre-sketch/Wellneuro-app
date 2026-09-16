---
id: "LOT-02"
titre: "Restituer, et refuser le silence"
statut: "terminé"
dépend_de: "—"
---

# LOT-02 — Restituer, et refuser le silence (étage 0)

## But

Le praticien qui ouvre le constructeur saisit **trois plans en aveugle** : le
formulaire reçoit `decisionCard` et n'en lit que deux booléens (« y a-t-il une
priorité ? », « la décision est-elle bloquée ? »). Ni le libellé de l'axe retenu, ni
son statut, ni ses limitations n'apparaissent — ils vivent dans `DecisionSummaryCard`,
monté sous la phase **Décision**, c'est-à-dire l'écran précédent.

Et trois champs se posent en silence : le **type** d'une action (`'food'` en dur), la
**charge** (`'light'` en dur), et le refus lui-même, qui s'efface à la première frappe.

Aucune décision n'est requise. C'est l'« étage minimal » que `D-160` décrit comme
« ce qui rend la chose utile au premier jour ».

## Résultat observable

1. La priorité retenue, son statut et ses limitations sont lisibles **à côté** des
   champs à remplir.
2. Une action enregistrée sans que le sélecteur ait été touché est **refusée**, et le
   message dit pourquoi. Aujourd'hui elle part `type: 'food'`, est hachée, persistée,
   et servie au patient comme « **Alimentation** » — y compris sur une orientation
   médecin ou une exploration biologique.
3. La charge doit être posée, comme le type.
4. Le refus se voit : `role="alert"`, couleur d'erreur, champ fautif marqué, et le
   message **ne disparaît plus à la première frappe**.
5. Un E2E traverse enfin le parcours nominal à l'écran.

## Périmètre

- **`ClinicalRuntimeSection.tsx`** — monter `DecisionSummaryCard` dans
  `#protocol-version-builder`. Le composant est **pur** (une prop, zéro état, zéro
  fetch) et `decisionCard` lui est déjà passé : rien à dupliquer.
  **Deux collisions à traiter** : l'`id="decision-summary-title"` (dupliqué dans le
  DOM) et le titre « Priorité et limites », que `e2e/mode-consultation.spec.ts:28`
  interroge en mode strict Playwright. Le dépôt a tranché ce cas **deux fois** en
  faisant varier le libellé (`FichePatientPanel.tsx:2187-2189`, `:2230-2232`) — même
  geste ici, et `useId()` pour l'identifiant.
  Ne pas déplacer `SelectionPrioritePanel` au passage : lui **porte** de l'état local.
- **`ProtocolMiniBuilder.tsx`** — `emptyAction` ne pose plus de type ;
  `collectSubmission` refuse une action sans type et une charge non posée (`DC-24` :
  l'absence n'est pas une valeur) ; le patron de message adopte celui du voisin
  (`SelectionPrioritePanel.tsx:204-208`) ; `markDirty` cesse de vider le message.
- **`web/e2e/`** — un spec neuf : sélection de priorité → saisie → « Enregistrer la
  version ». Il n'en existe aucun : aucun spec ne contient « Ajouter une action » ni
  « Enregistrer la version ».

## Hors périmètre

- **Le marquage « votre patient lira ceci »** : il appartient au LOT-03. Posé ici il
  mentirait, le portail ne servant encore qu'une action sur trois.
- L'hydratation du constructeur depuis la version active (`contenuActif` est lu par
  le client et jamais passé au formulaire) — dette nommée, hors campagne.
- Ne pas toucher à `biologie-arbitrage-revision.spec.ts`, qui poste à l'API **par
  choix documenté** : « piloter ce constructeur à l'écran ferait de ce parcours un
  banc du constructeur, pas de l'arbitrage ».

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- Pas de refactor du constructeur au passage.
- Aucun seuil inventé.

## Étapes

- [ ] Monter la carte, traiter les deux collisions.
- [ ] Refuser le type et la charge non posés.
- [ ] Reprendre le patron de message d'erreur.
- [ ] Écrire l'E2E du parcours nominal.
- [ ] Fragment `changelog.d/`.

## Tests

T1 après chaque édition, T2 avant commit. **Baselines visuelles** : le rail et la
phase Actions figurent sur la preuve `fiche-cockpit` ; la référence bouge et ne se
compare **que sous Linux** — régénérer en CI, jamais conclure depuis le Mac.
Surveiller les trois specs biologie, qui passent par `confirmerEpisodeT0` et sa
synchronisation sur « Actions à traiter ».

## Critères de done

La carte est lisible dans le conteneur du constructeur sans casser le mode strict ;
aucun champ ne se pose plus en silence ; l'E2E nominal est vert ; baselines
régénérées en CI.

## Mesure qui suit

Une fois en ligne : le dossier qui a retenu sa priorité le 2026-09-12 pose-t-il son
protocole ? La réponse ne conditionne pas les lots suivants — elle alimente le bilan.

## Résultats

Clos le **2026-09-15**. Aucune décision — l'« étage minimal » que [[D-160]] décrit
comme « ce qui rend la chose utile au premier jour ».

**Ce qui est livré :**

- **La décision est restituée** à côté du formulaire : `DecisionSummaryCard` se monte
  une seconde fois dans `#protocol-version-builder`, sous le titre « Ce que la
  décision a retenu ». Le composant gagne une prop `titre` et un `useId()` — son
  titre et son `id` étaient codés en dur **à deux endroits**, et deux nœuds de même
  nom accessible cassent le mode strict des E2E.
- **Plus de type d'action posé en silence.** `emptyAction` ne pose plus `'food'` ; le
  sélecteur s'ouvre sur « Choisir un type… » et `collectSubmission` refuse en
  **nommant l'action** fautive. Même traitement pour la charge (« Choisir la
  charge… », et la ligne de rappel dit « non déclarée » au lieu d'affirmer
  « Léger »).
- **Le refus se voit et survit à la frappe.** Il vivait dans `message`, que
  `markDirty` vide : le motif disparaissait au premier caractère tapé, avant toute
  correction. Deux états distincts désormais — `message` pour l'information,
  `erreur` pour le refus —, `role="alert"`, couleur de danger, et `aria-invalid` sur
  les champs fautifs.
- **L'E2E du parcours nominal** (`e2e/protocole-constructeur.spec.ts`) : confirmation
  T0 → sélection de priorité **à l'écran** → refus d'un type manquant → type posé →
  « Version enregistrée sur le serveur ». Il n'existait aucun spec contenant
  « Ajouter une action » ni « Enregistrer la version ».

**Trois décisions de conception prises en chemin, et leur motif :**

1. La carte se monte sur `phase === 'actions'`, **et non `affiche('actions')`** : en
   mode « tout », le cockpit défile d'un bloc et la carte de la phase Décision est
   déjà à l'écran — la répéter n'ajoute rien et dédouble ses textes.
2. Elle est montée **conditionnellement**, là où le conteneur du constructeur est
   seulement *masqué* : le constructeur porte un brouillon local qu'un démontage
   perdrait ; la carte est pure.
3. L'option d'absence du sélecteur n'est **pas désactivée** — elle doit se lire et
   rester atteignable. C'est le refus à l'enregistrement qui garde, pas la
   désactivation d'une option. Patron de [[D-186]].

**Un piège d'E2E rencontré** : Next.js pose son propre `role="alert"`
(`__next-route-announcer__`). Un `getByRole('alert')` de page entière viole le mode
strict ; le sélecteur se borne au conteneur du constructeur.

**Ce qui n'est pas fait** : le marquage « votre patient lira ceci » appartient au
LOT-03 — posé ici, il mentirait, le portail ne servant encore qu'une action sur trois.
