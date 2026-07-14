---
id: "LOT-00-arbitrage"
titre: "Arbitrage des questions ouvertes — shell praticien 3.0"
statut: "fait"
annexe_de: "LOT-00-cadrage-arbitrage-questions-ouvertes.md"
---

# LOT-00 — Arbitrage des questions ouvertes

Ce document tranche les questions ouvertes de `CAMPAGNE.md` et de
`LOT-00-cadrage-arbitrage-questions-ouvertes.md`, et fournit le wireframe texte validé du shell praticien
(rail gauche desktop/tablette, navigation basse mobile). Aucun code n'est modifié par ce lot.

## 1. Correspondance route réelle ↔ entrée de navigation

Audit de `web/src/app/dashboard/` (7 fichiers, 4 routes de page) :

| Route | Fichier | Fonction |
|---|---|---|
| `/dashboard` | `web/src/app/dashboard/page.tsx` | Accueil praticien (suivi opérationnel, accès rapides, patients à traiter) |
| `/dashboard/patients` | `web/src/app/dashboard/patients/page.tsx` | Annuaire patients & assignations (+ `[idPatient]`, `[idPatient]/besoins`) |
| `/dashboard/synthese` | `web/src/app/dashboard/synthese/page.tsx` | Synthèse IA & Booklet |
| `/dashboard/parametres` | `web/src/app/dashboard/parametres/page.tsx` | Paramètres (profil, gouvernance clinique) |

Le document source `sources/UX_WELLNEURO_3_0.md` (§4.1) propose 7 entrées de rail : Accueil, Patients,
**Équilibre**, **Packs**, Synthèses IA, **Biologie**, Paramètres. Les trois entrées en gras n'ont **aucune
route existante** (ni `web/src/app/dashboard/equilibre|packs|biologie/page.tsx`, ni équivalent — un
composant `PacksPanel.tsx` existe mais n'est monté dans aucune route dashboard).

**Décision** : le rail de cette campagne se limite aux **4 routes réelles**. Créer les 3 routes manquantes
sortirait du périmètre de C0-UX (« sans changer les routes », hors-périmètre explicite : dashboard léger,
fiche patient, portail patient = campagnes C1/C3/C4/C5). Cet écart entre la vision WN3.0 du document source
et le périmètre réel de C0-UX est documenté ici pour une réévaluation future, si une campagne ultérieure
ajoute ces routes.

| Icône (texte) | Libellé rail | Route |
|---|---|---|
| ⌂ | Accueil | `/dashboard` |
| 👥 | Patients | `/dashboard/patients` |
| ✨ | Synthèse IA | `/dashboard/synthese` |
| ⚙ | Paramètres | `/dashboard/parametres` |

## 2. Questions ouvertes — décisions

### 2.1 Rail gauche : toujours compact ou état mémorisé ?

**Décision** : état mémorisé (compact/étendu) via `localStorage`, préférence côté client uniquement.
**Justification** : pas de nouvelle table Prisma, pas de migration — cohérent avec « changements minimaux »
et l'interdiction de migration sans confirmation explicite. Comportement par défaut si aucune préférence
stockée : compact (reprend la recommandation §4.1 du document source, « largeur compacte par défaut »).

### 2.2 Recherche globale : patients seulement, ou aussi questionnaires/packs/documents ?

**Décision** : patients uniquement pour cette V1.
**Justification** : aucune infrastructure de recherche sur questionnaires/packs/documents n'existe
aujourd'hui ; l'ajouter impliquerait une nouvelle logique métier/API, hors périmètre (« sans changer... la
logique métier »). Extension possible dans une campagne future si le besoin est confirmé.

### 2.3 Dashboard personnalisable par le praticien (V1) ou figé ?

**Décision** : figé pour cette campagne. La structure actuelle de `/dashboard` (Suivi opérationnel / Accès
rapides / Patients à traiter) est conservée telle quelle.
**Justification** : aucune personnalisation n'est détaillée dans le document source ; en ajouter une
nécessiterait un mécanisme de préférence (a minima `localStorage`, potentiellement un schéma Prisma pour la
persistance multi-appareil), ce qui élargirait sensiblement LOT-02 sans demande explicite. Piste future,
hors périmètre C0-UX.

### 2.4 Conserver le tableau patients comme mode expert ?

**Décision** : inchangé. `PatientsPanel.tsx` n'est pas modifié par ce lot — déjà noté dans `CAMPAGNE.md`
comme « tranché fonctionnellement par C3/annuaire ». Le shell fournit uniquement le point d'entrée
`Patients` existant vers cette page.

### 2.5 Quelles sont les 4 entrées prioritaires de la navigation mobile praticien ?

**Décision** : **Accueil / Patients / Synthèses / Plus**, conforme à la proposition §4.3 du document
source. Le menu **Plus** (bottom sheet) ne contient que **Paramètres** — et non
Packs/Équilibre/Biologie/Paramètres comme proposé dans le document source — puisque seules 4 routes
existent au total et que les 3 premières entrées de la barre basse couvrent déjà Accueil/Patients/Synthèse.

### 2.6 Liste des icônes/libellés du rail gauche — correspondance aux routes réelles

Traité en section 1 ci-dessus : rail réduit aux 4 entrées réelles, Équilibre/Packs/Biologie exclues faute
de route.

### 2.7 Portée « les deux thèmes » du wireframe

**Décision** : le wireframe ci-dessous couvre uniquement le thème **praticien (sombre)**,
`[data-theme="praticien"]` — seul thème dans lequel le shell existe (`web/src/app/dashboard/layout.tsx`).
Le thème patient (clair) est réservé au portail patient, hors périmètre de cette campagne.
**Justification** : la mention « les deux thèmes » dans `CAMPAGNE.md`/`LOT-00-cadrage-...md` est une
imprécision héritée de la structure du document source (qui couvre aussi le Template B « patient zen
clair », hors périmètre ici) ; elle n'est pas traitée comme une exigence de double rendu du shell praticien.

## 3. Wireframe texte — thème praticien (sombre)

### 3.1 Desktop (rail étendu, ex. après clic praticien — état mémorisé)

```text
┌────────────────────────────────────────────────────────────────────┐
│ ⌕ Rechercher un patient…              🔔 Notifications   Profil ▾  │
├──────────────┬─────────────────────────────────────────────────────┤
│ WN            │                                                    │
│ ⌂ Accueil     │  Zone de travail                                   │
│ 👥 Patients   │  (contenu de la route active)                      │
│ ✨ Synthèse IA│                                                    │
│ ⚙ Paramètres  │                                                    │
│               │                                                    │
│ [collapse ‹]  │                                                    │
└──────────────┴─────────────────────────────────────────────────────┘
```

### 3.2 Desktop (rail compact, état par défaut)

```text
┌────────────────────────────────────────────────────────────────────┐
│ ⌕ Rechercher un patient…              🔔 Notifications   Profil ▾  │
├──────┬─────────────────────────────────────────────────────────────┤
│  WN  │                                                             │
│  ⌂   │  Zone de travail                                            │
│  👥  │                                                             │
│  ✨  │                                                             │
│  ⚙   │                                                             │
│  ›   │                                                             │
└──────┴─────────────────────────────────────────────────────────────┘
```

### 3.3 Tablette — paysage (rail compact conservé)

```text
┌───────────────────────────────────────────────────┐
│ ⌕ Rechercher…                    🔔    Profil ▾    │
├──────┬──────────────────────────────────────────────┤
│  WN  │  Zone de travail (une colonne, marges        │
│  ⌂   │  réduites)                                    │
│  👥  │                                                │
│  ✨  │                                                │
│  ⚙   │                                                │
└──────┴──────────────────────────────────────────────┘
```

### 3.4 Tablette — portrait (rail rétractable, accès par bouton menu)

```text
┌───────────────────────────────────────────────────┐
│ ☰  WN            ⌕ Rechercher…        🔔  Profil ▾ │
├───────────────────────────────────────────────────┤
│                                                     │
│  Zone de travail (une seule colonne, cartes         │
│  empilées)                                          │
│                                                     │
└───────────────────────────────────────────────────┘
```
Le bouton ☰ ouvre le rail en panneau superposé (mêmes 4 entrées que 3.1), fermeture explicite (pas de
survol requis).

### 3.5 Mobile (navigation basse)

```text
┌──────────────────────────────┐
│ Titre · ⌕ Rechercher · Profil│
├──────────────────────────────┤
│                              │
│ Contenu                      │
│ Cartes et actions            │
│                              │
├──────────────────────────────┤
│  ⌂       👥      ✨      •••  │
│ Accueil Patients Synthèses Plus│
└──────────────────────────────┘
```

Le bouton **Plus** ouvre une bottom sheet contenant une seule entrée : **Paramètres**.

```text
┌──────────────────────────────┐
│  ───                          │
│  ⚙  Paramètres                │
│                              │
└──────────────────────────────┘
```

## 4. Note de clôture

Ce document répond à chaque question ouverte listée dans `CAMPAGNE.md` (section « Questions ouvertes ») et
dans `LOT-00-cadrage-arbitrage-questions-ouvertes.md` (section « Périmètre »), et fournit le wireframe des
3 largeurs dans le thème praticien (seul thème concerné, cf. §2.7).

**Validé par l'utilisateur le 2026-07-11**, conformément au critère de done du lot (« faire valider le
wireframe avant de passer à LOT-01 »). `lot_courant` mis à jour vers `LOT-01` dans `CAMPAGNE.md`, case
« Résultat observable » correspondante cochée.
