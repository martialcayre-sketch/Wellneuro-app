### Le registre ne savait pas à qui demander : les titulaires sont nommés, ou déclarés non identifiés (2026-09-15)

Audit des **dix-sept instruments cités par une table signée**, demandé en priorité
sur ceux-là parce qu'ils commandent une décision clinique.

**CE QUE L'AUDIT N'A PAS TROUVÉ, ET C'EST À DIRE EN PREMIER.** Les dix-sept
portent tous `permission_obtenue`, et aucun n'est mal instruit. Le BDI porte sa
portée juridique en toutes lettres — « ne constitue PAS une licence et n'éteint
aucun droit » —, sa correction du 2026-07-29 et sa supersession. Le MMSE et le
HAD portent un arbitrage pris **« CONTRE l'avis consigné de l'assistant »**. Le
dépôt avait déjà raisonné mieux que le criblage.

**L'ÉCART EST AILLEURS, ET IL EST STRUCTUREL.** Le champ
`instrument.proprietaireDroits` était renseigné pour **1 instrument sur 17**.
Or la clause d'échappement des déclarations disait : « aucune autorisation n'a
été sollicitée auprès des ayants droit identifiés au champ
`instrument.auteurs` » — et `auteurs` nomme les **auteurs**. Pour un instrument
dont les droits ont été cédés à un éditeur, **l'auteur n'est pas celui qui peut
autoriser**. Le registre était donc incapable de dire à qui une autorisation
devrait être demandée, tout en affirmant ne pas l'avoir demandée.

Le QDRS l'a démontré le même jour : sa politique réelle — interdiction nommée
des traductions et de l'incorporation dans un logiciel de dossier médical — ne
venait pas de ses auteurs mais de ses **conditions de diffusion**. Une lecture
au niveau « auteurs » ne l'aurait jamais fait apparaître.

**SIX TITULAIRES SOURCÉS**, relevés le 2026-09-15 :

| instrument | titulaire | ce que la source dit |
|---|---|---|
| MMSE `Q_GEO_04` | Psychological Assessment Resources (PAR) | accord **exclusif** avec les auteurs depuis 2001, tous supports, toutes langues |
| HAD `Q_NEU_11` | GL Assessment (UK) | « all rights reserved » ; « do not use without permission » ; hors UK/IE → Mapi Research Trust, donc la France |
| IRLS `Q_SOM_04` | IRLSSG, licence par Mapi Research Trust | redevances possibles selon le contexte d'usage |
| PSQI `Q_SOM_01` | University of Pittsburgh | libre pour usage **non commercial** ; licence payante sinon |
| PSS-10 `Q_STR_02` | Sheldon Cohen (Carnegie Mellon) | sans frais pour la recherche **à but non lucratif** et l'enseignement |
| QDRS `Q_GEO_05` | J. E. Galvin / New York University | relevé sur le document officiel, clause déjà versée au dossier |

**QUATRE SONT D'ORIGINE SIIN** — `Q_NEU_06`, `Q_INF_05`, `Q_GAS_01`, `Q_CAR_01` —
et reçoivent le référentiel lui-même comme titulaire, au même titre que
`Q_ALI_01`.

**SIX RESTENT « NON IDENTIFIÉ », ET C'EST UNE VALEUR, PAS UN OUBLI** : BDI-13,
BMS-10, Pichot, IBS-SSS, AQ, test des 5 mots. `null` se lisait « rien » ; la
mention explicite se lit « cherché, pas trouvé ».

**LE CAS DU BDI MÉRITE SA NUANCE**, parce qu'il montre où s'arrête une source.
Les inventaires Beck sont distribués sous licence commerciale par Pearson, qui
exige une licence pour l'administration clinique — mais cette source porte sur le
**BDI-II**, tandis que la forme servie est l'abrégée de 1972 (Beck & Beck,
*Postgrad Med*, PMID 4635613). Nommer Pearson ici aurait été une **inférence, pas
un constat** : le champ dit « non identifié » et le détail dit pourquoi.

**CE LOT NE CHANGE AUCUN USAGE, AUCUN STATUT, AUCUN SEUIL.** Aucun
`droits.statut` n'est touché, aucun instrument n'est retiré, rien n'est éteint.
Il rend seulement dicible ce que les déclarations prétendaient déjà couvrir. Les
conditions relevées ci-dessus — « non commercial », « à but non lucratif », « do
not use without permission » — sont **versées au dossier sans être conclues** :
les rapprocher de l'exercice du cabinet est un arbitrage praticien, pas une
lecture d'outil.
