---
id: "LOT-12"
titre: "Habillage visuel de l’agenda — la forme d’une maquette, sans son instrument"
statut: "à_faire (arbitré le 2026-10-12 ; ouverture après la lecture du LOT-02 du 2026-10-29)"
dépend_de: "LOT-02"
---

# LOT-12 — Habillage visuel de l’agenda

## Constat

Le responsable a soumis le 2026-10-12 une maquette « Agenda de sommeil —
Wellneuro 5.0 — Nouveau design » (image hors dépôt) : saisie en sept écrans
illustrés, sans heure ; score quotidien sur 100 pondéré ; tableau de la semaine
côté patient (score, « Bravo », conseil, tendances) ; tableau praticien avec
répartition en cinq bandes, corrélations chiffrées et « Insights IA ».
Confrontation élément par élément au dépôt — trente éléments, chacun relu par
un vérificateur adverse. Elle mêle trois choses :

- **la forme**, libre : illustrations, pictogrammes, écrans plus courts, frise
  regroupée par semaine ;
- **l’instrument**, que la maquette change sans le dire : plus d’heures, des
  réveils en classes de nombre, une « facilité » d’endormissement au lieu d’une
  durée ;
- **des chiffres sans provenance** : pondérations, bandes, corrélations.

Éléments écartés :

| Élément de la maquette | Motif |
|---|---|
| Saisie sans heures de coucher ni de lever | Obligatoires ([[D-271]] §3) ; sans elles tombent trois des quatre axes de l’indice et le critère d’efficacité de [[D-280]]. |
| Réveils en classes (1-2, 3-5, > 5) | Réintroduit le plafond retiré par [[D-091]] ; perd la durée cumulée d’éveil, seule grandeur obligatoire. |
| Score par nuit sur 100, pondéré 40/20/20/10/10 | Poids sans provenance (`DC-19`, `DC-21`) ; l’indice se lit sur l’agenda, jamais sur une nuit (`DC-49`) ; facteurs dans le score déjà écartés : une exposition n’est pas un résultat. |
| Cinq bandes de 0 à 100 et répartition en anneau | Contredisent les trois paliers validés (`web/src/lib/questionnaires/sommeil.ts:266`). |
| Score « 72/100 » montré au patient | « Zéro score chiffré patient » (`docs/claude/REGISTRE_FRONTIERES.md:920`). |
| « Bravo ! », « Chaque petit pas compte », étoile, tendances ↗ ↓ | Récompenser ou comparer à soi-même hier est proscrit (`REGISTRE_FRONTIERES.md:285`) ; « bravo » fait échouer `web/src/lib/gamification-patient.guard.test.ts`. |
| Dégradé rouge → vert côté patient | « Jamais du rouge » (`FriseNuits.tsx:11`) ; pas de couleur de valence (`AgendaSommeilJournal.tsx:295`) ; une valeur portée par la seule couleur manque WCAG 1.4.1. |
| Conseil personnalisé automatique | Pas d’envoi automatique, validation praticien obligatoire (`REGISTRE_FRONTIERES.md`) ; aucun conseil sourcé (`DC-01`). |
| Corrélations R avec PSS, MFI, DASS, DNST | Aucun calcul n’existe ; sur quatre points, R = −0,71 donne p ≈ 0,29 ; la règle qui croisait l’axe mélatonine du DNST avec le sommeil a été retirée de la V1 ([[D-042]]). |
| « Insights IA » causaux | Association n’est pas cause (`DC-27`) ; la synthèse IA relue par le praticien en tient lieu, son lot reste à trancher ([[D-280]] §5). |

## Arbitrages du responsable (2026-10-12)

Quatre questions fermées, posées en session :

1. **Rituel du soir** : plus tard, et seulement si le protocole du patient le
   recommande. Hors de l’agenda ; inscrit à `docs/ROADMAP_PRODUIT.md` §5.
2. **Endormissement** : la latence reste une durée estimée en classes, avec
   « Je ne sais pas » ([[D-271]]) ; des pictogrammes s’y posent, libellés
   gardés.
3. **Score** : un indice par agenda clôturé. Pas d’indice hebdomadaire ; rien
   côté patient.
4. **Facteurs** : libellés et période actuels — « Café après 14 h », « Écrans
   au lit », « La veille au soir ». Des icônes seulement.

Aucun `D-xxx`, aucun contrat `agenda-sommeil-v5`, aucune migration.

## Ce qui changera

Côté patient :

- illustrations et pictogrammes sur les choix existants (latence, durée
  d’éveil, qualité, forme), chaque libellé écrit gardé ;
- couleurs neutres ;
- facteurs en icônes ;
- forme au réveil sortie de « Ajouter des détails », toujours facultative ;
- écrans plus courts, si chaque champ obligatoire du contrat v4 garde sa
  place, heures comprises (listes au quart d’heure inchangées) ;
- écran de fin illustré, texte lié à l’acte de noter (« N nuits notées sur
  21 »), sans étoile ni « petit pas » ;
- frise regroupée par semaine, sans courbe, moyenne, tendance ni couleur de
  valence.

Côté praticien, dans le tiroir de l’agenda :

- fréquence de chaque facteur, en « n nuits sur N » où N compte les nuits où
  le bloc a été répondu, jamais présentée comme une cause ; pas d’« activité
  physique faible », l’absence n’étant pas mesurée ;
- répartition de la qualité déclarée (1 à 5), avec n ;
- indices des agendas successifs côte à côte, avec n.

*À confirmer au cadrage* : ces deux décomptes se calculent à l’affichage,
sans seuil, hors des agrégats `AGD_*` et hors de l’indice. S’ils devaient
entrer au catalogue, ils changeraient de nature et demanderaient une décision.

## Ce qui ne change pas

Le contrat `agenda-sommeil-v4` et ses champs obligatoires, les classes, la
fenêtre de 21 nuits, l’indice, ses axes et ses paliers, les ancres écrites des
échelles, la frontière de la gamification, et « zéro score chiffré patient ».

## Conditions d’ouverture

- **Après la lecture du 2026-10-29** (LOT-02) : deux changements dans la même
  fenêtre de mesure ne se départageraient plus. La référence : 27,0 % de
  nuits notées, une nuit médiane par agenda, causes non établies
  (`LOT-02-remesure.md`).
- Chaque pictogramme garde son texte visible, et le nom accessible commence
  par ce texte (`SaisieNuitForm.test.tsx:258`, WCAG 2.5.3) : le LOT-01 a
  corrigé l’emoji sans libellé, on n’y revient pas.

## Validation prévue

- T2 (lot UI) ; E2E de la saisie, WebKit compris.
- Banc de la gamification et tests d’accessibilité de la saisie verts.
- Recette sur téléphone du responsable avant annonce aux patients.
