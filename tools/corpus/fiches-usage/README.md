# Fiches d'usage — la rédaction hors ligne du besoin 2

Lot BP-12a (`D-314` §4), sur le patron de `tools/corpus/fiches/`. L'outil
rédige le texte des fiches d'usage, rubrique par rubrique, et les libellés de
leur vocabulaire (hypothèses, populations d'usage), puis les dépose en base
comme **brouillons**. La validation reste un acte du responsable, rubrique
par rubrique et libellé par libellé, posé dans l'application (rayon « Fiches
d'usage » de la page « Biologie fonctionnelle », `D-314` §9), jamais ici
(`DC-16`).

**Aucun texte de fiche ni libellé n'entre au dépôt**, qui est public (`D-251`
§4). Les sorties vivent sous `~/.wellneuro/corpus/fiches-usage/<identifiant>/`,
et le terminal n'imprime que des comptes, des codes et des chemins.

## Avant le premier envoi

- **La structure doit déclarer des fiches.** Elle est livrée vide
  (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`) : sans fiche ni terme,
  l'outil ne rédige rien.
- **Les deux consignes se relisent par le responsable.** Elles disent ce
  qu'un modèle a le droit d'écrire ; elles ne définissent pas le contenu
  clinique des rubriques, que seuls les claims portent.
- **Le document TRUST** (`docs/TRUST_IA_FICHES_USAGE.md`) nomme les
  fournisseurs ; la mention au dossier RGPD (rubrique 6) est posée.

## Prérequis

- Une fois, les SDK : `npm --prefix tools/corpus ci`.
- L'instantané local des claims (`--claims` pour en nommer un autre que
  celui de `tools/corpus/fiches/lib/entrees.mjs`). Chaque claim épinglé par la
  structure doit y figurer, à sa version, et redonner son empreinte.
- Les clés, dans `web/.env.local` : `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, et
  pour déposer, `RAG_INTERNAL_SECRET`.

Toutes les commandes se lancent **depuis la racine du dépôt**.

## 1. Rédiger — `rediger.mjs`

```bash
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/rediger.mjs [--fiche FU_…[,…]] [--terme HYP_…|POP_…[,…]]
```

Sans `--fiche` ni `--terme`, l'outil traite toutes les fiches et tous les
termes de la structure. Pour chaque fiche :

1. **Entrées.** La fiche de la structure (identifiants seulement) et les
   claims qu'elle épingle, lus dans l'instantané. Un claim absent arrête la
   fiche. Aucune donnée patient n'entre dans la consigne.
2. **Rédaction.** Claude rédige toutes les rubriques attendues, sous
   `consignes/redaction.md`. Une réponse qui n'a pas exactement ces
   rubriques arrête la fiche.
3. **Contre-lecture.** GPT relit chaque rubrique, dans le contexte des
   autres, sous `consignes/contre-lecture.md`. Au plus 4 appels à la fois.
4. **DC-03** (`D-266` §7). `verifierDc03`, importé de `web/src`, refuse tout
   identifiant ou nombre absent de ce que le rédacteur a reçu.
5. **Tout ou rien.** Un désaccord, un échec technique ou un DC-03 négatif sur
   UNE rubrique fait échouer la fiche : une version sans l'une de ses
   rubriques ne serait jamais valide. Le rapport de revue dit laquelle et
   pourquoi.
6. **Contrat et structure**, importés de `web/src`, rejoués sur le brouillon
   retenu, puis écriture de `<horodatage>-brouillon.json`.

Un libellé suit le même chemin, sur les claims des fiches qui citent son
terme. Les modèles se changent par `WN_FICHES_USAGE_CLAUDE_MODEL` et
`WN_FICHES_USAGE_OPENAI_MODEL` ; leurs noms partent avec le brouillon.

## 2. Contrôler puis déposer — `deposer.mjs`

```bash
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/deposer.mjs --validate <brouillon.json>…
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/deposer.mjs --cible https://app.wellneuro.fr <brouillon.json>…
```

Le contrat et le contrôle contre la structure repassent sur le fichier tel
qu'il est. `--cible` est obligatoire, `https` hors de la machine locale, sans
redirection. Une version part vers `/api/internal/fiches-usage/ingest`, un
libellé vers `/api/internal/fiches-usage/libelles/ingest`. Un dépôt identique
rejoué rend `BROUILLON_INCHANGE`.

## La consigne versionnée

`versionConsigne` vaut `fiche-usage-v1+<empreinte des deux consignes>`,
épinglée dans `lib/consigne.mjs` et gardée par `lib/consigne.test.mjs`.

## Ce que l'outil ne voit pas

- **Le statut VALIDE des claims** : seule la production le connaît, et le
  contrat de fraîcheur des tables signées le garde.
- **Ce que le contrôle machine ne lit pas** : un nombre en lettres, un sens
  déplacé, une population élargie. La contre-lecture les cherche, et **la
  relecture intégrale du praticien** reste la dernière porte (`D-195` §1).

## Bancs

`lib/*.test.mjs`, joués par `scripts/run-certify-bancs.sh` (T1 et CI) : le
cœur pur, la consigne épinglée, et le chargement du **vrai** contrat, du
**vrai** contrôle et du **vrai** DC-03 par le hook d'alias. Texte synthétique
seulement ; aucun modèle appelé.
