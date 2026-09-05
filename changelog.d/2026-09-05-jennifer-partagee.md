### Le dossier de reprise n'était pas exclusif, contrairement à ce qui était écrit (2026-09-05)

`portail-pack-reevaluation.spec.ts` affirmait que Jennifer Martin (PAT_SEED_02)
était « utilisé par aucun autre spec », et le justifiait par le fait que « les
specs tournent en parallèle sur la même base éphémère ». Les deux affirmations
étaient fausses, et elles se tenaient l'une l'autre.

Elle est nommée par **quatre** specs. Trois y écrivent —
`portail-pack-reevaluation` et `visual.spec.ts` par `preparerReprisePourTest`,
`biologie-proposition-courrier` en confirmant un épisode T0 ;
`fiche-detail-reponses` se contente de lire.

Et **rien ne tourne en parallèle** : `playwright.config.ts` pose
`fullyParallel: false` et `workers: 1`. Les specs se suivent dans l'ordre
alphabétique des fichiers.

**Aucun comportement ne change** : il n'y a pas de course, et le risque réel est
nul aujourd'hui. Ce qui protège n'est simplement pas ce qui était écrit — c'est
que la séquence est déterministe et que chaque spec qui mute nettoie derrière
lui (`nettoyerReprise`, `nettoyerDossierBiologie`).

Corrigé parce qu'un commentaire crédible et faux est ce sur quoi quelqu'un
s'appuiera. C'est le motif que ce chantier a rencontré six fois : le savoir
existe quelque part, il n'est pas opposable, et il finit par être faux sans que
rien ne le dise. Ici la garde ne peut pas être un test — la protection est une
propriété de configuration, pas une invariante de fichier ; ce qui restait à
faire était de cesser de mentir sur elle.

Le motif du choix de Jennifer, lui, tient toujours : la mise en reprise mute ses
réponses et son état de compte, et l'appliquer à Michel (PAT_SEED_03) casserait
`portail-parcours`.
