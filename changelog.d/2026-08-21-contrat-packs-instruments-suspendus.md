### Packs — « jamais d'instrument suspendu dans un pack actif » devient un contrat CI (LOT-03, Biologie consolidée)

- Nouveau contrat `web/prisma/checks/packs_instruments_suspendus_v1.sql`,
  frère de `packs_registre_coherence_v1.sql`, jamais son doublon : deux
  représentations d'accord peuvent être toutes deux fausses, et l'incident du
  2026-08-06 (`Q_ALI_09`, suspendu, entré au pack de base actif, réparé le
  lendemain par l'effet d'une écriture d'une autre campagne) est précisément
  cet angle mort. Deux assertions — source legacy `packs.qids` et miroir
  relationnel — chacune complète sur sa représentation, aucune ne dépend de la
  santé du contrat frère.
- La suspension se lit **en base** (`questionnaires.actif = false`, écrite par
  `backfillQuestionnaireRegistry.ts` depuis le catalogue), jamais dans une
  liste de qids recopiée. Cela ferme la réserve laissée ouverte par `D-033` :
  `IDS_SUSPENDUS` dérive du catalogue de code — et pour `Q_ALI_09` d'un
  drapeau d'environnement — donc se lisait dans la mauvaise position pour un
  contrat SQL ; le registre relationnel, lui, se lit dans la bonne.
- Câblé dans `ci.yml` **après le seed** (base peuplée, lignes réelles) ; T3 le
  joue par extraction automatique de `ci.yml`. Pas de câblage en préflight
  `release-db.yml` : hors périmètre du lot, décision distincte.
- **Éprouvé par mutation dans les deux sens** sur base éphémère locale
  (migrate deploy + seed) : vu rouge assertion 1 (pack actif inséré
  référençant un instrument suspendu — la forme de l'incident), vu rouge
  assertion 2 (suspension d'un qid du pack de base miroité, retiré du seul
  legacy), vu vert sain, vu vert non-vacu (instrument suspendu présent en base
  mais non référencé). Les motifs nomment le pack et le qid.
- Constat de production du 2026-08-21 (lecture MCP, voie sanctionnée) : dix
  définitions suspendues en base (backfill du 2026-08-06), **aucun pack actif
  n'en référence** — l'invariant tient, le contrat naît vert sur du réel.
