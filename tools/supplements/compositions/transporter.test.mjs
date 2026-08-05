import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

import {
  EnvoiRefuse,
  TAILLE_LOT_MAX,
  LIGNES_MAX_PAR_LOT,
  decouperEnLotsBornes,
  decouperEnLots,
  envoyerSerie,
  formaterProduitPourEnvoi,
  identifiantProduit,
  main,
} from './transporter.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));

describe('decouperEnLots', () => {
  it('501 produits → 2 lots, 500 puis 1', () => {
    const produits = Array.from({ length: 501 }, (_, i) => ({ sourceIdentifiant: String(i) }));
    const lots = decouperEnLots(produits, TAILLE_LOT_MAX);
    assert.equal(lots.length, 2);
    assert.equal(lots[0].length, 500);
    assert.equal(lots[1].length, 1);
    // Ordre conservé, rien perdu ni dupliqué.
    assert.equal(lots[0][0].sourceIdentifiant, '0');
    assert.equal(lots[1][0].sourceIdentifiant, '500');
  });

  it('une liste vide rend zéro lot, pas un lot vide', () => {
    assert.deepEqual(decouperEnLots([], TAILLE_LOT_MAX), []);
  });

  it('taille exactement égale à la borne : un seul lot', () => {
    const produits = Array.from({ length: 500 }, (_, i) => ({ sourceIdentifiant: String(i) }));
    assert.equal(decouperEnLots(produits, TAILLE_LOT_MAX).length, 1);
  });
});

// Ce banc a été livré CÂBLÉ NULLE PART : ni `npm run check` ni le CI ne le
// nommaient, et son anti-dérive comme sa preuve « le dry-run n'ouvre aucune
// connexion » ne gardaient donc rien. Le voici qui exige ses deux runners.
//
// LIMITE À CONNAÎTRE : `scripts/parite-check-ci.test.mjs` ne couvre que les
// étapes du CI ANTÉRIEURES à `actions/setup-node`, et celle-ci vient après —
// c'est donc ce test-ci, et lui seul, qui tient le couplage. Il ne peut rien
// contre un retrait des DEUX côtés à la fois, qui le débrancherait lui aussi.
describe('câblage du banc', () => {
  const racine = join(ICI, '..', '..', '..');

  it('est nommé par `compositions-check`', () => {
    const scripts = JSON.parse(readFileSync(join(racine, 'web', 'package.json'), 'utf8')).scripts;
    assert.match(scripts['compositions-check'], /transporter\.test\.mjs/);
  });

  it('…et `compositions-check` est appelé par `check` — la CHAÎNE, pas la feuille', () => {
    // La version précédente s'arrêtait au test ci-dessus : elle gardait la
    // FEUILLE (le script nomme bien le fichier) sans garder la CHAÎNE. Retirer
    // `&& npm run compositions-check` de `check` laissait le banc vert et
    // débranché de T1 — exactement le défaut que ce describe existe pour
    // fermer, reproduit un cran plus haut.
    const scripts = JSON.parse(readFileSync(join(racine, 'web', 'package.json'), 'utf8')).scripts;
    assert.match(scripts.check, /(^|&&\s*)npm run compositions-check(\s|$|&)/);
  });

  it('est nommé par un `node --test` du workflow CI, sur une étape NON commentée', () => {
    const ci = readFileSync(join(racine, '.github', 'workflows', 'ci.yml'), 'utf8');
    // Ancré en début de ligne (indentation seule autorisée avant `run:`) : le
    // motif non ancré de la version précédente matchait aussi bien une étape
    // COMMENTÉE (`      # run: node --test …`), qui n'exécute rien. Un banc
    // « câblé » dans un commentaire n'est pas câblé.
    assert.match(
      ci,
      /^[ \t]*run: node --test [^\n]*tools\/supplements\/compositions\/transporter\.test\.mjs/m,
    );
  });
});

describe('envoyerSerie', () => {
  it('un lot refusé arrête la série — le second lot n’est jamais envoyé', async () => {
    const lots = [[{ sourceIdentifiant: 'a' }], [{ sourceIdentifiant: 'b' }]];
    let appels = 0;
    const fetchImpl = async () => {
      appels += 1;
      return {
        ok: false,
        status: 422,
        json: async () => ({ error: 'produit inconnu du référentiel' }),
      };
    };

    await assert.rejects(
      () => envoyerSerie(lots, { url: 'http://exemple.test', secret: 'x'.repeat(32), fetchImpl }),
      (e) => {
        assert.ok(e instanceof EnvoiRefuse);
        assert.equal(e.rang, 1);
        assert.equal(e.total, 2);
        assert.match(e.message, /Lot 1\/2 refusé/);
        assert.match(e.message, /produit inconnu du référentiel/);
        return true;
      },
    );
    // Le fait générateur : un seul appel réseau, jamais deux.
    assert.equal(appels, 1);
  });

  it('le refus porte le cumul des lots PRÉCÉDENTS, sous un nom qui le dit', async () => {
    // Le champ s'appelait `bilanPartiel`, ce qui laissait croire qu'il disait
    // aussi ce que le lot refusé avait commité avant de s'arrêter — la route
    // n'en rend rien. Un nom qui promet plus que la valeur se paie à la
    // reprise.
    const lots = [[{ sourceIdentifiant: 'a' }], [{ sourceIdentifiant: 'b' }]];
    let n = 0;
    const fetchImpl = async () => {
      n += 1;
      return n === 1
        ? { ok: true, status: 200, json: async () => ({ resume: { produitsEcrits: 1, lignesCreees: 4 } }) }
        : { ok: false, status: 500, json: async () => ({ error: 'panne' }) };
    };

    await assert.rejects(
      () => envoyerSerie(lots, { url: 'http://exemple.test', secret: 'x'.repeat(32), fetchImpl }),
      (e) => {
        assert.equal(Object.hasOwn(e, 'bilanPartiel'), false);
        assert.equal(e.cumulLotsPrecedents.produitsEcrits, 1);
        assert.equal(e.cumulLotsPrecedents.lignesCreees, 4);
        return true;
      },
    );
  });

  it('un lot accepté laisse passer le suivant, et cumule le bilan', async () => {
    const lots = [[{ sourceIdentifiant: 'a' }], [{ sourceIdentifiant: 'b' }]];
    const appels = [];
    const fetchImpl = async (url, init) => {
      appels.push(JSON.parse(init.body).produits[0].sourceIdentifiant);
      return { ok: true, status: 200, json: async () => ({ resume: { produitsEcrits: 1, lignesCreees: 3 } }) };
    };

    const bilan = await envoyerSerie(lots, { url: 'http://exemple.test', secret: 'x'.repeat(32), fetchImpl });
    assert.deepEqual(appels, ['a', 'b']);
    assert.equal(bilan.produitsEcrits, 2);
    assert.equal(bilan.lignesCreees, 6);
    assert.equal(bilan.lotsEnvoyes, 2);
  });
});

describe('identifiantProduit', () => {
  it('utilise l’identifiant Compl’Alim numérique, comme la voie d’ingestion', () => {
    assert.equal(identifiantProduit({ produit: { idComplAlim: 42 }, sourceId: 'complalim-42' }), '42');
  });

  it('retombe sur sourceId si idComplAlim est absent — jamais un identifiant vide', () => {
    assert.equal(identifiantProduit({ produit: {}, sourceId: 'complalim-42' }), 'complalim-42');
  });
});

describe('formaterProduitPourEnvoi', () => {
  it('rend le contrat exact de parseCompositionsPayload, position par défaut = rang', () => {
    const p = formaterProduitPourEnvoi({
      sourceIdentifiant: '42',
      versionFormulation: 1,
      sourceLignes: 3,
      lignes: [
        { ingredientSourceIdentifiant: 'substance:348', formeSourceIdentifiant: null, doseParDjr: null, unite: null },
      ],
    });
    assert.deepEqual(p, {
      sourceIdentifiant: '42',
      versionFormulation: 1,
      sourceLignes: 3,
      lignes: [
        {
          ingredientSourceIdentifiant: 'substance:348',
          formeSourceIdentifiant: null,
          doseParDjr: null,
          unite: null,
          position: 0,
        },
      ],
    });
  });

  it('OMET versionFormulation quand l’opérateur ne l’a pas nommée', () => {
    // Le champ ABSENT fait résoudre au serveur la version courante. Envoyer 1
    // en dur écrirait sur la v1 d'un produit réingéré en v2 : succès compté,
    // fiche restée coquille, aucune erreur nulle part. `in` et non `=== null` —
    // un `null` explicite serait déjà une valeur, et le contrat est l'absence.
    const p = formaterProduitPourEnvoi({ sourceIdentifiant: '42', sourceLignes: 1, lignes: [] });
    assert.equal('versionFormulation' in p, false);
    assert.equal(JSON.stringify(p).includes('versionFormulation'), false);
  });

  it('conserve versionFormulation quand elle est explicitement demandée (cas de reprise)', () => {
    const p = formaterProduitPourEnvoi({
      sourceIdentifiant: '42',
      versionFormulation: 3,
      sourceLignes: 1,
      lignes: [],
    });
    assert.equal(p.versionFormulation, 3);
  });

  it('refuse une unité hors vocabulaire canonique plutôt que de l’envoyer telle quelle', () => {
    assert.throws(
      () =>
        formaterProduitPourEnvoi({
          sourceIdentifiant: '1',
          versionFormulation: 1,
          sourceLignes: 1,
          lignes: [{ ingredientSourceIdentifiant: 'substance:1', formeSourceIdentifiant: null, doseParDjr: 1, unite: 'cuillère' }],
        }),
      /hors vocabulaire canonique/,
    );
  });
});

describe('main — CLI', () => {
  it('--envoyer sans secret refuse avec exit 1, sans lire de fichier ni ouvrir de connexion', async () => {
    const codes = [];
    const erreurs = [];
    await main(['--envoyer', '--url', 'http://exemple.test'], {
      env: {},
      fetchImpl: async () => {
        throw new Error('ne doit jamais être appelé — dry-run ou refus attendu');
      },
      sortie: (c) => codes.push(c),
      stderr: (m) => erreurs.push(m),
      stdout: () => {},
    });
    assert.deepEqual(codes, [1]);
    assert.ok(erreurs.some((m) => /SUPPLEMENTS_INTERNAL_SECRET/.test(m)), erreurs.join('\n'));
  });

  it('--envoyer sans --url refuse aussi, même secret présent', async () => {
    const codes = [];
    const erreurs = [];
    await main(['--envoyer'], {
      env: { SUPPLEMENTS_INTERNAL_SECRET: 'x'.repeat(32) },
      fetchImpl: async () => {
        throw new Error('ne doit jamais être appelé');
      },
      sortie: (c) => codes.push(c),
      stderr: (m) => erreurs.push(m),
      stdout: () => {},
    });
    assert.deepEqual(codes, [1]);
    assert.ok(erreurs.some((m) => /--url/.test(m)), erreurs.join('\n'));
  });

  // ── Garde deux clés sur la cible (motif de `--base`, importNabm.ts) ────────
  //
  // `--url` seul est libre : une lettre de différence et ce sont 138 728
  // produits écrits en production sans qu'un mot l'annonce. Ces cas vérifient
  // que la concordance des DEUX clés est exigée, et qu'aucun refus n'ouvre de
  // connexion.
  //
  // LA CONTRE-CLÉ EST DANS L'ENVIRONNEMENT. Une première version demandait un
  // argument `--hote` : deux clés sur la même ligne de commande, la seconde
  // copiée de la première. Le modèle invoqué (`--base` dans importNabm.ts)
  // confronte l'argument à une VARIABLE D'ENVIRONNEMENT, et c'est ce qui le
  // fait tenir — la variable est posée dans le shell de la cible, une fois,
  // pas au moment où l'on tape la commande.
  describe('SUPPLEMENTS_TRANSPORT_HOTE — concordance exigée avec --url', () => {
    const secretOk = { SUPPLEMENTS_INTERNAL_SECRET: 'x'.repeat(32) };
    const jamais = async () => {
      throw new Error('aucun refus ne doit ouvrir de connexion');
    };

    async function refus(argv, env = secretOk) {
      const codes = [];
      const erreurs = [];
      await main(argv, {
        env,
        fetchImpl: jamais,
        sortie: (c) => codes.push(c),
        stderr: (m) => erreurs.push(m),
        stdout: () => {},
      });
      return { codes, erreurs: erreurs.join('\n') };
    }

    it('--envoyer --url sans SUPPLEMENTS_TRANSPORT_HOTE refuse, en nommant l’hôte visé', async () => {
      const { codes, erreurs } = await refus(['--envoyer', '--url', 'https://app.wellneuro.fr']);
      assert.deepEqual(codes, [1]);
      // Ancré sur « exige SUPPLEMENTS_TRANSPORT_HOTE », PAS sur le nom de la
      // variable nu : sans la clé absente, le refus retomberait sur la
      // comparaison, dont le message porte lui aussi ce nom et l'hôte visé. Le
      // test aurait alors été vert sans son correctif — mesuré, c'est arrivé au
      // premier jet de la version « --hote ».
      assert.match(erreurs, /exige SUPPLEMENTS_TRANSPORT_HOTE/);
      assert.match(erreurs, /app\.wellneuro\.fr/);
      assert.equal(/annonce/.test(erreurs), false, 'ce refus-ci n’est pas celui de la discordance');
    });

    it('un SUPPLEMENTS_TRANSPORT_HOTE qui ne correspond PAS à --url refuse, et nomme les deux', async () => {
      // Le cas que la revue a nommé : viser la production en croyant viser un
      // staging. Les deux valeurs sont imprimées — un refus qui ne dit pas
      // laquelle des deux clés est fausse ne se corrige pas.
      const { codes, erreurs } = await refus(
        ['--envoyer', '--url', 'https://app.wellneuro.fr'],
        { ...secretOk, SUPPLEMENTS_TRANSPORT_HOTE: 'staging.exemple.test' },
      );
      assert.deepEqual(codes, [1]);
      assert.match(erreurs, /staging\.exemple\.test/);
      assert.match(erreurs, /app\.wellneuro\.fr/);
      assert.match(erreurs, /deux cibles différentes/);
    });

    it('un ancien argument `--hote` ne vaut PAS la contre-clé : le refus tient', async () => {
      // La ligne de commande d'hier, rejouée telle quelle. Elle ne doit pas
      // passer : la contre-clé n'est plus un argument, et un `--hote` ignoré en
      // silence qui laisserait partir l'envoi serait le pire des deux mondes.
      const { codes, erreurs } = await refus([
        '--envoyer',
        '--url',
        'https://app.wellneuro.fr',
        '--hote',
        'app.wellneuro.fr',
      ]);
      assert.deepEqual(codes, [1]);
      assert.match(erreurs, /exige SUPPLEMENTS_TRANSPORT_HOTE/);
    });

    it('une --url illisible refuse au lieu d’être comparée à vide', async () => {
      const { codes, erreurs } = await refus(['--envoyer', '--url', 'app.wellneuro.fr'], {
        ...secretOk,
        SUPPLEMENTS_TRANSPORT_HOTE: 'app.wellneuro.fr',
      });
      assert.deepEqual(codes, [1]);
      assert.match(erreurs, /URL absolue/);
    });

    it('--version-formulation non entier ≥ 1 refuse au lieu de retomber sur la courante', async () => {
      const { codes, erreurs } = await refus(['--version-formulation', '0']);
      assert.deepEqual(codes, [1]);
      assert.match(erreurs, /--version-formulation/);
    });
  });

  describe('avec une petite fixture sur disque', () => {
    let dossier;
    let ficheChemin;
    let ficheDoublonChemin;
    let ficheDivergenteChemin;

    before(() => {
      dossier = mkdtempSync(join(tmpdir(), 'wn-transporter-'));
      // Référentiel minimal : une substance (vitamine C) avec une forme
      // d'apport (Acide L-ascorbique), au format attendu par
      // `projeterReferentiel` (voir referentiel/lib/projection.mjs).
      writeFileSync(
        join(dossier, 'ref-substances.ndjson'),
        `${JSON.stringify({ id: 348, name: 'vitamine C' })}\n`,
      );
      writeFileSync(
        join(dossier, 'ref-other-ingredients.ndjson'),
        `${JSON.stringify({ id: 1, name: 'Acide L-ascorbique', substances: [{ id: 348 }] })}\n`,
      );
      writeFileSync(join(dossier, 'ref-plants.ndjson'), '');
      writeFileSync(join(dossier, 'ref-microorganisms.ndjson'), '');

      ficheChemin = join(dossier, 'fiches.ndjson');
      const fiche = {
        sourceId: 'complalim-1',
        produit: { idComplAlim: 1 },
        composition: {
          plantes: [],
          microOrganismes: [],
          substances: [],
          nutriments: ['Acide L-ascorbique'],
          autresIngredientsActifs: [],
        },
      };
      writeFileSync(ficheChemin, `${JSON.stringify(fiche)}\n`);

      // Fichier SÉPARÉ : la même fiche, mais son actif déclaré DEUX FOIS (deux
      // colonnes de la source nommant le même ingrédient — 10 219 cas sur le
      // corpus réel). Séparé pour ne pas déplacer les chiffres du rapport
      // mesurés par les tests ci-dessus.
      //
      // DOUBLON IDENTIQUE : ni l'une ni l'autre ne porte de dose, les deux
      // lignes disent donc exactement la même chose. Rien n'est perdu.
      ficheDoublonChemin = join(dossier, 'fiches-doublon.ndjson');
      writeFileSync(
        ficheDoublonChemin,
        `${JSON.stringify({
          ...fiche,
          composition: { ...fiche.composition, nutriments: ['Acide L-ascorbique', 'Acide L-ascorbique'] },
        })}\n`,
      );

      // DOUBLON DIVERGENT — l'état que le banc ne visitait pas, et le défaut
      // que la contre-revue a rendu NO-GO. Deux colonnes différentes nomment le
      // même actif à des doses DIFFÉRENTES (100 mg en `substances`, 200 mg en
      // `nutriments`). La clé de doublon ne porte ni la dose ni l'unité, et
      // `resoudreLigneComposition` rend `forme: null` sur une résolution
      // « ingrédient direct » : les deux lignes tombent sur la même clé, la
      // seconde est écartée par la contrainte `@@unique([productId,
      // ingredientId, formeId])`, et 200 mg disparaissent. Le dénominateur doit
      // donc RESTER à 2 — sinon la fiche passe `integre` et l'écran sert
      // « Compatible » sur une dose totale sous-évaluée.
      ficheDivergenteChemin = join(dossier, 'fiches-divergentes.ndjson');
      writeFileSync(
        ficheDivergenteChemin,
        `${JSON.stringify({
          ...fiche,
          composition: {
            ...fiche.composition,
            substances: [{ nom: 'vitamine C', doseParDjr: 100, unite: 'mg' }],
            nutriments: [{ nom: 'vitamine C', doseParDjr: 200, unite: 'mg' }],
          },
        })}\n`,
      );
    });

    after(() => rmSync(dossier, { recursive: true, force: true }));

    it('--dry-run (défaut) n’ouvre AUCUNE connexion — preuve structurelle par fetch factice', async () => {
      let appele = false;
      const sorties = [];
      await main(['--fiches', ficheChemin, '--referentiel', dossier], {
        fetchImpl: async () => {
          appele = true;
          throw new Error('un dry-run ne doit jamais appeler fetch');
        },
        sortie: (c) => sorties.push(c),
        stderr: () => {},
        stdout: () => {},
      });
      assert.equal(appele, false);
      assert.deepEqual(sorties, []);
    });

    it('la mesure compte bien la fiche résolue comme « au moins une ligne résolue »', async () => {
      const lignes = [];
      await main(['--fiches', ficheChemin, '--referentiel', dossier], {
        fetchImpl: async () => {
          throw new Error('ne doit pas être appelé');
        },
        sortie: () => {},
        stderr: () => {},
        stdout: (m) => lignes.push(m),
      });
      const texte = lignes.join('\n');
      // Ancré sur LA phrase du chiffre, pas sur « **1** » n'importe où dans le
      // reste du rapport — un tableau de couverture porte d'autres « **1** »
      // légitimes (une seule ligne, une seule catégorie) qui rendraient un
      // compteur resté à zéro indétectable si le motif n'était pas ancré ici.
      assert.match(texte, /composition connue » : \*\*1\*\* \(100\.0 %\)\./);
      assert.match(texte, /Lots à transporter : 1/);
    });

    /**
     * Le corps réellement POSTé, capté par un `fetch` factice. C'est le seul
     * endroit du banc où l'on voit ce que le serveur recevrait — le reste
     * teste des fonctions pures, qui ne disent rien de leur assemblage.
     */
    async function capterEnvoi(fiches) {
      const corps = [];
      const entetes = [];
      const urls = [];
      const codes = [];
      const sorties = [];
      await main(
        [
          '--fiches',
          fiches,
          '--referentiel',
          dossier,
          '--envoyer',
          '--url',
          'https://transport.exemple.test',
        ],
        {
          env: {
            SUPPLEMENTS_INTERNAL_SECRET: 'x'.repeat(32),
            SUPPLEMENTS_TRANSPORT_HOTE: 'transport.exemple.test',
          },
          fetchImpl: async (url, init) => {
            urls.push(url);
            entetes.push(init.headers);
            corps.push(JSON.parse(init.body));
            return { ok: true, status: 200, json: async () => ({ resume: { produitsEcrits: 1, lignesCreees: 1 } }) };
          },
          sortie: (c) => codes.push(c),
          stderr: () => {},
          stdout: (m) => sorties.push(m),
        },
      );
      return { corps, entetes, urls, codes, rapport: sorties.join('\n') };
    }

    it('SUPPLEMENTS_TRANSPORT_HOTE concordant laisse partir l’envoi, et le corps N’ANNONCE AUCUNE version', async () => {
      const { corps, entetes, urls, codes } = await capterEnvoi(ficheChemin);
      assert.deepEqual(codes, []);
      assert.deepEqual(urls, ['https://transport.exemple.test/api/internal/supplements/compositions']);
      assert.equal(entetes[0].Authorization, `Bearer ${'x'.repeat(32)}`);

      const produit = corps[0].produits[0];
      assert.equal(corps[0].provenance, 'complalim');
      // Le fait générateur du correctif n°3 : rien ne fixe la version, donc le
      // serveur résout la courante. Un `1` ici serait l'échec silencieux.
      assert.equal('versionFormulation' in produit, false);
      assert.equal(produit.sourceIdentifiant, '1');
    });

    it('un doublon intra-fiche IDENTIQUE sort du DÉNOMINATEUR, pas seulement des lignes écrites', async () => {
      // Deux colonnes nommant le même actif, à la même dose (ici aucune) : une
      // seule ligne écrite — et `sourceLignes` à 1, pas à 2. À 2,
      // `lireCompletudeComposition(1, 2)` rendrait « partielle » et l'écran
      // annoncerait « les ingrédients non résolus restent invisibles » sur une
      // fiche entièrement résolue. Rien n'est perdu : le doublon ne disait rien
      // de plus que la ligne retenue.
      const { corps, rapport } = await capterEnvoi(ficheDoublonChemin);
      const produit = corps[0].produits[0];
      assert.equal(produit.lignes.length, 1);
      assert.equal(produit.sourceLignes, 1);
      assert.equal(produit.lignes.length, produit.sourceLignes, 'numérateur et dénominateur doivent coïncider');
      // Les deux nombres sont imprimés SÉPARÉMENT — c'est le chiffre qui
      // manquait pour juger, sur le corpus réel, des 10 219 doublons
      // intra-fiche.
      assert.match(rapport, /\*\*1 identiques\*\*/);
      assert.match(rapport, /\*\*0 divergentes\*\*/);
    });

    it('un doublon intra-fiche DIVERGENT reste au dénominateur — la fiche demeure « partielle »', async () => {
      // LE FAIT GÉNÉRATEUR, et le défaut que la contre-revue a rendu NO-GO.
      // « vitamine C » 100 mg en `substances` et 200 mg en `nutriments` :
      // même clé (ingrédient direct, forme `null`), doses différentes. La
      // seconde ligne est jetée — la contrainte `@@unique` l'impose, on ne peut
      // pas l'écrire — mais 200 mg sont perdus. Le dénominateur doit donc
      // rester à 2 : `lireCompletudeComposition(1, 2)` → « partielle ».
      //
      // À 1, on aurait `lignes.length === sourceLignes` → `integre` →
      // « Compatible » et « Aucun cumul » servis à un praticien sur une fiche
      // dont la dose totale est sous-évaluée de 200 mg. Et
      // `compositionSourceLignes` écrit faux ne se répare pas côté lignes :
      // l'append-only interdit de les reprendre.
      const { corps, rapport } = await capterEnvoi(ficheDivergenteChemin);
      const produit = corps[0].produits[0];
      assert.equal(produit.lignes.length, 1);
      assert.equal(produit.sourceLignes, 2, 'la dose perdue doit RESTER au dénominateur');
      assert.ok(
        produit.lignes.length < produit.sourceLignes,
        'numérateur < dénominateur : c’est ce qui rend la fiche « partielle » à l’écran',
      );
      // La ligne RETENUE est la première rencontrée, dans l'ordre des
      // catégories : `substances` avant `nutriments`, donc 100 mg.
      assert.equal(produit.lignes[0].doseParDjr, 100);
      assert.match(rapport, /\*\*0 identiques\*\*/);
      assert.match(rapport, /\*\*1 divergentes\*\*/);
    });
  });
});

// `tools/` est autonome et n'importe pas de TypeScript : `TAILLE_LOT_MAX` est
// une RECOPIE de `SUPPLEMENTS_MAX_BATCH_SIZE`. Une divergence doit casser ce
// banc, pas dormir jusqu'à un 422 en production — même motif que l'anti-dérive
// de `resolution.test.mjs` sur les unités.
describe('anti-dérive de la taille de lot', () => {
  it('TAILLE_LOT_MAX est identique à SUPPLEMENTS_MAX_BATCH_SIZE côté application', () => {
    const configTs = readFileSync(
      join(ICI, '..', '..', '..', 'web', 'src', 'lib', 'supplement-library', 'config.ts'),
      'utf8',
    );
    const bloc = /export const SUPPLEMENTS_MAX_BATCH_SIZE = (\d+);/.exec(configTs);
    assert.ok(bloc, 'SUPPLEMENTS_MAX_BATCH_SIZE introuvable dans config.ts — le banc doit être ajusté');
    assert.equal(TAILLE_LOT_MAX, Number(bloc[1]));
  });

  it('LIGNES_MAX_PAR_LOT est identique à la borne du serveur', () => {
    const compositionsTs = readFileSync(
      join(ICI, '..', '..', '..', 'web', 'src', 'lib', 'supplement-library', 'compositions.ts'),
      'utf8',
    );
    const bloc = /const LIGNES_MAX_PAR_LOT = (\d+);/.exec(compositionsTs);
    assert.ok(bloc, 'LIGNES_MAX_PAR_LOT introuvable dans compositions.ts — le banc doit être ajusté');
    assert.equal(LIGNES_MAX_PAR_LOT, Number(bloc[1]));
  });
});

// ── Anti-dérive du critère « fiche servie » ─────────────────────────────────
//
// `compositions.ts` cherche le produit « en version courante » et affirme, en
// commentaire comme au README, employer « exactement le critère » du catalogue.
// Il n'en posait qu'une des DEUX conditions : le pointeur, sans
// `statutFiche: { not: 'inactive' }`. Une composition écrite sur une fiche
// inactive était comptée en `produitsEcrits` et n'était jamais servie — l'échec
// silencieux que ce critère existe pour fermer.
//
// Ce banc lit LES DEUX FICHIERS. Il rougit si le critère du catalogue bouge sans
// que celui des compositions suive — même motif que l'anti-dérive de
// `TAILLE_LOT_MAX` ci-dessus, et pour la même raison : une recopie qui ne peut
// pas diverger en silence.
describe('anti-dérive du critère « fiche servie » (catalogue ↔ compositions)', () => {
  const libSrc = join(ICI, '..', '..', '..', 'web', 'src', 'lib', 'supplement-library');
  const lire = (nom) => readFileSync(join(libSrc, nom), 'utf8');

  /** Les clauses de `construireWhere`, sans commentaires ni espaces. */
  function clausesDuCatalogue() {
    const bloc = /const conditions: Prisma\.SupplementProductWhereInput\[\] = \[([\s\S]*?)\n {2}\];/.exec(
      lire('catalogue.ts'),
    );
    assert.ok(bloc, 'bloc `conditions` introuvable dans catalogue.ts — le banc doit être ajusté');
    return bloc[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('//'))
      .map((l) => l.replace(/,$/, '').replace(/\s+/g, ''));
  }

  it('le catalogue pose EXACTEMENT deux conditions — le pointeur ET le statut', () => {
    // Si une troisième apparaît, ce test rougit : c'est le signal qu'il faut la
    // reporter dans `compositions.ts` avant de le mettre à jour ici. Sans cette
    // borne, une condition ajoutée au catalogue laisserait `compositions.ts`
    // écrire sur des fiches que plus personne ne sert, en silence.
    assert.deepEqual(clausesDuCatalogue(), [
      '{versionCourante:{isNot:null}}',
      "{statutFiche:{not:'inactive'}}",
    ]);
  });

  it('`compositions.ts` honore les DEUX conditions du catalogue', () => {
    const compositionsTs = lire('compositions.ts');
    const clauses = clausesDuCatalogue();

    // 1. Le pointeur, posé tel quel dans le `where`.
    assert.ok(
      clauses.includes('{versionCourante:{isNot:null}}'),
      'le catalogue ne filtre plus par le pointeur — revoir compositions.ts',
    );
    assert.match(compositionsTs, /versionCourante: \{ isNot: null \}/);

    // 2. Le statut. Appliqué APRÈS la lecture, pour que la fiche inactive soit
    //    sautée ET NOMMÉE plutôt que confondue avec « aucune fiche en base ».
    //    Le critère est le même ; seul le moment de son application change.
    const statut = /\{statutFiche:\{not:'([a-z_]+)'\}\}/.exec(clauses.join('|'));
    assert.ok(statut, 'le catalogue ne filtre plus par statutFiche — revoir compositions.ts');
    assert.match(
      compositionsTs,
      new RegExp(`const STATUT_FICHE_NON_SERVIE = '${statut[1]}';`),
      `compositions.ts doit écarter le statut « ${statut[1]} », comme le catalogue`,
    );
    assert.match(compositionsTs, /enBase\.statutFiche === STATUT_FICHE_NON_SERVIE/);
  });
});

// Le serveur borne DEUX grandeurs. Ne borner que les produits produit des lots
// recevables en apparence et refusés en 422 — un aller-retour d'exploitation
// pour un défaut connu d'avance.
describe('découpage borné par produits ET par lignes', () => {
  // LES FIXTURES PARTENT DE LA SORTIE RÉELLE, et c'est un correctif de revue.
  // La version précédente fabriquait `{ identifiant, lignes }` à la main, une
  // forme que `formaterProduitPourEnvoi` ne produit nulle part : le test du
  // refus « par son NOM » était vert sans jamais visiter la forme réelle, alors
  // que le code lisait `produit.identifiant` et imprimait donc toujours
  // « (sans identifiant) ». Un banc qui invente ses données ne garde que
  // l'invention.
  const produit = (sourceIdentifiant, n) =>
    formaterProduitPourEnvoi({
      sourceIdentifiant,
      sourceLignes: n,
      lignes: Array.from({ length: n }, (_, i) => ({
        ingredientSourceIdentifiant: `substance:${i}`,
        formeSourceIdentifiant: null,
        doseParDjr: null,
        unite: null,
      })),
    });

  it('coupe sur la borne de lignes avant celle de produits', () => {
    // 10 produits de 600 lignes : la borne de produits (500) ne mordrait jamais,
    // celle des lignes (5000) coupe après le huitième.
    const produits = Array.from({ length: 10 }, (_, i) => produit(`P${i}`, 600));
    const { lots, refuses } = decouperEnLotsBornes(produits, 500, 5000);
    assert.equal(refuses.length, 0);
    assert.deepEqual(lots.map((l) => l.length), [8, 2]);
    for (const lot of lots) {
      const total = lot.reduce((n, p) => n + p.lignes.length, 0);
      assert.ok(total <= 5000, `un lot porte ${total} lignes, au-delà de la borne`);
    }
  });

  it('coupe sur la borne de produits quand les lignes sont rares', () => {
    const produits = Array.from({ length: 501 }, (_, i) => produit(`P${i}`, 1));
    const { lots } = decouperEnLotsBornes(produits, 500, 5000);
    assert.deepEqual(lots.map((l) => l.length), [500, 1]);
  });

  it('refuse par son NOM un produit qu\'aucun lot ne peut porter', () => {
    const produits = [produit('PETIT', 10), produit('MONSTRE', 5001), produit('AUTRE', 10)];
    const { lots, refuses } = decouperEnLotsBornes(produits, 500, 5000);
    // Le fait générateur : « MONSTRE », pas « (sans identifiant) ».
    assert.deepEqual(refuses, [{ identifiant: 'MONSTRE', lignes: 5001 }]);
    // Les autres passent quand même : un refus isolé n'arrête pas la série.
    assert.deepEqual(lots.map((l) => l.map((p) => p.sourceIdentifiant)), [['PETIT', 'AUTRE']]);
  });

  it('la forme réelle ne porte AUCUNE clé `identifiant` — seulement `sourceIdentifiant`', () => {
    // L'ancrage du correctif précédent : tant que cette assertion tient, lire
    // `produit.identifiant` dans `decouperEnLotsBornes` ne peut rendre
    // qu'`undefined`, donc « (sans identifiant) ».
    const p = produit('X', 1);
    assert.equal(Object.hasOwn(p, 'identifiant'), false);
    assert.equal(p.sourceIdentifiant, 'X');
  });

  it('ne perd aucun produit : transportés + refusés = reçus', () => {
    const produits = [produit('A', 4000), produit('B', 5001), produit('C', 2000), produit('D', 3500)];
    const { lots, refuses } = decouperEnLotsBornes(produits, 500, 5000);
    const transportes = lots.flat().length;
    assert.equal(transportes + refuses.length, produits.length);
  });
});
