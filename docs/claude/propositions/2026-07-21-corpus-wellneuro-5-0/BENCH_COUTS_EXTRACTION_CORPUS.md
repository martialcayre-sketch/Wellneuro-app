# Corpus WellNeuro 5.0 — comparatif des coûts d'extraction vision

Version : 1.0 — 2026-07-21
Statut : note de cadrage Phase 2 (coûts). Le banc de **qualité** (concordance,
artéfacts) se joue ensuite sur les 3 PDF échantillons, avec les clés API.

## 1. Ce que l'échantillon réel nous apprend

Trois PDF téléchargés depuis le Drive et analysés :

| PDF | Pages | Couche texte | Valeurs dosées détectées |
|---|---|---|---|
| 21 Les acides gras et les lipides | 30 | 16 318 car. | **100** |
| 7 La mélatonine | 36 | 21 138 car. | 38 |
| 1 Les ingrédients fonctionnels 1A | 19 | 9 384 car. | 6 |

Constats structurants :

- **Ce sont des exports PowerPoint** (Acrobat PDFMaker, diapos 16:9, 960×540).
  ~544 caractères de texte par page : la couche texte est maigre, le sens est
  largement porté par la mise en page et les schémas → **la lecture vision est
  le canal principal**, pas un complément.
- La couche texte existe partout (pas de scan pur) → la lecture A (pdftotext,
  **gratuite**) est disponible comme vérité des caractères et des nombres.
- Le risque clinique est réel : 100 valeurs dosées dans un seul support.

Projection corpus : 85 pages / 3 sources ≈ **28 pages/source** →
391 sources ≈ **11 000 pages**.

## 2. Hypothèses de calcul (transparentes, à recaler au banc qualité)

- Rendu image : 1536×864 px par diapo (suffisant pour du 16:9 texte+schémas ;
  la haute résolution 2576 px est inutile ici et triplerait le coût image).
- Tokens image Claude ≈ (l×h)/750 ≈ **1 770/page** ; + prompt ≈ 300 →
  ~2 100 tokens d'entrée/page. OpenAI tokenise différemment (tuiles/patches) ;
  ordre de grandeur comparable, à mesurer au banc.
- Sortie Markdown ≈ 400 tokens/page (contenu réel ~180 + structure).
- Total corpus : ~23 M tokens entrée, ~4,4 M tokens sortie.
- **Batch API des deux fournisseurs : −50 %** (traitement asynchrone, idéal
  pour un stock). Tous les chiffres ci-dessous sont EN batch.

## 3. Coût d'une passe vision complète (11 000 pages, batch)

### Claude (tarifs officiels, vérifiés ce jour)

| Modèle | Entrée/Sortie $/M | Coût passe complète |
|---|---|---|
| Haiku 4.5 | 1 / 5 | **~23 $** |
| **Sonnet 5 (tarif intro jusqu'au 2026-08-31)** | 2 / 10 | **~45 $** |
| Sonnet 5 (tarif normal) | 3 / 15 | ~68 $ |
| Opus 4.8 | 5 / 25 | ~113 $ |
| Fable 5 | 10 / 50 | ~225 $ |

### OpenAI (tarifs relevés ce jour, sources en fin de note)

| Modèle | Entrée/Sortie $/M | Coût passe complète |
|---|---|---|
| GPT-5.4 (production recommandé) | 2,50 / 15 | **~62 $** |
| GPT-5.5 (flagship) | 5 / 30 | ~124 $ |

### Postes négligeables

- Lecture A (pdftotext) + invariants numériques : **0 $** (local, déterministe).
- Embeddings `text-embedding-3-small` (déjà choisi dans la PR 196) :
  ~2-3 M tokens pour tout le corpus → **< 0,10 $**.

## 4. Scénarios

| # | Scénario | Coût stock complet | Commentaire |
|---|---|---|---|
| 1 | Sonnet 5 seul + couche texte + invariants | **~45 $** | Le minimum sérieux : la couche texte joue déjà le rôle de contre-lecture |
| 2 | **Croisé intégral : Sonnet 5 + GPT-5.4** | **~107 $** | Deux vendeurs indépendants sur chaque page + couche texte = triple lecture. Recommandé |
| 3 | Sonnet 5 partout + GPT-5.4 sur `prescriptif` seul (~25 % des pages) | ~60 $ | Croisement là où le risque clinique est maximal |
| 4 | Opus 4.8 + GPT-5.5 (luxe) | ~237 $ | Non justifié : les diapos ne sont pas assez denses pour exiger le haut de gamme |

**La facturation astronomique n'existe pas ici** : même le scénario le plus
luxueux reste ~240 $ pour l'intégralité du corpus, et le recommandé ~107 $.
En rythme de croisière (corpus vivant), un nouveau cours de 30 diapos coûte
**10 à 30 centimes** en croisé.

## 5. Recommandation

**Scénario 2 (croisé intégral Sonnet 5 + GPT-5.4), lancé avant le 2026-08-31**
pour bénéficier du tarif d'introduction Sonnet 5 (−35 % sur la part Claude).

Justification :
- Deux fournisseurs **indépendants** : un biais de lecture commun aux deux
  modèles est improbable ; tout écart entre les trois lectures (texte, Claude,
  GPT) est un artéfact détecté mécaniquement.
- La différence entre le croisé intégral (~107 $) et le croisé ciblé (~60 $)
  est de ~47 $ **une seule fois** — négligeable devant le coût d'un dosage
  faux dans le cerveau de l'appli.
- GPT reste dans ton écosystème existant (révision ChatGPT, embeddings) ;
  Claude apporte la lecture indépendante.

## 6. Ce que le banc qualité (étape suivante) devra mesurer

1. Tokens image **réels** facturés par page chez chaque fournisseur (recale
   les colonnes ci-dessus, ±30 %).
2. Taux de concordance A/B/C par PDF ; artéfacts détectés par les invariants.
3. Qualité de restitution des tableaux et schémas (comptage de cellules).
4. Sensibilité à la résolution de rendu (1024×576 vs 1536×864 vs 1920×1080).

Prérequis : `OPENAI_API_KEY` (déjà prévu pour la PR 196) et `ANTHROPIC_API_KEY`
en variables d'environnement locales — jamais commitées.

## Sources tarifaires

- Claude : tarifs officiels via la documentation API Anthropic (relevés ce jour).
- OpenAI : [BenchLM — OpenAI API Pricing July 2026](https://benchlm.ai/openai/api-pricing),
  [TokenMix — OpenAI API Pricing 2026](https://tokenmix.ai/blog/openai-api-pricing),
  [G2 — OpenAI API Pricing Breakdown 2026](https://www.g2.com/articles/openai-api-pricing).
