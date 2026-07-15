# Brainstorm challengé — Cockpit praticien 4.0

> Proposition du 2026-07-15. Complète `AUDIT_UX_ETAT_REEL.md` et la maquette
> `maquette-cockpit-praticien.html` (4 vues interactives, bascule
> clair A5 / sombre exploratoire). Rien ici n'est acté tant que la revue
> visuelle n'a pas eu lieu.

## Principe organisateur retenu

**« La prochaine décision utile »** à chaque niveau : l'accueil est une file de
décisions typées (pas un sommaire de modules), la fiche patient ouvre sur la
carte de décision (ordre verrouillé par la spec cockpit C1 : « voir d'abord ce
qu'il doit décider »), le mode consultation ne montre que ce qui sert la
consultation en cours et se termine par la prochaine décision.

## Idées des documents de brainstorm — verdict

### À garder (intégrées à la maquette)

- File de priorités → devenue **file de décisions typées** (les 6 types de la
  spec cockpit : à traiter, protocoles à valider, questionnaires transmis,
  corrections, jalons, documents), chaque ligne = patient + type + délai +
  **une seule action**.
- Fiche patient cockpit avec en-tête riche et onglets — la maquette montre
  enfin les composants C1 **alimentés** (fixture fictive complète) au lieu des
  états vides actuels.
- Mode consultation « sans distraction » — poussé bien au-delà du composant
  actuel (simple resserrement de largeur) : rail et topbar masqués, signal
  principal, vigilances, 3 actions, prochaine décision, notes internes.
- Annuaire cartes + tableau expert, création/assignation sorties en drawer —
  résout l'écran le plus chargé de l'app (`PatientsPanel.tsx`, formulaires
  inline permanents).
- Palette de commandes Ctrl/⌘K + recherche globale (arbitrage HC-F « différé »,
  aucun blocage technique) — maquettées ; chaque commande reste doublée par la
  navigation visible.
- Double niveau de lecture (mécanisme `TwoLevelReading` livré vide par HC-F) —
  instancié sur la carte de décision : lecture rapide / lecture experte
  (instruments, scores, versions de scoring, preuves).
- Timeline clinique **légère** en préfiguration (T0 → synthèse → décision →
  jalons J7/J14/J21 grisés) — l'objet complet appartient à C2.
- Distinction Enregistrer / Relu / Validé pour diffusion / Transmis rendue
  visible par une chaîne de statuts + bouton « Envoyer au patient » désactivé
  avec explication (prévention d'erreurs, NO-GO diffusion respecté).

### À écarter (avec raison)

- **Sombre intégral et Auto/Jour/Nuit** (preview.html, sources HC-F 00/01/04) :
  périmés par la décision A5. La maquette garde le clair A5 par défaut ; la
  variante sombre n'existe que comme **outil de comparaison** — si elle séduit,
  c'est une révision de A5 à acter au registre, sinon on la jette sans dette.
- **Nav « Biologie » et « Équilibre » comme modules** (preview.html) : Biologie
  est différée (HDS) — pas de module fantôme ; Équilibre est un intrant de la
  fiche (A4), intégré au flux clinique, pas une destination.
- **« Action rapide » générique** : remplacée par des actions typées
  contextuelles (le bouton dit exactement ce qui va se passer).
- **View-switch de prototype** comme modèle de navigation : la maquette navigue
  par le rail réel (6 entrées honnêtes : Accueil, Patients, À valider,
  Synthèses IA, Protocoles & documents, Paramètres).
- **Onglets Équilibre / Protocole séparés** dans la fiche : la spec C1 impose
  un flux unique « décider d'abord » — 4 onglets seulement (Vue clinique,
  Questionnaires, Documents, Historique), le protocole vit dans la vue
  clinique.

### Nouveautés proposées (au-delà des documents)

- **Bandeau « prochaine décision » dans chaque carte patient** de l'annuaire —
  l'ADN décisionnel descend jusqu'à l'annuaire.
- **Bloc « Ce qui manque pour décider sereinement »** avec action de
  qualification directe (« Assigner » le questionnaire manquant) — l'état vide
  devient actionnable.
- **Chaîne de statuts du protocole** comme objet visuel de premier rang
  (empêche par construction la confusion revue / validation / transmission
  pointée par la grille C1).
- **Fin du mode consultation = « Prochaine décision utile »** (bloc accentué)
  plutôt qu'une simple sortie.

## Note dataviz (validateur exécuté)

Le trio catégoriel des strates (Corps = teal‑500, Ancrage = violet‑600,
Esprit = gold‑500) est le mapping acté du design system. Validateur : la
séparation daltonisme passe (ΔE 22) ; la chroma est volontairement basse
(esthétique clinique) et l'or est < 3:1 sur blanc → **relief obligatoire** :
partout où le trio apparaît, l'identité est portée par une étiquette textuelle
directe + valeur chiffrée, jamais par la couleur seule. En variante sombre, les
pas sont éclaircis (`--viz-*` redéfinis), même règle d'étiquetage.

## Questions à trancher après revue de la maquette

1. **Thème** : le clair A5 tient-il la comparaison face au sombre exploratoire ?
   (Si non → révision de A5 à documenter au registre, décision produit.)
2. La **file de décisions** remplace-t-elle l'accueil actuel, ou le complète
   (métriques conservées au second plan comme dans la maquette) ?
3. **Annuaire** : cartes par défaut + tableau expert mémorisé, ou l'inverse ?
4. La **palette ⌘K** vaut-elle un petit lot dédié dès maintenant ?
5. Le **mode consultation riche** entre-t-il dans le périmètre du branchement
   C2A ou fait-il l'objet d'un lot UI séparé ?

## Raccordement aux campagnes

| Sujet | Voie |
|---|---|
| Branchement runtime du cockpit (fin des props `null`) | **C2A** (persistance + gate migration inchangé — la maquette ne s'y substitue pas) |
| Fixture Sophie Nicola de la maquette | Réutilisable telle quelle pour la **grille ergonomique C1** (< 2 min / < 10 min), question ouverte de la clôture C1 |
| Palette ⌘K + recherche globale | Candidat petit lot dédié si validé visuellement |
| Restylage annuaire (cartes + drawers) | Débloqué si le gate E0 est confirmé levé (pagination déjà livrée — cf. audit §5) |
| Timeline clinique complète, comparateur | **C2B** |
| Composition de documents (onglet Documents) | **C3** |
| Variante sombre | Décision produit : révision A5 au registre, ou abandon sans dette |
