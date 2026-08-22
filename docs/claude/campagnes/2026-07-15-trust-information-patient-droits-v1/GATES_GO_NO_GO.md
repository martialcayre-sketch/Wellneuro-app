# Gates GO / NO-GO — TRUST LOT-00

> Statut des six gates du cadrage au 2026-07-16, avec décisions utilisateur
> (responsable du traitement et praticien) recueillies le 2026-07-16.

| Gate | Objet | Statut | Fondement |
|---|---|---|---|
| G-TRUST-01 | État réel du dépôt | **Levé** | `AUDIT_ETAT_REEL_TRUST.md` — audit refait au commit courant, chaque constat sourcé |
| G-TRUST-02 | Qualification des rôles | **Levé pour V1** | Responsable du traitement : le praticien (Wellneuro, contact `martialcayre@wellneuro.fr`). Sous-traitants réels : Vercel, Supabase, Anthropic, fournisseur SMTP, Google (OAuth praticien). Pas de DPO désigné — point de contact = responsable ; consigné en dette |
| G-TRUST-03 | Validation juridique | **Levé pour V1 par le responsable** (décision 2026-07-16) | Les textes v1 reprennent les formulations prudentes du cadrage ; la relecture des PR par l'utilisateur vaut validation du responsable. **Revue juridique/DPO externe = dette** (`DETTE_TRUST.md`) ; textes versionnés, une v2 post-revue est triviale |
| G-TRUST-04 | Sécurité et hébergement | **Levé le 2026-08-22, sous réserve unique** (décision du responsable, `D-089`) — réserve : **signature de l'annexe HDS**, à constater levée au plus tard au 2026-09-01 (`D-080`) ; à défaut, le 2026-10-21 (ancienne borne de dérogation) redevient point de contrôle | L'état du code a rejoint les exigences le 2026-08-22 (preuves ligne à ligne : `CHECKLIST_ACTIVATION_G_TRUST_04.md`) : hébergement ET données chez un hébergeur certifié HDS depuis le cutover (Scalingo, certificat LNE 38436), journalisation prouvée en production (947 accès), purge des jetons dormants vérifiée §C, mono-praticien arbitré sans objet avec condition de réouverture (`D-085`), procédures d'incident exercées + runbook Scalingo + registre physique, revue de sécurité jouée, triée et corrigée le jour même. ~~Pas d'HDS, pas de journalisation centralisée~~ — fondements du NO-GO de juillet, tombés. **Ce que la réserve retient encore** : aucune affirmation contractuelle d'hébergement HDS face au patient tant que l'annexe n'est pas signée. La biologie réelle reste hors produit par roadmap (Phase C), plus par ce gate |
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
