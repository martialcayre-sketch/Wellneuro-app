### J2-base : `SAF-QUEST-02` explique la valeur hors options par la copie prise à l'envoi ; un prérequis de plus avant l'allumage (H59, D-524, 2026-11-14)

Ce lot applique deux réponses B du responsable, `20261114-2146-a` et `20261114-2145-a`, consignées dans `D-524`. Il amende `D-515` §3 et §6. `SAF-QUEST-02` reste non signée, et `WN_ENABLE_DECLARATION_SUICIDE_CAB` reste éteint.

- **Texte « hors options » du cabinet** (`safetyQuestionnaireCabinetTextes.ts`). Une valeur absente des options **copiées** reste un constat, mais elle ne s'explique plus par le texte de `SAF-QUEST-01`, « aucune option de la question ». Ce texte est faux quand le patient a choisi une option réelle que la copie n'a pas : une option hors int4, ou une option ajoutée après l'envoi.
- **Dans la lettre**, une telle réponse d'un `CAB_` est marquée (¶) et porte son propre paragraphe. Une réponse du catalogue garde (‡) et son paragraphe. Une lettre sans `CAB_` ne change pas d'un caractère, ce que vérifie le banc à empreintes figées.
- **Le SHA du périmètre** passe de `6c0d224f…` à `67b9ef54…`. La surface de relecture est amendée, et la signature couvre le SHA neuf. `SAF-QUEST-01` reste identique à l'octet (`eb350485…`).
- **Allumage.** Le lot qui refusera le déverrouillage d'une assignation « oui » dont la copie ne concorde plus avec l'instrument (`D-524` §2) devient un prérequis écrit de l'allumage. Il est inscrit dans `docs/FEATURE_FLAGS.md` et au carnet (`h59-d515-deverrouillage`). La signature ne l'attend pas.
