# Proposition de refonte UX 5.0 — « le poste de pilotage clinique »

Date : 2026-07-18 · Statut : proposition (documentaire, aucun code applicatif)
Livrables associés : `maquette-cible-ux-5-0.html` (ce dossier) · audit `campagnes/AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`
Normatif : à acter au registre — **A5-R2** (canvas mid-tone) et **A6-R1** (poste de pilotage). Voir `REGISTRE_FRONTIERES.md`.

## 1. Contexte & intention

Le prod actuel **ne reproduit pas encore le concept 5.0** et est jugé peu lisible. Ce n'est pas un problème de charte — la DA A5-R1 (indigo/menthe/solaire côté praticien, forêt/cuivre côté patient, polices par persona) est **déjà câblée** dans `globals.css`/`tailwind.config.ts`/`layout.tsx`. C'est un problème d'**architecture de l'information** et d'**achèvement**.

« Coller aux templates 4.0 puis 5.0 » se lit ainsi : les maquettes de cadrage (`propositions/2026-07-15-wellneuro-4-0/maquette-wellneuro-4-0.html`, `.../2026-07-15-wellneuro-5-0-spirale/maquette-wellneuro-5-0.html`) informent l'ossature et le vocabulaire, mais **la cible corrige leur propre travers de long-scroll**. La palette teal/or de la 4.0 est **périmée** (remplacée par A5-R1) ; la cible visuelle est la 5.0, approfondie par A5-R2.

## 2. Confrontation à l'UX réelle (mesurée)

- **Cockpit praticien** (`FichePatientPanel.tsx` + `patient-cockpit/*` via `ClinicalRuntimeSection`) : **14-16 sections pleine largeur empilées en une seule colonne**, ≈ **4-7 hauteurs d'écran** de scroll. Aucun onglet, aucune colonne. Deux tables lourdes (12 besoins, détail réponses) + un formulaire protocole à 3 actions.
- **Navigation** : rail à 5 destinations ; atteindre un panneau précis se fait **par scroll**, pas par clic ; sous-vues `besoins`/`alimentation` en **routes full-page** sans fil d'Ariane.
- **Métriques passives** : `ui/MetricCard.tsx` est un simple `div` (aucun `Link`/`onClick`). Seules les cartes `FilDuJour` sont cliquables.
- **Typographie** : base 16px mais **corps dominé par `text-sm` (14px)** ; libellés en `text-xs` (12px) ; nav en `text-[11px]` ; **titres de section en 14px non-`font-display`** ; hiérarchie plate (24px max). `ReadingComfortControl` existe mais **n'est pas monté sur `/patient`**.
- **Portail patient** (`patient/[idAssignation]/page.tsx`) : machine à 7 états ; le hub `QuestionnairesEnAttentePanel` est empilé **au-dessus de 5 écrans sur 7** ; `consent` ≈ 2,5-3 écrans ; `PlaintesForm` = 7 sliders sur une page. Dette **bleue** (`patient/layout.tsx` + gate/hub/succès inline) et **grise** (`MonEquilibre*`, `QuestionField`).
- **Fond** : praticien `#F7F8FA`, patient `#FAF8F3` — quasi-blanc, jugé trop clair.
- **Socle sain à réemployer** : Radix Dialog + patrons de pop-up (`PatientPreview`, drawer `NavBar`, `PatientConfirmDialog`), composants `ui/*` et `patient/ui/*`, `PatientJourneyProgress`, mécanismes HC-F.

## 3. Parti pris — le poste de pilotage clinique (A6-R1)

SP-RUN a rendu le cockpit *vivant côté données* ; il reste *mort côté expérience*. Un cockpit vivant **réagit à l'état du patient** et répond à **4 questions dans un seul écran, sans scroll** :

1. **Où en est ce patient ?** — position sur la Spirale (épisode, jour), bandeau trajectoire toujours visible.
2. **Qu'est-ce qui a bougé ?** — deltas depuis le dernier tour (« au tour dernier, décision X → tenue / adhésion / tolérance »). Rend tangible le mécanisme 5.0 « le décidé devient appris ». Constats sourcés et datés, **jamais un score ni une prédiction**.
3. **Quelle décision est due — et puis-je la prendre ?** — **zone focale** unique et actionnable (décision + données manquantes + protocole en séquence guidée) ; abstention honnête si aucune règle validée.
4. **Que disent les instruments ?** — 12 besoins / momentum / réponses consultables **en tiroir** (pop-up/drawer), puis refermés.

Trois gestes structurels :
- **Colonne vertébrale = le cycle clinique 3.x** (Patient → Données fiables → Compréhension → Décision 21j → Actions → Suivi → Réévaluation) : le « Repère de Boucle » promu **de décoration à structure de navigation**, phase due *allumée*, navigation **par phase jamais par scroll**.
- **Zone focale unique** ; les autres phases = pastilles d'état cliquables (fait / en attente / bloqué).
- **Instruments à tiroir** : la densité (tables, courbes) s'ouvre **au clic** (jamais au seul survol — invariant §1) et se referme.

Le patient (« le Jardin ») est l'instrument **inverse** : pas un tableau de bord, un chemin calme, **une étape à la fois**, la Spirale montrée comme **construction**, jamais un score ni un hub encombrant.

## 4. Principes détaillés

| Défaut mesuré | Principe cible |
|---|---|
| Cockpit = 4-7 écrans de scroll | Cockpit **borné à la hauteur d'écran** : bandeau trajectoire + rail des 7 phases + zone focale + instruments à tiroir |
| Navigation par scroll, sous-vues full-page | **Onglets/segments in-fiche** (fiche / besoins / alimentation / trajectoire) ; accès direct par tuile ; fil d'Ariane |
| Métriques passives | **Métriques actives** : chaque KPI d'accueil est cliquable → sa page/liste (patron : envelopper `MetricCard` dans un `Link`) |
| Hub patient omniprésent, écrans longs | **Un écran = une étape** via `PatientJourneyProgress` ; hub en accès secondaire ; `PlaintesForm` **paginé** |
| Typo 14px, hiérarchie plate | **Corps 16px** ; titres de section en `font-display` 18-20px ; hiérarchie display 28-32 / h2 22-24 / h3 18 / corps 16 / min 14 ; nav 13-14px ; **`ReadingComfortControl` monté aussi sur `/patient`** |
| Fond quasi-blanc | **Canvas mid-tone A5-R2** (§5) : cartes claires en relief sur fond ardoise/sable |

## 5. Évolution DA — A5-R2 « ardoise & sable » (mid-tone)

La structure A5/A5-R1 est **conservée** (rail nuit signature praticien, patient clair fixe, **aucun toggle**). Seul le **canvas de fond s'approfondit** — ni blanc, ni sombre — pour que les cartes claires « flottent » comme les cadrans d'une console.

| Rôle | Praticien « l'Observatoire » | Patient « le Jardin » |
|---|---|---|
| `--background` (canvas) | **ardoise froide `#D3D8E6`** (était `#F7F8FA`) | **sable `#EAE0CC`** (était `#FAF8F3`) |
| `--surface` (cartes) | blanc `#FFFFFF` (relief : ombre + bord) | crème `#FFFDF9` |
| `--rail-*` | nuit `#151C38`/`#10162B` — **inchangé** | — (pas de rail) |
| `--color-primary` | indigo `#3D4A9E` — inchangé | forêt `#1E6F54` — inchangé |
| `--color-accent` | solaire `#E8A33D` (texte `#8A5B10`, relief obligatoire) | cuivre `#B25E38` (texte `#8F4526`) |
| `--muted` / `--border` | à recalibrer légèrement sur canvas foncé | idem |
| Typographies | Sora / Instrument Sans / IBM Plex Mono | Bricolage Grotesque / Albert Sans / IBM Plex Mono |

### Matrice de contraste A5-R2 (calculée 2026-07-18, luminance WCAG 2.x)

| Paire | Ratio | Verdict |
|---|---|---|
| Praticien texte `#1B2337` / canvas ardoise `#D3D8E6` | **10,98:1** | AAA |
| Praticien texte / carte blanche `#FFFFFF` | 15,65:1 | AAA |
| Praticien muted `#535D7A` / canvas ardoise | 4,59:1 | AA |
| Patient texte `#2B2115` / canvas sable `#EAE0CC` | **12,04:1** | AAA |
| Patient texte / carte crème `#FFFDF9` | ≈ 15,5:1 | AAA |
| Patient muted `#6E5F49` / canvas sable | 4,72:1 | AA |
| Primaire / accent / statuts / rail / dataviz | inchangés (posés sur cartes & boutons) | cf. design-system §8 |

**Point de vigilance** : le canvas mid-tone **abaisse** le contraste du texte *muted* (de ~6,1:1 sur quasi-blanc à ~4,6:1 sur ardoise) — il **reste AA** pour le texte normal, mais toute réduction de taille du texte secondaire devra être re-vérifiée au lot d'implémentation. La règle de relief solaire (A5-R1) et le trio d'entité restent **inchangés**.

## 6. Garde-fous respectés (opposables)

Zéro score chiffré patient · statut jamais par la seule couleur (texte + icône) · relief solaire étiqueté · **pop-ups déclenchés au clic** (jamais au seul survol) · cibles ≥ 44 px · focus clavier visible · vocabulaire (« recommandation »/« protocole personnalisé ») · construction jamais dégradation côté patient · patients fictifs exclusifs (Sophie Nicola, Jennifer Martin, Michel Dogné) · aucun envoi automatique (chaîne Relu → Validé → Envoyé). Le poste de pilotage **ne modifie ni la logique clinique ni les seuils** : il réorganise l'affichage d'objets déjà produits par C1/C2.

## 7. Feuille de route phasée

### Vague 1 — atteignable maintenant (dette + IA, non-clinique, sans migration)
Chantiers UI purs, une PR = un périmètre, réversibles :
1. Achever la migration du portail patient : remplacer bleu/gris en dur par les tokens (`patient/layout.tsx`, `EmailGate`/hub/`SuccessScreen` inline, `MonEquilibre*`, `QuestionField`) ; poser `data-theme="patient"` ; monter `ReadingComfortControl`.
2. **Métriques actives** : envelopper `MetricCard` dans un `Link`.
3. **Typo remontée** : échelle de corps 16px + hiérarchie display + nav 13-14px.
4. **Poste de pilotage** : réorganiser `FichePatientPanel` en cockpit borné (rail de phases + zone focale + instruments à tiroir via le patron `PatientPreview`) ; onglets in-fiche pour besoins/alimentation/trajectoire ; paginer `PlaintesForm`.
5. **A5-R2** : appliquer le canvas mid-tone dans `globals.css` (lot dédié, revert-safe) + réconcilier `design-system-d1.md`.

### Vagues 2+ — rattachées à des campagnes (gated)
| Élément cible | Campagne / gate |
|---|---|
| Fil du jour raffiné (accueil) | SP-FIL (livré) → polissage |
| Fiche-trajectoire / Spirale navigable + comparateur | C2B (en vol `feat/c2b-*`) |
| Copilote pré-vol & minute d'après | **SP-COP** (à cadrer) |
| Time-travel + note de relecture | **SP-TT** (à cadrer) ; C2A |
| Réconciliation estimé ↔ mesuré, correspondance | Phase C / **HDS** ; C3 |
| Météo d'adhésion (praticien seul) | **SP-MET** (à cadrer) |
| Reprise patient « Ma spirale » | Phase B / **IDP** ; **SP-SPI** |
| Questionnaires adaptatifs (jauge précision) | QX (extension) |

## 8. Réemploi (ne pas recréer)

`web/src/components/ui/*` : `MetricCard`, `Badge` (tout statut), `ModeConsultation`, `TwoLevelReading`, `SidebarRail`, `ScoreZones`, patrons Radix `PatientPreview`/`PatientConfirmDialog`. `web/src/components/patient/ui/*` : `PatientCard`, `PatientButton`, `PatientPageHeader`, `PatientField`, `PatientInlineMessage`. `PatientJourneyProgress` (navigation séquentielle), `ReadingComfortControl`, `SaveStatusIndicator`. Ces briques suffisent à la Vague 1 ; la refonte est un travail d'**assemblage et de mise en ordre**, pas de création de composants.

## 9. La maquette cible

`maquette-cible-ux-5-0.html` (autonome, CSP-safe) démontre les deux fronts à parité : praticien = accueil « tour de contrôle » (métriques cliquables + Fil) puis **poste de pilotage borné** (bandeau trajectoire, rail des 7 phases, zone focale + deltas, un instrument ouvert en tiroir) ; patient = étape focalisée avec fil séquentiel, sable/forêt, zéro bleu, aucun score.

> **Rectification (2026-07-19, relecture d'exécution de la Vague 2)** : cette section affirmait que « les couches futures y sont badgées "à venir · campagne X" ». C'est inexact. La maquette ne porte que **deux** marqueurs `.badge-soon` — les entrées de rail `Consultation copilote · SP-COP` et `Correspondance · C3` (`maquette-cible-ux-5-0.html:228-229`) —, ils n'affichent que le code de campagne (pas la mention « à venir »), et **aucun n'existe côté patient ni dans le cockpit**. Les six autres lignes de la table « Vagues 2+ » (C2B, SP-TT, HDS, SP-MET, SP-SPI/IDP, QX) **n'ont aucune trace visuelle** dans la maquette. Conséquence de cadrage : chaque campagne de la Vague 2 produit ses propres maquettes ; la maquette 5.0 ne fournit que l'ossature d'accueil (rail, thème, typographie, patron de tiroir). Le badge `C3`, enfin, ne désigne pas la campagne C3 — terminée — mais son seul reliquat reporté, le fil de correspondance médecin.

## 10. Hors périmètre

Aucun code applicatif, `globals.css`, schéma Prisma, seuil clinique ni flag modifié dans cette proposition. A5-R2 et A6-R1 sont **actés en documentation** (registre + design-system + changelog) mais **pas appliqués au code** : l'implémentation de la Vague 1 est une suite, campagne par campagne.

> **Rectification (2026-07-21, audit de conformité 5.0, E29)** : la dernière
> phrase décrit l'état à la date de cette proposition (2026-07-18). La Vague 1
> est depuis livrée (`CHANGELOG.md`, entrées du 2026-07-19) : A5-R2 et A6-R1
> sont désormais appliqués au code, pas seulement actés en documentation.
