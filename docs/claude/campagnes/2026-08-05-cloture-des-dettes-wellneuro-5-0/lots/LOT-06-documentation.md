---
id: "LOT-06"
titre: "Dettes psychométriques et exigences RGPD"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-06 — Prouver que la règle enregistrée est la bonne, et avancer le dossier RGPD

## But

Deux dettes de nature documentaire mais à effet juridique, réunies parce qu'elles
partagent la même exigence : produire une **preuve opposable**, pas une intention.

**Volet psychométrique.** Le projet prouve très bien que le code reproduit la
règle enregistrée. Il prouve mal que la règle enregistrée est la bonne version,
scientifiquement et juridiquement utilisable. L'écart est déjà nommé (#560, « ce
que “certifié” ne dit pas ») ; il reste à le solder. État exact :
60 `scoring_verifie`, 2 suspendus terminaux (Q_FIB_03 fermé, Q_PED_03 arbitrage
clinique ouvert), Q_SOM_09 en `droits_verifies`, Q_GEO_04 en `contenu_verrouille`.

**Volet RGPD.** Le gate G-TRUST-04 n'est pas « en attente » : il a été **arbitré
le 2026-07-22** — rester sur l'hébergement actuel, borner la phase de test au
2026-10-21, ne pas instruire de migration HDS. Ce qui reste actionnable, et qui ne
dépend d'aucun hébergeur : piste d'audit des accès légitimes (exigence 5),
procédure de violation de données (6), dossier RGPD (7).

## Résultat observable

- Les onze notices bibliographiques manquantes sont complétées, ou chacune porte
  la raison écrite de son absence.
- Le statut COSMIN de chaque instrument est renseigné ou explicitement « inconnu,
  et voici pourquoi ».
- Q_GEO_04 : l'escalade SIIN du 2026-07-25 a une suite datée — réponse, relance,
  ou plan B (sourcer les bandes HAS 2011 directement).
- Les exigences 5, 6 et 7 de G-TRUST-04 ont chacune un livrable ou une échéance.

## Périmètre

- Registre des questionnaires : notices, COSMIN, base de preuves psychométriques.
- Suivi des deux dossiers en vol : Q_SOM_09 (recueil de droits en cours),
  Q_GEO_04 (escalade SIIN).
- `CHECKLIST_ACTIVATION_G_TRUST_04.md` : avancer 5, 6, 7.

## Hors périmètre

- **Lever le gate G-TRUST-04** — hors mandat de cette campagne.
- Biologie réelle, documents de laboratoire, dispositifs connectés, captation
  vocale : tous subordonnés au gate, aucun n'entre ici.
- Rouvrir Q_FIB_03 (fermé définitivement, ne rouvrir que sur usage) ou Q_PED_03
  (suspendu ; rouvrir sur usage seulement, avec le scoring dimensionnel complet,
  jamais la somme brute).
- Toute modification de seuil.

## Fichiers probables

- registre des questionnaires et ses notices
- `docs/claude/CHECKLIST_ACTIVATION_G_TRUST_04.md`
- `docs/claude/REGISTRE_FRONTIERES.md`
- `changelog.d/2026-08-05-notices-et-exigences-rgpd.md`

## Interdits

- Aucune donnée patient réelle.
- Ne **jamais** inventer ni « compléter » une référence bibliographique : une
  notice absente reste absente, avec sa raison.
- Pas de modification de seuil ni de bande.
- Pas de migration.

## Étapes

- [ ] Lister les onze notices et leur état réel.
- [ ] Compléter ce qui est sourçable ; écrire la raison pour le reste.
- [ ] Renseigner COSMIN, ou l'inconnu assumé.
- [ ] Relancer ou clore l'escalade SIIN (Q_GEO_04).
- [ ] Avancer les exigences 5, 6, 7 de G-TRUST-04.
- [ ] T1.

## Tests

- Contrôle de cohérence du registre : aucune notice ne doit être « vide sans
  raison ».
- Vérification que les compteurs de certification n'ont pas bougé sans commit.

## Critères de done

- [ ] Zéro notice vide sans raison écrite.
- [ ] COSMIN renseigné ou inconnu assumé, pour chaque instrument.
- [ ] Q_GEO_04 et Q_SOM_09 ont chacun une suite datée.
- [ ] Exigences 5, 6, 7 : livrable ou échéance pour chacune.

## Résultats

À compléter à la clôture.
