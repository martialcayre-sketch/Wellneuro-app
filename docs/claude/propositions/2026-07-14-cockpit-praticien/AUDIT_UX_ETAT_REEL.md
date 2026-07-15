# Audit UX — état réel du front praticien vs documents de brainstorm

> Proposition cadrée le 2026-07-14, rédigée le 2026-07-15. Lecture seule, aucun
> code applicatif modifié. Documents audités : `UX_WELLNEURO_3_0.md`
> (campagne shell 3.0), synthèse « Refonte UX Hybrid Clinical » (sources HC-F),
> prototype `preview.html` fourni en séance. Références croisées :
> `docs/claude/REGISTRE_FRONTIERES.md`, `docs/design-system-d1.md`, documents de
> gouvernance HC-F, spec cockpit C1, code de `web/src`.

## 1. Livré et fonctionnel

| Élément UX | État | Fichier(s) |
|---|---|---|
| Rail latéral sombre repliable (desktop) | ✅ | `web/src/components/NavBar.tsx` L82-103, `ui/SidebarRail.tsx` |
| Espace de travail clair (décision A5) | ✅ | `web/src/app/globals.css` L104-134 |
| Tokens sémantiques + namespace `--rail-*` | ✅ | `globals.css`, `tailwind.config.ts` |
| Navigation mobile basse + tiroir tablette (Radix Dialog) | ✅ | `ui/MobileBottomNav.tsx`, `NavBar.tsx` L108-133 |
| Icônes Lucide | ✅ | `lucide-react@1.24.0`, 9 fichiers |
| Moteur équilibre branché (score, momentum, objets cliniques) | ✅ via API | `lib/equilibre/*` → `api/praticien/{equilibre,besoins}` |
| Badges de preuve A/B/C/D | ✅ | `ui/EvidenceBadge.tsx` (fiche + `DetailBesoinsPanel`) |
| Prévisualisation patient (« Voir ce que recevra le patient ») | ✅ | `PatientPreview.tsx` |
| Mode consultation | ✅ minimal (resserre la largeur + bandeau) | `ui/ModeConsultation.tsx` |
| Pagination annuaire | ✅ | `PatientsPanel.tsx` L691-695 (`PAGE_SIZE=10`, `ui/Pagination.tsx`) |
| Double niveau de lecture (mécanisme HC-F) | ✅ livré vide (A2) | `ui/TwoLevelReading.tsx` |

## 2. Codé mais débranché — le cœur du sujet

Les 4 composants du cockpit décisionnel C1 sont montés avec des **props `null`**
(`FichePatientPanel.tsx` L234-237) et ne rendent que leurs états vides :
`patient-cockpit/MissingDataPanel.tsx`, `DecisionSummaryCard.tsx`,
`ProtocolMiniBuilder.tsx`, `ProtocolConsultationPanel.tsx`.
Le moteur `lib/clinical-engine/` (17 fichiers, testés) n'est **jamais exécuté au
runtime** par l'UI — uniquement des `import type`. C'est le verdict de clôture
C1 : GO technique, NO-GO runtime/activation/diffusion.

## 3. Absent

- File de priorités réellement décisionnelle — l'accueil actuel = 4 métriques
  (`MetricsSection.tsx`) + liste filtrée par statut (`PatientsATraiter.tsx`,
  aucun classement clinique).
- Recherche globale ; palette de commandes (`cmdk` absent — arbitrage HC-F
  LOT-00 « différé », aucun blocage technique).
- Onglets de fiche patient (défilement unique) ; en-tête patient riche.
- Timeline clinique ; comparateur avant/après (intrants C2).
- Annuaire en cartes — `PatientsPanel.tsx` (740 lignes) : tableau + formulaires
  inline affichés en permanence (création patient, consultation, assignation,
  `PacksPanel`).
- Motion (absent de `package.json` ; autorisé par A5 pour transitions
  explicatives uniquement).

## 4. Périmé dans les documents audités

La décision **A5** (registre, 2026-07-12) fait foi : « **Tout en mode clair.**
Abandon du double mode Jour/Nuit et du contrôleur Auto/Jour/Nuit. Praticien :
rail sombre structurel (élément signature) + espace de travail clair. »

| Document | Élément périmé |
|---|---|
| `preview.html` (fourni en séance) | Sombre intégral praticien ; nav « Biologie » (module différé HDS) et « Équilibre » comme module séparé (A4 : intrant C1, pas de module) |
| Synthèse « Refonte UX Hybrid Clinical » §2 | Modes `Auto / Jour / Nuit` praticien |
| `UX_WELLNEURO_3_0.md` | Marqué « ne pas rouvrir » (`refonte-ux-shell-3-0/CAMPAGNE.md`, registre §3 C0-UX) — direction visuelle remplacée par HC-F ; Template A « clinique premium sombre » caduc |
| HC-F `sources/00`, `01` (§4 entier), `04` (§3, §14, §16) | Mentions Jour/Nuit résiduelles |

## 5. Incohérences documentaires à corriger (hors périmètre de cette proposition, à signaler)

1. **`BRIEF_COMPILED.md` de C1** (l.127) dit encore « thème praticien sombre »
   alors que la spec source `06_SPEC_UX_COCKPIT_PRATICIEN.md` a été corrigée en
   « thème praticien clair » — brief compilé non régénéré.
2. **Gate E0** : `PROGRAMME_WELLNEURO_3_0.md` présente
   `feat/e0-patients-pagination` comme un gate ouvert bloquant le restylage de
   l'annuaire, mais la pagination serveur est livrée dans `PatientsPanel.tsx`.
   À confirmer puis lever le gate au programme.

## 6. Dettes UX ouvertes (reprises de `DETTE_UX_RESIDUELLE.md`, non bloquantes)

- Brouillon wizard patient non chiffré en stockage local (TTL 30 j en mitigation).
- `readWizardDraft` ne valide pas la forme du JSON parsé.
- Persistance serveur du brouillon patient absente (l'état « Synchronisé »
  n'existe pas — intrant C2).
- `GET /api/patient/reponses` accepte encore un `email` en query string (legacy).
- Auto-fetch patient-only de `MonEquilibreAccueil`/`Detail` (à traiter avant
  toute prévisualisation praticien de ces écrans).
- Focus trap incomplet dans la sheet mobile « Plus ».
- Palette de commandes différée ; WebKit/iPhone réel, zoom 200 %, lecteur
  d'écran humain non revalidés depuis LOT-05.

## 7. Cibles ergonomiques C1 (contraignantes pour tout design)

`GRILLE_VALIDATION_ERGONOMIQUE_C1.md` — non exécutée à ce jour :

- **Épreuve 1** : comprendre la décision (manques, priorité sélectionnée,
  3 actions, statut relu/validé/transmis) en **moins de 2 minutes**.
- **Épreuve 2** : préparer un protocole brouillon complet en **moins de
  10 minutes**, sans confusion revue / validation / transmission.
- Prérequis : fixture C1 fictive complète (manques documentés, priorité
  sélectionnée, 3 actions) — **la fixture de la maquette jointe est conçue pour
  resservir telle quelle à cette grille.**
