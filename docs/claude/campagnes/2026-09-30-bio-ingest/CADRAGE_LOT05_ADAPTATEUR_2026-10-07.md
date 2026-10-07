# Cadrage LOT-05 — adaptateur laboratoire : architecture arrêtée (2026-10-07)

Annexe de cadrage du LOT-05. Synthèse d'un brainstorming à deux voix (Claude, Codex), trois tours,
convergé le 2026-10-07. Aucune décision `D-xxx` n'est prise ici : le canal, le profil de format et
la sémantique des rectificatifs attendent les preuves du laboratoire pilote (spécification et
fichiers d'exemple fictifs, demandés par écrit le 2026-10-07).

## Ce que le laboratoire a confirmé (2026-10-05)

- Formats : HPRIM, HL7, CDA, PDF, au choix du destinataire.
- Canaux : messagerie sécurisée de santé, serveur de résultats web, ou flux automatisé à définir.
- Contenu : valeurs, unités, intervalles ; codification interne ; LOINC partiel.
- Correction : nouveau compte rendu, tracé, retransmis par le même canal (forme du lien inconnue).
- Spécification et exemple fictif disponibles une fois le format choisi.

Souhait du responsable : un **flux numérique automatisé**, pas un dépôt manuel comme cible.

## Arrêté

1. **Un staging, un écran de validation.** Réception → analyseur propre au format (IA pour PDF et
   photo, déterministe pour le structuré) → staging commun → validation explicite du praticien →
   seule écriture dans `resultats_biologiques`. On distingue message source, tentative de
   traitement et version émise par le laboratoire.
2. **Aucune IA sur le flux structuré.** Code laboratoire → catalogue par une table déterministe,
   curée par un humain ; une IA peut au plus proposer une correspondance hors ingestion.
3. **Versions immuables.** Un rectificatif est une nouvelle version liée ; remplacement ou
   annulation d'un résultat validé exigent une nouvelle décision du praticien. Le contrôle actuel
   de doublon (analyte + horodatage exact, `decisions.ts`) refuserait un rectificatif : il faudra
   un chemin dédié.
4. **Rattachement patient confirmé humainement.** Un message peut arriver sans dossier rattaché
   (aujourd'hui `idPatient` est obligatoire sur l'import : migration). File « à rattacher », aucun
   dossier créé automatiquement ; l'INS est un trait comparé, pas une clé (WellNeuro ne la
   qualifie pas).
5. **Exactitude.** Texte source intact, chaîne décimale canonique, `Decimal` jusqu'en base ;
   comparateur (`<`, `>`) séparé, non admissible comme mesure exacte en V1 ; aucune conversion
   d'unité (`D-157`) ; résultat qualitatif visible et non validable en V1.
6. **Format.** CDA R2 CR-BIO structuré en premier candidat, parsé en sous-ensemble strict (refus
   hors profil ; DTD, entités externes et feuille de style reçue désactivées). HL7 v2 ou HPRIM
   Santé en repli. Pas de moteur multi-format avant un second laboratoire.
7. **Analyseur avant transport.** Qualifié hors ligne sur fichiers fictifs ; le dépôt manuel du
   fichier structuré sert à qualifier le code, pas de livraison finale. Le transport s'ajoute
   ensuite, derrière un drapeau éteint.
8. **Purge.** Le brut reste borné (30 jours aujourd'hui) ; identifiants de compte rendu,
   d'observation, de version et leur autorité émettrice survivent à la purge, pour relier un
   rectificatif tardif. Une empreinte détecte une retransmission, elle ne remplace pas ces liens.
9. **Cas limites à couvrir.** Rectificatif arrivé avant l'original (en attente) ; compte rendu
   partiel (une observation absente ne vaut jamais annulation) ; analyse sous-traitée (producteur
   distinct du transmetteur, code qualifié par son producteur) ; accusé technique = « reçu
   durablement », jamais « rattaché » ni « validé ».

## Ouvert — tranché par les réponses du laboratoire

| Question | Ce qui tranche |
|---|---|
| Canal : MSSanté applicatif relevé côté serveur, ou réception HTTPS signée | Canal émis nativement par le laboratoire vers un tiers ; éligibilité MSSanté de la structure ; terminaison TLS Scalingo (mTLS non présumé) |
| Destinataire autorisé (praticien non prescripteur, en copie) | Modalités du laboratoire, révocation ; statut du praticien vis-à-vis de l'équipe de soins |
| Rôles RGPD | Identité juridique de l'éditeur et du praticien (même entité : pas de sous-traitance avec soi-même) ; registre et information patient mis à jour |
| Sémantique des rectificatifs | Identifiants stables et liens entre versions dans les fichiers d'exemple |

## Séquence

| # | Lot | Migration | Dépend de |
|---|---|---|---|
| 0 | Décimales exactes de bout en bout, toutes voies — **LOT-10** | à confirmer (colonne déjà `Decimal`) | rien |
| 1 | Décision de cadrage (canal, destinataire, rôles, conservation) | non | réponses du laboratoire |
| 2 | Modèle de réception (provenance, identifiants, versions, patient facultatif, trace non-IA) | oui, seule | 1 |
| 3 | Analyseur unique, qualifié hors ligne | non | exemples |
| 4 | File « à rattacher » et décision sur rectificatifs | probable | 2 |
| 5 | Table des codes du laboratoire et outil de curation | oui | dictionnaire du laboratoire |
| 6 | Transport automatisé sous drapeau, puis pilote fermé | minime | 1, convention |
