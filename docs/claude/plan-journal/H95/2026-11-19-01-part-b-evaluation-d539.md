- **Mise à jour (2026-11-19, part B, constat — évaluation rejouée de D-539 §8 : NON CONFORME)**.

  **Conditions** (§8) :
  - hors production : rien ne lit ni n'écrit une base, Prisma est simulé en mémoire ;
  - 24 dossiers entièrement fictifs aux identités de D-125, 3 passages chacun, soit 72 générations ;
  - code de `main` à `c60501a2` (après #2255) ; modèle de production `claude-sonnet-4-6`, lu dans `scalingo env` ;
  - consignes `synthese-v37` et `synthese-biologie-v1` ; vraie route, vrai lecteur et vrai constructeur du bloc, vrai assemblage ;
  - banc rejouable : `web/scripts/eval-d539/`, hors de toute configuration de CI ;
  - clé de développement, sur ce Mac, coût de l'ordre de 8 $ (arbitrage du responsable du 2026-11-19).

  **Entrées vérifiées, mécaniquement, sur les 72 générations** :
  - 72 générations servies, sans relance ;
  - l'appel principal ne porte aucun morceau du bloc ;
  - le second appel porte le bloc exact, seul, après l'appel principal ;
  - la phrase du §5 est posée à la date la plus récente du bloc.

  **Cotation** : par la session, puis par une lecture indépendante de Codex (`wn-codex-avis.mjs --mode revue`, cinq paquets, grille recopiée de la décision par script ; cinq avis conformes, code 0). Générations en violation, sur 72 :

  | Appel | Session | Codex | Communes |
  |---|---|---|---|
  | Second appel | 4 (ligne 4 : 3 ; ligne 5 : 1) | 6 (ligne 4 : 3 ; ligne 7 : 3) | 3, ligne 4 |
  | Appel principal et narratif assemblé | 1 (ligne 11) | 38 (ligne 10 : 33 ; ligne 11 : 14) | 1, ligne 11 |

  **Verdict : non conforme pour les deux appels.** Les seules violations relevées par les deux lectures suffisent à le rendre. Le troisième préalable de §7b n'est donc pas rempli ; le drapeau reste éteint.

  **Écart entre les deux lectures** (constat, non tranché) :
  - **Lignes 10 et 11.** La session a exempté les questions sur un examen antérieur, qui nomment une analyse du dossier, et les noms d'analyte venus d'un intitulé de questionnaire ou de l'anamnèse. Codex les compte : l'exception écrite de la ligne 10 ne vise que le rappel d'un examen déclaré et la mention d'un dosage nécessaire, et la ligne 11 n'a pas d'exception.
  - **Lignes 5 et 7.** Un écart chiffré non qualifié, sur une série qui porte un motif de non-comparabilité, est compté en ligne 5 par la session seule. Une vigilance fondée sur un motif non transmis est comptée en ligne 7 par Codex seul.

  **Pièces** : sorties brutes, cotation détaillée et avis Codex au dépôt privé des revues (dossier `h95-d539-evaluation-2026-11-19/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche des consignes, ni aucune lecture de la grille. Toute modification d'une des deux consignes fait rejouer l'évaluation en entier (§8).
