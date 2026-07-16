# Runbook incidents — TRUST V1

> Conduites à tenir pour le praticien. Rien ne se supprime : les statuts
> évoluent (`recu → en_cours → traite → clos`) dans « Confiance & droits ».

## Signalement d'effet indésirable

1. La carte apparaît **en tête du Fil** + email générique.
2. Ouvrir « Confiance & droits » : produit, symptômes déclarés, sévérité,
   action prise, et **l'orientation déjà donnée au patient** (règle v1,
   tracée). Aucune causalité n'a été affirmée.
3. Contacter le patient selon votre jugement clinique ; consigner via le
   statut. Si le signal relève de la nutrivigilance (complément), faire la
   déclaration externe selon le circuit officiel (l'app n'automatise rien).
4. Statut `traite` quand la réponse organisationnelle est faite ; `clos`
   après revue.

## Incident de confidentialité

1. `connexion_non_reconnue` ou `appareil_perdu` → **révoquer le token**
   du patient (fiche patient → révocation), puis renvoyer un nouveau lien.
2. `document_dun_autre_patient` ou `partage_incorrect` → vérifier
   immédiatement l'isolation des données ; si une fuite entre patients est
   confirmée, c'est un incident majeur : documenter, corriger avant tout
   nouvel envoi, évaluer l'obligation de notification (CNIL / personnes
   concernées) avec le conseil juridique (D-TRUST-02).
3. `information_incorrecte` → corriger le document concerné, répondre au
   patient.
4. Toujours passer par les statuts — jamais de suppression.

## Demande d'exercice de droits

1. Vérifier l'identité (la demande vient d'une session authentifiée).
2. Répondre en expliquant ce qui est possible et pourquoi (champ réponse) —
   ne jamais promettre un droit absolu (effacement notamment : obligations
   de conservation).
3. `retrait_choix` : vérifier que l'événement de retrait existe dans
   l'historique du patient (append-only).

## Panne / indisponibilité

- Les consignes d'urgence (15/112/114/3114) figurent dans les documents et
  les messages d'orientation — le patient n'a jamais besoin du serveur pour
  savoir quoi faire en urgence (elles sont aussi dans les emails de bilan
  au besoin futur).
- Si `SMTP_URL` est indisponible : les dépôts patients restent enregistrés ;
  seule la notification échoue (silencieuse). Consulter « Confiance &
  droits » au moins quotidiennement tant que l'email n'est pas rétabli.
