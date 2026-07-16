# Gates GO / NO-GO — TRUST LOT-00

> Statut des six gates du cadrage au 2026-07-16, avec décisions utilisateur
> (responsable du traitement et praticien) recueillies le 2026-07-16.

| Gate | Objet | Statut | Fondement |
|---|---|---|---|
| G-TRUST-01 | État réel du dépôt | **Levé** | `AUDIT_ETAT_REEL_TRUST.md` — audit refait au commit courant, chaque constat sourcé |
| G-TRUST-02 | Qualification des rôles | **Levé pour V1** | Responsable du traitement : le praticien (Wellneuro, contact `martialcayre@wellneuro.fr`). Sous-traitants réels : Vercel, Supabase, Anthropic, fournisseur SMTP, Google (OAuth praticien). Pas de DPO désigné — point de contact = responsable ; consigné en dette |
| G-TRUST-03 | Validation juridique | **Levé pour V1 par le responsable** (décision 2026-07-16) | Les textes v1 reprennent les formulations prudentes du cadrage ; la relecture des PR par l'utilisateur vaut validation du responsable. **Revue juridique/DPO externe = dette** (`DETTE_TRUST.md`) ; textes versionnés, une v2 post-revue est triviale |
| G-TRUST-04 | Sécurité et hébergement | **Non levé — documenté** | Pas d'HDS, mono-praticien, pas de journalisation centralisée. Conséquence tenue : le centre d'information **n'affirme jamais** ce qui n'existe pas (pas de mention HDS, pas de promesse de surveillance) ; les résultats biologiques réels restent hors produit (Phase C du programme 5.0) |
| G-TRUST-05 | Gouvernance clinique | **Levé pour la seule règle V1** | `REGLE_ORIENTATION_EI_V1` : source = sévérité déclarée par le patient ; propriétaire clinique = praticien ; versionnée ; messages fixes testés ; validée par relecture praticien de la PR de lot ; revue périodique inscrite en dette |
| G-TRUST-06 | IA | **Levé pour V1** | Cas d'usage unique et connu : synthèse Anthropic (`CLAUDE_MODEL`, `versionPrompt` tracés en base), validation humaine bloquante déjà en place (booklet). L'information patient reflète exactement cette architecture, rien de plus |

## Verdict LOT-00

**GO exécution V1** dans le périmètre de `MATRICE_FRONTIERES_TRUST.md`,
avec dettes nommées (revue juridique externe, DPO, G-TRUST-04, panel humain
LOT-07) portées dans `DETTE_TRUST.md` à la clôture.

Le NO-GO générique du cadrage (« activation avec données réelles ») est
transformé : les surfaces V1 mises en production sont **informatives et
déclaratives** (information versionnée, accusés, choix, signalements) ;
aucune règle clinique nouvelle n'agit sur les données de santé, aucun seuil
n'est modifié, aucune promesse n'excède l'architecture réelle.
