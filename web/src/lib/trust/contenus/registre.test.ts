import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  getDocumentCourant,
  getVersion,
  PARTIES_REPRISES_CONDITIONS_V1,
  PARTIES_REPRISES_CONDITIONS_V2,
  PARTIES_REPRISES_CONDITIONS_V3,
  REGISTRE_DOCUMENTS_TRUST,
  sectionsDeLaPartie,
  VERSION_CONSENTEMENT_COURANTE,
} from './registre';

describe('registre des documents TRUST', () => {
  it('verrouille le hash de chaque version publiée — modifier un texte sans créer de version casse ce test', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      const recalcule = canonicalSha256({
        key: doc.key,
        version: doc.version,
        titre: doc.titre,
        resume: doc.resume,
        sections: doc.sections,
      });
      expect(recalcule, `${doc.key}@${doc.version}`).toBe(doc.hash);
    }
  });

  it('expose les trente-six documents attendus', () => {
    const cles = REGISTRE_DOCUMENTS_TRUST.map(d => `${d.key}@${d.version}`);
    expect(cles).toEqual([
      'cadre_accompagnement@v1',
      'limites_securite@v1',
      'donnees_confidentialite@v1',
      'donnees_confidentialite@v2',
      'donnees_confidentialite@v3',
      // Append-only : la v4 s'ajoute derrière la v3, qui garde sa place.
      'donnees_confidentialite@v4',
      'donnees_confidentialite@v5',
      'donnees_confidentialite@v6',
      // `D-167` — le rôle d'Anthropic s'élargit à la proposition de priorité.
      'donnees_confidentialite@v7',
      // Le dossier administratif : adresse, NIR, médecin traitant. Première
      // version de confidentialité à EXIGER un accusé depuis la v2 — les v3
      // à v7 décrivaient sans rien recueillir de neuf.
      'donnees_confidentialite@v8',
      // `D-222` amendé — la phrase qui promettait une garde que personne
      // n'avait posée devient exacte, et l'exception d'adressage est nommée.
      'donnees_confidentialite@v9',
      // `D-168` — le rôle d'Anthropic nomme aussi « Ce que j'ai compris de vous ».
      'donnees_confidentialite@v10',
      // `D-256` A4 — le compte rendu biologique déposé part entier chez Anthropic.
      'donnees_confidentialite@v11',
      // `D-258` — le compte rendu déposé n'est plus conservé : il est purgé.
      'donnees_confidentialite@v12',
      // `D-269` — le compte rendu déposé par le patient, et son écart.
      'donnees_confidentialite@v13',
      // `D-258` — les sauvegardes du compte rendu purgé, déclarées une fois leur durée établie.
      'donnees_confidentialite@v14',
      // `D-284` §5 — l'identité masquée avant l'envoi : le compte rendu ne part plus entier.
      'donnees_confidentialite@v15',
      // `D-284` §2 — le numéro de sécurité sociale n'est plus recueilli.
      'donnees_confidentialite@v16',
      // `D-284` §3 et §4 — la date de naissance demandée, et ce que son absence suspend.
      'donnees_confidentialite@v17',
      // D4 (`D-299`) — OpenAI nommé parmi les prestataires.
      'donnees_confidentialite@v18',
      // `D-330` (ACT-4) — la collecte documentaire, et la lecture datée de `D-297`.
      'donnees_confidentialite@v19',
      // `D-318` (b25) — ce qui reste d'un compte rendu après sa lecture.
      'donnees_confidentialite@v20',
      'usage_ia@v1',
      // `D-167` — la v1 disait « le seul usage actuel » ; il y en a deux.
      'usage_ia@v2',
      // `D-251` (2026-09-30) — la v2 était fausse sur trois points.
      'usage_ia@v3',
      // `D-256` A4 — le relevé des comptes rendus biologiques, déclaré avant activation.
      'usage_ia@v4',
      // `D-267` §8 — le relevé recopie aussi l'intervalle et la marque imprimés.
      'usage_ia@v5',
      // `D-269` §6 — le patient peut déposer lui-même ; rien n'est relevé avant la lecture.
      'usage_ia@v6',
      // `D-278` §3 — le relevé recopie aussi les commentaires imprimés.
      'usage_ia@v7',
      // `D-284` §5 — seules les pages masquées partent.
      'usage_ia@v8',
      'droits_patient@v1',
      'consentement_suivi@v2',
      // Même correction, dans le texte du consentement lui-même — l'occurrence
      // que `D-222` §3 n'avait pas vue.
      'consentement_suivi@v3',
      // `D-292` — les quatre textes d'information réunis, servis avec ACT-1.
      'conditions_utilisation@v1',
      // `D-292` §5 — la partie 3 passe à la v19 ; publiées avec ACT-4.
      'conditions_utilisation@v2',
      // `D-292` §5 — la partie 3 passe à la v20 (b25).
      'conditions_utilisation@v3',
    ]);
  });

  it('chaque version porte un résumé, au moins une section et une date de publication', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      expect(doc.resume.length).toBeGreaterThan(10);
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('getDocumentCourant retourne la version la plus récemment publiée et getVersion retrouve une version exacte', () => {
    expect(getDocumentCourant('consentement_suivi').version).toBe('v3');
    expect(getVersion('consentement_suivi', 'v3')?.hash).toBe(
      getDocumentCourant('consentement_suivi').hash,
    );
    expect(getVersion('consentement_suivi', 'v99')).toBeNull();
    expect(() => getDocumentCourant('inconnu' as never)).toThrow();
  });

  it('la version de consentement courante est celle du document consentement_suivi', () => {
    expect(VERSION_CONSENTEMENT_COURANTE).toBe('v3');
  });

  it("aucun document n'utilise le lexique interdit ni ne promet une surveillance", () => {
    const texte = JSON.stringify(REGISTRE_DOCUMENTS_TRUST).toLowerCase();
    for (const interdit of ['ordonnance', 'prescription', 'diagnostic médical établi', 'neuroscore', 'surveillance 24']) {
      expect(texte).not.toContain(interdit);
    }
    // « diagnostic » n'apparaît que dans des négations (« hors diagnostic », « pas de diagnostic »).
    const occurrences = texte.match(/[^«»]{30}diagnostic/g) ?? [];
    for (const contexte of occurrences) {
      expect(/n['’]établit pas|hors diagnostic|pas un diagnostic|ne constitue pas/.test(contexte)).toBe(true);
    }
  });

  it('le document servi ne nie plus la connexion patient par Google', () => {
    // LE DÉFAUT : la v3 écrivait « Google — connexion sécurisée du praticien
    // uniquement (jamais des patients) ». C'est une négation explicite, et elle
    // était fausse depuis le 2026-07-22 — la porte Google patient est ouverte
    // en production, relue par `env-get` le 2026-09-07.
    const courant = getDocumentCourant('donnees_confidentialite');
    // La version courante avance à chaque publication ; ce banc ne porte pas
    // sur son numéro mais sur ce que le document servi dit — l'assertion de
    // version n'est là que pour qu'un oubli de publication se voie.
    expect(courant.version).toBe('v20');
    const points = courant.sections.flatMap(sec => sec.points ?? []);
    expect(points.some(p => p.includes('jamais des patients'))).toBe(false);
    expect(points.some(p => p.includes('si vous le choisissez, votre propre connexion'))).toBe(true);
  });

  it('la v5 nomme Sentry, dit ce qu’il reçoit ET ce qu’il ne reçoit jamais', () => {
    // NOMMER UN PRESTATAIRE SANS DIRE CE QU'IL REÇOIT laisserait le patient
    // supposer le pire — ou le meilleur. Le dépôt refuse les deux :
    // `DOSSIER_RGPD.md:194` posait l'écart depuis le 2026-08-07, « soit il ne
    // traite aucune donnée personnelle et cela s'écrit, soit la liste patient
    // est incomplète et se corrige ». Elle se corrige.
    const courant = getDocumentCourant('donnees_confidentialite');
    const sentry = courant.sections.flatMap(s => s.points ?? []).find(p => p.startsWith('Sentry'));
    expect(sentry, 'Sentry absent de la liste des prestataires').toBeTruthy();
    expect(sentry).toContain('Union européenne');
    expect(sentry).toContain('jamais vos réponses');

    // Et la localisation est dite, pas seulement le nom.
    const hebergement = courant.sections.find(s => s.titre === 'Où sont hébergées vos données');
    expect(hebergement?.paragraphes.some(p => p.includes('région européenne'))).toBe(true);
  });

  it('À DATE ÉGALE, c’est la DERNIÈRE DÉCLARÉE qui est servie', () => {
    // Le piège que ce cas ferme : `getDocumentCourant` comparait avec `>=` et
    // gardait donc la PLUS ANCIENNE à date égale. Deux versions publiées le
    // même jour laissaient le patient sur le document périmé, sans signal.
    //
    // CE CAS A FAILLI S'ÉTEINDRE SANS BRUIT. Il s'écrivait « la v5 est servie
    // bien qu'elle partage sa date avec la v4 » — et la v6, publiée le
    // 2026-09-09, a pris la date maximale à elle seule : la paire à égalité
    // n'était plus sur le chemin de `getDocumentCourant`, le cas restait vert
    // en ne prouvant plus rien. Antidater la v6 pour le garder vivant aurait
    // été mentir sur la date de publication d'un document patient.
    //
    // Il est donc réécrit en PROPRIÉTÉ, vraie quel que soit le nombre de
    // versions : le document servi est le dernier déclaré parmi ceux qui
    // portent la date la plus récente. L'attente se dérive du registre, jamais
    // d'une copie de la comparaison qu'elle vérifie.
    const versions = REGISTRE_DOCUMENTS_TRUST.filter(d => d.key === 'donnees_confidentialite');
    const dateMax = [...versions].sort((a, b) => a.publieLe.localeCompare(b.publieLe)).at(-1)?.publieLe;
    const attendue = versions.filter(d => d.publieLe === dateMax).at(-1);
    expect(getDocumentCourant('donnees_confidentialite').version).toBe(attendue?.version);

    // La paire à égalité reste en place comme pièce à conviction : c'est elle
    // qui a révélé le défaut, et elle rougirait encore si `>=` revenait un jour
    // où la date maximale est partagée.
    const v4 = getVersion('donnees_confidentialite', 'v4');
    const v5 = getVersion('donnees_confidentialite', 'v5');
    expect(v4?.publieLe).toBe(v5?.publieLe);
    expect(versions.filter(d => d.publieLe === v4?.publieLe).at(-1)?.version).toBe('v5');
  });

  it('la v5 nomme le prestataire d’envoi et dit ce que les emails transportent', () => {
    // NOMMER LE PRESTATAIRE SANS DIRE CE QUE LES E-MAILS PORTENT aurait
    // fabriqué une nouvelle fausseté : `/portail/connexion` affirme « seule
    // votre adresse email est transmise — aucune donnée de santé », vrai de la
    // CONNEXION, et les deux surfaces se seraient lues ensemble comme
    // « Google, aucune donnée de santé ». Or le bilan validé part par ce relais.
    const points = getDocumentCourant('donnees_confidentialite').sections.flatMap(s => s.points ?? []);
    const envoi = points.find(p => p.startsWith('Google Workspace'));
    expect(envoi).toBeTruthy();
    expect(envoi).toContain('les documents que votre praticien vous adresse');
  });

  it('la v4 dit que les connexions sont enregistrées, là où elle invite à les signaler', () => {
    // Le document invitait à signaler « une connexion que vous ne reconnaissez
    // pas » sans dire nulle part que les connexions étaient enregistrées.
    const paragraphes = getDocumentCourant('donnees_confidentialite').sections.flatMap(s => s.paragraphes ?? []);
    expect(paragraphes.some(p => p.includes('enregistrées pendant douze mois'))).toBe(true);
  });

  it('les v3 à v7 ne redemandaient AUCUN accusé, et c’était la règle', () => {
    // LE PIÈGE QUE CET ITEM GARDE. `AvantDeCommencer` ne s'ajoute pas : il
    // REMPLACE la page. Exiger un accusé remet quatre écrans devant tous les
    // patients en cours — y compris celui qui note sa quatorzième nuit sur
    // vingt et une. Les v3 à v7 s'en dispensaient toutes pour le même motif :
    // elles DÉCRIVAIENT — un prestataire de plus, une catégorie déjà
    // recueillie, un usage qui s'élargit — sans rien recueillir de neuf.
    for (const version of ['v3', 'v4', 'v5', 'v6', 'v7']) {
      const doc = getVersion('donnees_confidentialite', version);
      expect(doc?.requiresAcknowledgement, version).toBe(false);
    }
  });

  it('les v8 ET v9 EXIGENT un accusé, pour deux motifs distincts', () => {
    // LA v8 NE DÉCRIT PAS, ELLE RECUEILLE. Trois données nouvelles entrent au
    // dossier — adresse postale, numéro de sécurité sociale, médecin traitant —
    // dont un NIR. Le mur d'écran que les cinq versions précédentes refusaient
    // d'ériger se justifie quand ce qui change n'est pas la description du
    // traitement mais son ASSIETTE. Arbitrage du responsable, 2026-09-16.
    expect(getVersion('donnees_confidentialite', 'v8')?.requiresAcknowledgement).toBe(true);

    // LA v9 NE RECUEILLE RIEN — elle corrige ce que le patient CROYAIT que son
    // refus produisait. C'est plus engageant, pas moins : il avait lu qu'aucun
    // partage n'aurait lieu sans son choix explicite, et c'était faux.
    // Arbitrage du responsable, 2026-09-17.
    expect(getVersion('donnees_confidentialite', 'v9')?.requiresAcknowledgement).toBe(true);
  });

  it('la v10 EXIGE un accusé, pour ne pas effacer celui de la v9 encore dû', () => {
    // LA v10 NE FAIT QUE DÉCRIRE — comme les v3 à v7, elle s'en serait
    // dispensée. Mais seule la version COURANTE réclame un accusé : une v10
    // sans accusé aurait effacé celui de la v9, que 23 dossiers actifs sur 28
    // devaient encore au 2026-09-30. Arbitrage du responsable, 2026-09-30.
    expect(getVersion('donnees_confidentialite', 'v10')?.requiresAcknowledgement).toBe(true);
  });

  it('la v10 nomme les trois usages d’Anthropic, et ni les fiches ni OpenAI parmi les prestataires', () => {
    // Lu sur la v10 elle-même : la v11 en ajoute un quatrième, que son banc garde.
    const points = getVersion('donnees_confidentialite', 'v10')?.sections.flatMap(s => s.points ?? []) ?? [];
    const anthropic = points.find(p => p.startsWith('Anthropic — '));
    expect(anthropic).toContain('préparation des synthèses');
    expect(anthropic).toContain('priorité de votre objectif');
    expect(anthropic).toContain('« Ce que j’ai compris de vous »');
    // L'adaptation des fiches ne traite aucune donnée personnelle : elle n'a
    // rien à faire dans la liste des prestataires qui en traitent.
    expect(points.some(p => p.startsWith('OpenAI'))).toBe(false);
  });

  it('la v3 du document IA dit les quatre usages, ses deux fournisseurs, et ne promet plus un usage « à venir » déjà servi', () => {
    // LE DÉFAUT QUE CE BANC FERME : la v2 présentait la proposition de priorité
    // ([[D-167]]) comme « avant sa mise en service », ignorait « Ce que j'ai
    // compris de vous » ([[D-168]]) et les fiches d'assiette ([[D-251]]), et
    // disait « Le fournisseur est Anthropic ».
    // Lu sur la v3 elle-même, et non sur le courant : la v4 l'a remplacée, et
    // ce banc doit continuer de prouver ce qu'elle corrigeait.
    const courant = getVersion('usage_ia', 'v3');
    expect(courant).not.toBeNull();
    if (!courant) return;
    const texte = courant.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texte).not.toContain('AVANT sa mise en service');
    expect(texte).not.toContain('Tant qu’il n’est pas ouvert');
    expect(texte).toContain('brouillon de la synthèse');
    expect(texte).toContain('priorité de votre objectif');
    expect(texte).toContain('« Ce que j’ai compris de vous »');
    expect(texte).toContain('fiches d’assiette');
    expect(texte).toContain('Anthropic rédige l’adaptation et OpenAI la relit');
    expect(texte).toContain('Aucune de vos données n’est utilisée pour cela');
    // Ce que l'IA ne fait jamais ne change pas.
    const jamais = (v: string) =>
      getVersion('usage_ia', v)?.sections.find(s => s.titre === 'Ce que l’IA ne fait jamais ici');
    expect(jamais('v3')).toEqual(jamais('v2'));
    // Document descriptif, non présenté par la séquence : aucun accusé.
    expect(courant.requiresAcknowledgement).toBe(false);
  });

  it('`D-256` A4 : les v7 et v14 déclaraient le compte rendu biologique transmis ENTIER à Anthropic (jusqu’à `D-284` §5)', () => {
    // LA CONDITION DE SORTIE DU LOT-02 DE BIO-INGEST : l'envoi d'un compte rendu
    // au sous-traitant IA est déclaré AVANT toute activation, et le document
    // ENTIER, identité comprise (arbitrage du 2026-10-01). Une mutation qui
    // retire « vous identifient » de l'un des deux textes rougit ici.
    // Ces versions ont été servies du 2026-10-11 au 2026-10-14 ; le banc de
    // `D-284` §5, plus bas, garde les versions COURANTES.
    const usageIa = getVersion('usage_ia', 'v7')!;
    const texteIa = usageIa.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texteIa).toContain('compte rendu que vous lui avez remis');
    expect(texteIa).toContain('aucune n’entre à votre dossier sans cette validation');
    expect(texteIa).toContain('y compris votre nom et les autres mentions qui vous identifient');
    expect(texteIa).toContain('Pour les quatre premiers usages, le fournisseur est Anthropic');
    expect(texteIa).not.toContain('trois premiers usages');
    // L'ORDRE PORTE LE SENS : « les quatre premiers usages » désigne ceux qui
    // envoient une donnée à Anthropic. Le relevé déplacé après les fiches
    // laisserait tous les `toContain` verts et donnerait les fiches à Anthropic seul.
    const ou = usageIa.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? [];
    expect(ou[3]).toMatch(/^Le relevé des résultats/);
    expect(ou[4]).toMatch(/^Les fiches d’assiette/);
    // Formulation durable : rien qui pourrisse à l'activation (le défaut de la v2).
    expect(texteIa).not.toContain('AVANT sa mise en service');
    expect(texteIa).not.toContain('Tant qu’il n’est pas ouvert');
    const jamais = (v: string) =>
      getVersion('usage_ia', v)?.sections.find(s => s.titre === 'Ce que l’IA ne fait jamais ici');
    expect(jamais('v4')).toEqual(jamais('v3'));
    expect(jamais('v5')).toEqual(jamais('v3'));
    expect(jamais('v6')).toEqual(jamais('v3'));
    expect(jamais('v7')).toEqual(jamais('v3'));
    expect(usageIa.requiresAcknowledgement).toBe(false);

    const donnees = getVersion('donnees_confidentialite', 'v14')!;
    const texteDonnees = donnees.sections.flatMap(s => s.paragraphes).join(' ');
    // La phrase de la v6 qui devenait fausse ne survit pas.
    expect(texteDonnees).not.toContain('Ces résultats sont saisis par votre praticien');
    expect(texteDonnees).toContain('déposer le compte rendu dans votre dossier');
    // La conservation du document était la promesse de la v11 ; la v12 la
    // remplace par sa purge (`D-258`), que son propre banc garde.
    const texteV11 = (getVersion('donnees_confidentialite', 'v11')?.sections ?? []).flatMap(s => s.paragraphes).join(' ');
    expect(texteV11).toContain('Le compte rendu déposé est conservé dans votre dossier');
    expect(texteDonnees).toContain('y compris votre nom et les autres mentions qui vous identifient, à Anthropic');
    const anthropic = donnees.sections.flatMap(s => s.points ?? []).find(p => p.startsWith('Anthropic — '));
    expect(anthropic).toContain('préparation des synthèses');
    expect(anthropic).toContain('priorité de votre objectif');
    expect(anthropic).toContain('« Ce que j’ai compris de vous »');
    expect(anthropic).toContain('comptes rendus de vos analyses biologiques');
    // Le banc v10 lit désormais la v10 seule : c'est ici que la ligne COURANTE
    // reste gardée contre les fiches, qui ne traitent aucune donnée personnelle.
    expect(anthropic).not.toContain('fiches');
    // Même motif que la v10 : sans accusé, celui de la v10 encore dû s'effaçait.
    expect(donnees.requiresAcknowledgement).toBe(true);
  });

  it('`D-258` : la v12 dit le compte rendu SUPPRIMÉ, et ne change rien d’autre', () => {
    // LA v11 DEVENAIT FAUSSE : « conservé dans votre dossier ». Le document est
    // purgé dès que chaque valeur relevée est décidée, au plus tard 30 jours
    // après le dépôt — les deux bornes doivent être dites, l'une sans l'autre
    // laisserait croire à une conservation indéfinie des lignes non décidées.
    const v11 = getVersion('donnees_confidentialite', 'v11');
    const v12 = getVersion('donnees_confidentialite', 'v12');
    expect(v12).not.toBeNull();
    if (!v12) return;
    const texte = v12.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texte).not.toContain('conservé dans votre dossier');
    expect(texte).toContain('Le compte rendu déposé est supprimé dès que votre praticien a validé ou écarté chacune des valeurs relevées lors de sa dernière lecture');
    expect(texte).toContain('au plus tard 30 jours après son dépôt');
    expect(texte).toContain('Les valeurs validées restent dans votre dossier');
    expect(texte).toContain('une empreinte du document, qui ne permet pas de le reconstituer');
    // Ce qui part chez Anthropic, et comment, ne change pas.
    expect(texte).toContain('y compris votre nom et les autres mentions qui vous identifient, à Anthropic');

    // UNE SEULE PHRASE CHANGE : toute autre section est celle de la v11, et
    // dans la section modifiée, tout paragraphe sauf un.
    const titre = 'Quelles données sont recueillies ?';
    expect(v12.sections.filter(s => s.titre !== titre)).toEqual(v11?.sections.filter(s => s.titre !== titre));
    const avant = v11?.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v12.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toHaveLength(avant.length);
    expect(apres.filter((p, i) => p !== avant[i])).toHaveLength(1);

    // Même motif que les v10 et v11 : sans accusé, celui de la v11 encore dû
    // s'effaçait.
    expect(v12.requiresAcknowledgement).toBe(true);
    expect(v12.publieLe >= (v11?.publieLe ?? '')).toBe(true);
  });

  it('`D-267` §8 : la v5 déclare l’intervalle et la marque recopiés tels qu’imprimés, sans rien en conclure', () => {
    // DÉCLARER AVANT DE RELEVER : `bio-extraction-v2` ne se déploie qu'une fois
    // cette version servie et constatée. Une mutation qui retire « tels que le
    // laboratoire les a imprimés » ou « lui-même » rougit ici.
    const v5 = getVersion('usage_ia', 'v5');
    expect(v5).not.toBeNull();
    if (!v5) return;
    const releve = (v: string) =>
      (getVersion('usage_ia', v)?.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? []).find(p =>
        p.startsWith('Le relevé des résultats'),
      ) ?? '';
    const texte = releve('v5');
    expect(texte).toContain('l’intervalle de référence et la marque d’anomalie tels que le laboratoire les a imprimés');
    expect(texte).toContain('recopiées sans être complétées ni reformulées');
    expect(texte).toContain('L’outil ne déclare lui-même aucune valeur normale ou anormale et n’en tire aucune conclusion');
    // Ce que la v4 déclarait reste déclaré : validation, document entier, identité.
    expect(texte).toContain('aucune n’entre à votre dossier sans cette validation');
    expect(texte).toContain('y compris votre nom et les autres mentions qui vous identifient');
    expect(releve('v4')).not.toContain('intervalle');
    // Seul le paragraphe du relevé change.
    const autres = (v: string) =>
      getVersion('usage_ia', v)?.sections.map(s =>
        s.titre === 'Où l’IA intervient'
          ? { ...s, paragraphes: s.paragraphes.filter(p => !p.startsWith('Le relevé des résultats')) }
          : s,
      );
    expect(autres('v5')).toEqual(autres('v4'));
    expect(v5.requiresAcknowledgement).toBe(false);
    // « Vos données personnelles » est restée en v12 (`D-267` §8) : aucun accusé
    // nouveau avec la v5. La v13 ne vient qu'avec `D-269`, après.
    expect(getVersion('donnees_confidentialite', 'v12')?.publieLe).toBe('2026-10-02');
    expect((getVersion('donnees_confidentialite', 'v13')?.publieLe ?? '') > v5.publieLe).toBe(true);
  });

  it('`D-269` §6 : la v6 et la v13 disent le dépôt par le patient, mot pour mot comme validées, et rien d’autre', () => {
    // TEXTES VALIDÉS PAR LE RESPONSABLE LE 2026-10-07 (`DOSSIER_RGPD.md` §2 ter).
    // Une reformulation, même juste, rougit ici : ce qui est servi est ce qui a
    // été validé.
    const v5 = getVersion('usage_ia', 'v5');
    const v6 = getVersion('usage_ia', 'v6');
    if (!v6) throw new Error('v6 absente du registre');
    const releve = (doc: typeof v5) =>
      (doc?.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? []).find(p =>
        p.startsWith('Le relevé des résultats'),
      ) ?? '';
    const texteIa = releve(v6);
    expect(texteIa).toContain(
      'lorsque votre praticien dépose dans votre dossier le compte rendu que vous lui avez remis, ou que vous l’y déposez vous-même depuis votre espace,',
    );
    expect(texteIa).toContain(
      'Si vous le déposez vous-même, rien n’en est relevé tant que votre praticien n’a pas lancé la lecture : il vérifie d’abord qu’il s’agit bien de votre compte rendu.',
    );
    // Ce qui part alors, et la validation, restent dits.
    expect(texteIa).toContain('y compris votre nom et les autres mentions qui vous identifient');
    expect(texteIa).toContain('aucune n’entre à votre dossier sans cette validation');
    // Seul le paragraphe du relevé change.
    const autres = (doc: typeof v5) =>
      doc?.sections.map(s =>
        s.titre === 'Où l’IA intervient'
          ? { ...s, paragraphes: s.paragraphes.filter(p => !p.startsWith('Le relevé des résultats')) }
          : s,
      );
    expect(autres(v6)).toEqual(autres(v5));
    // L'accusé de la v6 est recueilli sur l'écran de dépôt, pas dans la séquence
    // « Avant de commencer » — qui bouclerait (`avantDeCommencer.ts`).
    expect(v6.requiresAcknowledgement).toBe(false);

    const v12 = getVersion('donnees_confidentialite', 'v12');
    const v13 = getVersion('donnees_confidentialite', 'v13');
    if (!v13) throw new Error('v13 absente du registre');
    const texte = v13.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texte).toContain(
      'les éléments de votre situation que vous décrivez, les comptes rendus d’analyses que vous déposez dans votre espace, vos signalements et vos choix.',
    );
    expect(texte).toContain(
      'chacune des valeurs relevées lors de sa dernière lecture, ou dès qu’il l’écarte, s’il est illisible ou s’il ne s’agit pas de votre compte rendu, et au plus tard 30 jours après son dépôt.',
    );
    // DEUX PARAGRAPHES CHANGENT, dans une seule section ; le reste est la v12.
    const titre = 'Quelles données sont recueillies ?';
    expect(v13.sections.filter(s => s.titre !== titre)).toEqual(v12?.sections.filter(s => s.titre !== titre));
    const avant = v12?.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v13.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toHaveLength(avant.length);
    expect(apres.filter((p, i) => p !== avant[i])).toHaveLength(2);
    // Même motif que les v10 à v12 : sans accusé, celui de la v12 encore dû s'effaçait.
    expect(v13.requiresAcknowledgement).toBe(true);
  });

  it('`D-258` : la v14 dit les sauvegardes du compte rendu purgé, mot pour mot comme validée, et rien d’autre', () => {
    // TEXTE VALIDÉ PAR LE RESPONSABLE LE 2026-10-10 (`DOSSIER_RGPD.md`,
    // rubrique 8). D-258 différait l'annonce jusqu'à ce que la rétention des
    // sauvegardes soit établie : 12 mois, sauvegardes mensuelles de l'hébergeur.
    const v13 = getVersion('donnees_confidentialite', 'v13');
    const v14 = getVersion('donnees_confidentialite', 'v14')!;
    const texte = v14.sections.flatMap(s => s.paragraphes).join(' ');
    expect(texte).toContain(
      'et au plus tard 30 jours après son dépôt. Des copies peuvent en subsister jusqu’à 12 mois après sa suppression dans les sauvegardes de notre hébergeur, qui ne servent qu’à rétablir le service en cas d’incident ; elles s’effacent ensuite d’elles-mêmes. Les valeurs validées restent dans votre dossier.',
    );
    // UN SEUL PARAGRAPHE CHANGE, dans une seule section ; le reste est la v13.
    const titre = 'Quelles données sont recueillies ?';
    expect(v14.sections.filter(s => s.titre !== titre)).toEqual(v13?.sections.filter(s => s.titre !== titre));
    const avant = v13?.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v14.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toHaveLength(avant.length);
    expect(apres.filter((p, i) => p !== avant[i])).toHaveLength(1);
    expect((v14.publieLe ?? '') > (v13?.publieLe ?? '')).toBe(true);
    // Même motif que les v10 à v13 : sans accusé, celui de la v13 encore dû s'effaçait.
    expect(v14.requiresAcknowledgement).toBe(true);
  });

  it('`D-278` §3 : la v7 déclare les commentaires recopiés et conservés, mot pour mot comme validée, et rien d’autre', () => {
    // TEXTE VALIDÉ PAR LE RESPONSABLE LE 2026-10-11. DÉCLARER AVANT DE
    // RELEVER : `bio-extraction-v4` ne se déploie qu'une fois cette version
    // servie et constatée. Une reformulation, même juste, rougit ici.
    const v6 = getVersion('usage_ia', 'v6');
    const v7 = getVersion('usage_ia', 'v7')!;
    const releve = (doc: typeof v6) =>
      (doc?.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? []).find(p =>
        p.startsWith('Le relevé des résultats'),
      ) ?? '';
    const texte = releve(v7);
    // LE PARAGRAPHE ENTIER, littéral indépendant du registre (revue Copilot de
    // #1398) : une insertion ou une reformulation ailleurs rougit ici.
    expect(texte).toBe(
      'Le relevé des résultats de vos analyses biologiques : lorsque votre praticien dépose dans votre dossier le compte rendu que vous lui avez remis, ou que vous l’y déposez vous-même depuis votre espace, l’outil en relève les valeurs, leurs unités et la date du prélèvement, ainsi que l’intervalle de référence, la marque d’anomalie et les commentaires tels que le laboratoire les a imprimés, et les lui propose. Si vous le déposez vous-même, rien n’en est relevé tant que votre praticien n’a pas lancé la lecture : il vérifie d’abord qu’il s’agit bien de votre compte rendu. Votre praticien les relit et les valide : aucune n’entre à votre dossier sans cette validation. Ces mentions du laboratoire sont recopiées sans être complétées ni reformulées ; les commentaires restent dans votre dossier, même après la suppression du compte rendu. L’outil ne déclare lui-même aucune valeur normale ou anormale et n’en tire aucune conclusion. Pour cela, le compte rendu est transmis en entier, y compris votre nom et les autres mentions qui vous identifient.',
    );
    // Le résumé du changement montré au patient, validé avec le texte.
    expect(v7.changeSummary).toBe(
      'Le relevé des comptes rendus de vos analyses biologiques s’étend : l’outil recopie aussi les commentaires imprimés par le laboratoire, sans les compléter ni les reformuler. Votre praticien les voit quand il relit les résultats, et ils restent dans votre dossier après la suppression du compte rendu. L’outil ne déclare toujours lui-même aucune valeur normale ou anormale et n’en tire aucune conclusion. Rien d’autre ne change.',
    );
    expect(texte).toContain(
      'ainsi que l’intervalle de référence, la marque d’anomalie et les commentaires tels que le laboratoire les a imprimés,',
    );
    expect(texte).toContain(
      'Ces mentions du laboratoire sont recopiées sans être complétées ni reformulées ; les commentaires restent dans votre dossier, même après la suppression du compte rendu.',
    );
    expect(texte).not.toContain('Ces deux mentions');
    // Ce qui était déclaré le reste : conclusion refusée, validation, dépôt, identité.
    expect(texte).toContain('L’outil ne déclare lui-même aucune valeur normale ou anormale et n’en tire aucune conclusion');
    expect(texte).toContain('aucune n’entre à votre dossier sans cette validation');
    expect(texte).toContain('rien n’en est relevé tant que votre praticien n’a pas lancé la lecture');
    expect(texte).toContain('y compris votre nom et les autres mentions qui vous identifient');
    // Seul le paragraphe du relevé change.
    const autres = (doc: typeof v6) =>
      doc?.sections.map(s =>
        s.titre === 'Où l’IA intervient'
          ? { ...s, paragraphes: s.paragraphes.filter(p => !p.startsWith('Le relevé des résultats')) }
          : s,
      );
    expect(autres(v7)).toEqual(autres(v6));
    expect(v7.publieLe > (v6?.publieLe ?? '')).toBe(true);
    // L'accusé se recueille sur l'écran de dépôt, comme pour la v6.
    expect(v7.requiresAcknowledgement).toBe(false);
  });

  it('`D-284` §5 : les v8 et v15 disent l’identité masquée avant l’envoi, mot pour mot comme validées, et rien d’autre', () => {
    // TEXTES VALIDÉS PAR LE RESPONSABLE LE 2026-10-14, publiés après le
    // déploiement constaté de l'écran de masquage (#1428). Une phrase change
    // dans chacun des deux documents ; une reformulation rougit ici.
    const v7 = getVersion('usage_ia', 'v7');
    const v8 = getDocumentCourant('usage_ia');
    expect(v8.version).toBe('v8');
    const releve = (doc: typeof v7) =>
      (doc?.sections.find(s => s.titre === 'Où l’IA intervient')?.paragraphes ?? []).find(p =>
        p.startsWith('Le relevé des résultats'),
      ) ?? '';
    expect(releve(v8)).toBe(releve(v7).replace(
      'Pour cela, le compte rendu est transmis en entier, y compris votre nom et les autres mentions qui vous identifient.',
      'Pour cela, votre praticien masque d’abord à l’écran, sur chaque page, votre nom et les autres mentions qui vous identifient : seules les pages ainsi masquées sont transmises, jamais le compte rendu d’origine. Ce masquage est fait à la main, par votre praticien.',
    ));
    expect(releve(v8)).not.toContain('transmis en entier');
    expect(releve(v8).endsWith('Pour cela, votre praticien masque d’abord à l’écran, sur chaque page, votre nom et les autres mentions qui vous identifient : seules les pages ainsi masquées sont transmises, jamais le compte rendu d’origine. Ce masquage est fait à la main, par votre praticien.')).toBe(true);
    const autresIa = (doc: typeof v7) =>
      doc?.sections.map(s =>
        s.titre === 'Où l’IA intervient'
          ? { ...s, paragraphes: s.paragraphes.filter(p => !p.startsWith('Le relevé des résultats')) }
          : s,
      );
    expect(autresIa(v8)).toEqual(autresIa(v7));
    expect(v8.publieLe > (v7?.publieLe ?? '')).toBe(true);
    expect(v8.requiresAcknowledgement).toBe(false);

    const v14 = getVersion('donnees_confidentialite', 'v14');
    const v15 = getVersion('donnees_confidentialite', 'v15')!;
    expect(v15.version).toBe('v15');
    const titre = 'Quelles données sont recueillies ?';
    const avant = v14?.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v15.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toEqual(avant.map(p => p.replace(
      'Pour en relever les valeurs, le compte rendu est transmis en entier, y compris votre nom et les autres mentions qui vous identifient, à Anthropic, prestataire nommé plus bas.',
      'Pour en relever les valeurs, des images de ses pages sont transmises à Anthropic, prestataire nommé plus bas, après que votre praticien y a masqué à l’écran votre nom et les autres mentions qui vous identifient ; le compte rendu d’origine n’est jamais transmis.',
    )));
    expect(apres.filter((p, i) => p !== avant[i])).toHaveLength(1);
    expect(apres.join(' ')).toContain('Pour en relever les valeurs, des images de ses pages sont transmises à Anthropic, prestataire nommé plus bas, après que votre praticien y a masqué à l’écran votre nom et les autres mentions qui vous identifient ; le compte rendu d’origine n’est jamais transmis.');
    expect(apres.join(' ')).not.toContain('transmis en entier');
    expect(v15.sections.filter(s => s.titre !== titre)).toEqual(v14?.sections.filter(s => s.titre !== titre));
    expect(v15.publieLe > (v14?.publieLe ?? '')).toBe(true);
    // Même motif que les v10 à v14 : sans accusé, celui de la v14 encore dû s'effaçait.
    expect(v15.requiresAcknowledgement).toBe(true);

    // Le résumé montré au patient, validé avec les textes.
    for (const doc of [v8, v15]) {
      expect(doc.changeSummary).toBe(
        'Le compte rendu de vos analyses biologiques n’est plus transmis en entier : votre praticien masque d’abord à l’écran votre nom et les autres mentions qui vous identifient, et seules les pages ainsi masquées sont transmises pour en relever les valeurs. Le reste ne change pas.',
      );
    }
  });

  it('la v9 RETIRE la promesse que le logiciel ne tenait pas, et NOMME l’exception', () => {
    // LE DÉFAUT QUE CE BANC FERME, et il a coûté huit versions : « Aucun
    // partage avec un tiers (par exemple votre médecin traitant) n'a lieu sans
    // un choix explicite de votre part » était écrit depuis la v1 et repris par
    // composition. `D-222` §3 l'a nommé sans le toucher.
    //
    // UNE MUTATION QUI FERAIT ROUGIR CE BANC : réintroduire la phrase d'origine
    // dans une v10 par copie de la v8, ou publier l'exception sans la nommer.
    const texte = getDocumentCourant('donnees_confidentialite')
      .sections.flatMap(s => s.paragraphes ?? [])
      .join(' ');

    expect(texte).not.toContain('Aucun partage avec un tiers');
    expect(texte).not.toContain('Rien ne lui est adressé sans un choix explicite');

    // Ce que le logiciel fait, et ce qu'il ne fait pas.
    expect(texte).toContain('L’application n’envoie rien à un tiers');
    expect(texte).toContain('aucun canal vers un médecin');
    // L'exception, nommée — un texte qui la tairait re-promettrait la garde.
    expect(texte).toContain('votre sécurité lui impose d’écrire à un médecin malgré votre refus');
    expect(texte).toContain('Il vous en informe alors');
  });

  it('la v3 du consentement porte la MÊME correction — l’occurrence que D-222 §3 n’avait pas vue', () => {
    // `D-222` §3 ne nommait que les huit versions de « Vos données
    // personnelles » et l'écran « Mes choix ». Le texte du consentement portait
    // la même promesse — et c'est le plus engageant des trois, puisque c'est
    // celui que le patient lit AU MOMENT où il consent.
    const texte = getDocumentCourant('consentement_suivi')
      .sections.flatMap(s => s.paragraphes ?? [])
      .join(' ');
    expect(texte).not.toContain('ni partagées avec un tiers sans un choix explicite');
    expect(texte).toContain('L’application ne les partage avec aucun tiers');
    expect(texte).toContain('il peut s’en écarter lorsque votre sécurité l’exige');

    // PAS D'ACCUSÉ PROPRE, et c'est délibéré : la séquence « Avant de
    // commencer » ne présente pas ce document. L'accusé de la v9 couvre le
    // fait, qui est un seul. Exiger un accusé ici ferait boucler le patient —
    // `avantDeCommencer.ts` porte le piège en toutes lettres.
    expect(getDocumentCourant('consentement_suivi').requiresAcknowledgement).toBe(false);
  });

  it('la v8 NOMMAIT les trois renseignements, et disait qu’ils sont facultatifs', () => {
    // UN ACCUSÉ SUR UN TEXTE QUI NE DIT PAS CE QUI CHANGE N'EST QU'UNE
    // FORMALITÉ. Le patient doit lire les trois données en toutes lettres, et
    // lire aussi qu'il peut les refuser — sans quoi « exiger un accusé »
    // revient à faire cliquer sur une porte fermée.
    const paragraphes = (getVersion('donnees_confidentialite', 'v8')?.sections ?? []).flatMap(
      s => s.paragraphes ?? [],
    );
    const texte = paragraphes.join(' ');
    expect(texte).toContain('adresse postale');
    expect(texte).toContain('numéro de sécurité sociale');
    expect(texte).toContain('médecin traitant');
    expect(texte).toContain('n’est obligatoire');
    // Noter un médecin n'est pas lui écrire : la confusion serait grave.
    expect(texte).toContain('ne veut pas dire lui écrire');
  });

  it('`D-284` §2 : la v16 dit le numéro de sécurité sociale non recueilli, mot pour mot, et rien d’autre', () => {
    // LE CHAMP A QUITTÉ LA FICHE DU PRATICIEN (lot g). Le texte servi au
    // patient ne peut plus dire que son praticien le tient. Une seule section
    // change ; une reformulation rougit ici.
    const v15 = getVersion('donnees_confidentialite', 'v15')!;
    const v16 = getVersion('donnees_confidentialite', 'v16')!;
    expect(v16.version).toBe('v16');
    const titre = 'Quelles données sont recueillies ?';
    const avant = v15.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v16.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toHaveLength(avant.length);
    expect(apres.filter((p, i) => p !== avant[i])).toHaveLength(2);
    const texte = apres.join(' ');
    expect(texte).toContain(
      'des renseignements administratifs qu’il saisit lui-même : votre adresse postale, et le nom et les coordonnées de votre médecin traitant. Votre numéro de sécurité sociale, lui, n’est pas recueilli.',
    );
    expect(texte).toContain('Aucun de ces renseignements n’est obligatoire');
    expect(texte).not.toContain('votre numéro de sécurité sociale, et le nom');
    expect(texte).not.toContain('trois renseignements');
    expect(v16.sections.filter(s => s.titre !== titre)).toEqual(v15.sections.filter(s => s.titre !== titre));
    // Seule la version courante réclame un accusé : sans le sien, celui de la
    // v15, dû par tous les dossiers actifs, s'effaçait.
    expect(v16.requiresAcknowledgement).toBe(true);
    expect(v16.publieLe >= v15.publieLe).toBe(true);
  });

  it('`D-284` §3 et §4 : la v17 nomme la date de naissance et la pause, mot pour mot, et rien d’autre', () => {
    // UN SEUL PARAGRAPHE AJOUTÉ, juste après les renseignements administratifs.
    const v16 = getVersion('donnees_confidentialite', 'v16')!;
    const v17 = getVersion('donnees_confidentialite', 'v17')!;
    expect(v17.version).toBe('v17');
    const titre = 'Quelles données sont recueillies ?';
    const avant = v16.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    const apres = v17.sections.find(s => s.titre === titre)?.paragraphes ?? [];
    expect(apres).toHaveLength(avant.length + 1);
    const i = apres.findIndex(p => p.startsWith('Votre praticien tient aussi'));
    expect(apres[i + 1]).toBe(
      'Votre dossier porte aussi votre date de naissance. Si elle manque, elle vous est demandée à votre connexion : elle sert à vérifier votre âge, car jusqu’à 18 ans l’accompagnement suit un cadre particulier. Tant qu’elle n’est pas indiquée, vos questionnaires et l’envoi de vos analyses biologiques sont en pause. Une fois enregistrée, seul votre praticien peut la corriger.',
    );
    expect([...apres.slice(0, i + 1), ...apres.slice(i + 2)]).toEqual(avant);
    expect(v17.sections.filter(s => s.titre !== titre)).toEqual(v16.sections.filter(s => s.titre !== titre));
    // Même motif que la v16 : sans le sien, l'accusé de la v16 s'effaçait.
    expect(v17.requiresAcknowledgement).toBe(true);
    expect(v17.publieLe >= v16.publieLe).toBe(true);
  });

  it('D4 (`D-299`) : la v18 nomme OpenAI après Anthropic, mot pour mot, et rien d’autre', () => {
    // UNE SEULE LIGNE AJOUTÉE à la liste des prestataires. Elle dit ce que le
    // flux reçoit réellement (`rag/embeddings.ts`) : le texte de la recherche et
    // celui des références à indexer, jamais le dossier.
    const v17 = getVersion('donnees_confidentialite', 'v17')!;
    const v18 = getVersion('donnees_confidentialite', 'v18')!;
    expect(v18.version).toBe('v18');
    const titre = 'Quels prestataires techniques interviennent ?';
    const avant = v17.sections.find(s => s.titre === titre)?.points ?? [];
    const apres = v18.sections.find(s => s.titre === titre)?.points ?? [];
    expect(apres).toHaveLength(avant.length + 1);
    const i = apres.findIndex(p => p.startsWith('Anthropic — '));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(apres[i + 1]).toBe(
      'OpenAI — aide à la recherche de votre praticien dans sa bibliothèque de références scientifiques : ce service reçoit le texte de la recherche que votre praticien saisit et le texte des références à indexer ; l’application ne lui envoie ni votre dossier, ni vos réponses, ni vos documents : seul ce que votre praticien écrit dans sa recherche lui parvient',
    );
    expect([...apres.slice(0, i + 1), ...apres.slice(i + 2)]).toEqual(avant);
    expect(v18.sections.filter(s => s.titre !== titre)).toEqual(v17.sections.filter(s => s.titre !== titre));
    // Même motif que la v17 : sans le sien, l'accusé de la v17 s'effaçait.
    expect(v18.requiresAcknowledgement).toBe(true);
    expect(v18.publieLe >= v17.publieLe).toBe(true);
  });

  // LE TEXTE PUBLIÉ FACE AU TEXTE VALIDÉ ([[D-330]], amendement du 2026-10-20).
  // L'attendu se lit dans la proposition validée, à l'apostrophe typographique
  // du registre près : la citation qui suit un titre, lignes recollées.
  const PROPOSITION_ACT4 = path.resolve(
    __dirname,
    '../../../../../docs/claude/propositions/2026-10-20-act4-textes/README.md',
  );
  function citations(apres: string): string[] {
    const readme = fs.readFileSync(PROPOSITION_ACT4, 'utf8').replaceAll("'", '’');
    const suite = readme.slice(readme.indexOf(apres) + apres.length);
    const section = suite.slice(0, suite.search(/\n#{2,3} /) === -1 ? undefined : suite.search(/\n#{2,3} /));
    return section
      .split(/\n\s*\n/)
      .map(bloc => bloc.trim())
      .filter(bloc => bloc.startsWith('>'))
      .map(bloc =>
        bloc
          .split('\n')
          .map(ligne => ligne.replace(/^>\s?/, '').trim())
          .join(' ')
          .replaceAll('**', ''),
      );
  }

  it('`D-330` (ACT-4) : la v19 dit la collecte et la lecture datée, mot pour mot, et rien d’autre', () => {
    const v18 = getVersion('donnees_confidentialite', 'v18')!;
    const v19 = getVersion('donnees_confidentialite', 'v19')!;
    expect(v19.version).toBe('v19');
    const [, paragrapheNeuf] = citations('### A3. « Vos données personnelles » v19');
    const [phraseLecture] = citations('### B1. Correction de la phrase sur la lecture datée (A3)');

    // 1. « et les autres documents » au premier paragraphe, rien d'autre.
    const recueil = 'Quelles données sont recueillies ?';
    const avant = v18.sections.find(s => s.titre === recueil)!.paragraphes;
    const apres = v19.sections.find(s => s.titre === recueil)!.paragraphes;
    expect(apres[0]).toBe(
      avant[0].replace('les comptes rendus d’analyses que', 'les comptes rendus d’analyses et les autres documents que'),
    );
    expect(apres[0]).not.toBe(avant[0]);
    // 2. Le paragraphe validé, juste après le dernier du compte rendu biologique.
    const i = apres.findIndex(p => p.startsWith('Ces informations comptent parmi les plus sensibles'));
    expect(apres[i + 1]).toBe(paragrapheNeuf);
    expect([...apres.slice(1, i + 1), ...apres.slice(i + 2)]).toEqual(avant.slice(1));
    // 3. La phrase de la lecture datée, à la suite du journal des connexions.
    const incident = 'Signaler un incident de confidentialité';
    const p18 = v18.sections.find(s => s.titre === incident)!.paragraphes;
    const p19 = v19.sections.find(s => s.titre === incident)!.paragraphes;
    expect(p19).toEqual([p18[0], `${p18[1]} ${phraseLecture}`]);
    // Rien d'autre ne bouge.
    const autres = (doc: typeof v18) => doc.sections.filter(s => s.titre !== recueil && s.titre !== incident);
    expect(autres(v19)).toEqual(autres(v18));
    expect(v19.requiresAcknowledgement).toBe(true);
    expect(v19.publieLe >= v18.publieLe).toBe(true);
    expect(v19.changeSummary).toBe(citations('### B2. Résumé de la v19 (historique des versions)')[0]);
  });

  // b25 (D-318) : texte validé par le responsable le 2026-10-24, en session.
  // La v12 disait garder « valeurs relevées et décisions » ; la purge à 30 jours
  // efface les valeurs écartées ou sans décision (`purge.ts`).
  it('la v20 dit ce qui reste d’un compte rendu après sa lecture, mot pour mot, et rien d’autre', () => {
    const v19 = getVersion('donnees_confidentialite', 'v19')!;
    const v20 = getDocumentCourant('donnees_confidentialite');
    expect(v20.version).toBe('v20');
    const ancienne =
      'Pour savoir d’où vient chaque résultat, nous conservons une empreinte du document, qui ne permet pas de le reconstituer, et la trace de sa lecture : outil utilisé, valeurs relevées et décisions.';
    const nouvelle =
      'Pour savoir d’où vient chaque résultat, nous conservons la date du dépôt et une empreinte du document, qui ne permet pas de le reconstituer. Pour chaque valeur validée, nous gardons aussi la trace de sa lecture : l’outil utilisé et la décision de votre praticien. Les valeurs écartées ou restées sans décision sont effacées au plus tard 30 jours après le dépôt, et aussitôt si votre praticien écarte le document.';
    const texte = (doc: typeof v20) => doc.sections.flatMap(s => s.paragraphes).join('\n');
    expect(texte(v19)).toContain(ancienne);
    expect(texte(v20)).not.toContain('valeurs relevées et décisions');
    expect(texte(v20)).toContain(nouvelle);
    // Une phrase change, rien d'autre : remise à l'ancienne, la v20 redevient la v19.
    expect(
      v20.sections.map(s => ({ ...s, paragraphes: s.paragraphes.map(p => p.replace(nouvelle, ancienne)) })),
    ).toEqual(v19.sections);
    expect(v20.changeSummary).toBe(
      'Cette version précise ce qui reste d’un compte rendu d’analyses après sa lecture : seules les valeurs validées par votre praticien sont gardées, avec la trace de leur lecture. Le reste ne change pas.',
    );
    expect(v20.requiresAcknowledgement).toBe(true);
  });

  it('la v6 nomme les résultats d’analyses ET dit ce qui n’en est pas fait', () => {
    // POURQUOI CETTE VERSION EXISTE. `WN_CB_RESULTS_ENABLED` a été posé en
    // production le 2026-09-09 : le dossier peut désormais porter des résultats
    // biologiques chiffrés. Or `DOSSIER_RGPD.md` §2 conditionnait cette
    // ouverture à la mise à jour PRÉALABLE de ce document et du registre des
    // traitements — condition écrite là et nulle part ailleurs, ni dans
    // `FEATURE_FLAGS.md`, ni dans `D-122` §2 qui décrit pourtant le geste. Elle
    // a été manquée ; le drapeau est resté posé et le retard se comble ici.
    //
    // Nommer la catégorie ne suffit pas : un patient qui lit « résultats
    // d'analyses » suppose qu'on en tire quelque chose. Le document dit donc
    // aussi la limite que l'écran tient réellement ([[D-157]]) — la plage est
    // POSÉE À CÔTÉ de la mesure, aucun calcul ne la qualifie.
    const courant = getDocumentCourant('donnees_confidentialite');
    const paragraphes = courant.sections.flatMap(s => s.paragraphes ?? []);

    const recueil = paragraphes.find(p => p.includes('exploration biologique'));
    expect(recueil, 'la catégorie « exploration biologique » est absente du document patient').toBeTruthy();
    expect(recueil).toContain('la valeur mesurée, son unité et la date du prélèvement');

    const limite = paragraphes.find(p => p.includes('Aucun calcul'));
    expect(limite, 'le document ne dit pas ce qui n’est PAS fait des résultats').toBeTruthy();
    expect(limite).toContain('le travail de votre praticien');

    // La conclusion de la section « Quelles données » reste la conclusion : les
    // deux phrases neuves s'insèrent AVANT elle, jamais après.
    const section = courant.sections.find(s => s.titre === 'Quelles données sont recueillies ?');
    expect(section?.paragraphes.at(-1)).toContain('uniquement les informations nécessaires');
  });

  describe('les conditions d’utilisation (D-292)', () => {
    const conditions = getDocumentCourant('conditions_utilisation');

    it('reprennent, dans l’ordre, les quatre textes d’information validés', () => {
      expect(conditions.version).toBe('v3');
      expect(PARTIES_REPRISES_CONDITIONS_V1.map(p => `${p.source.key}@${p.source.version}`)).toEqual([
        'cadre_accompagnement@v1',
        'limites_securite@v1',
        'donnees_confidentialite@v18',
        'usage_ia@v8',
      ]);
      // La v2 ne change que la partie 3 ([[D-292]] §5).
      expect(PARTIES_REPRISES_CONDITIONS_V2.map(p => `${p.source.key}@${p.source.version}`)).toEqual([
        'cadre_accompagnement@v1',
        'limites_securite@v1',
        'donnees_confidentialite@v19',
        'usage_ia@v8',
      ]);
      // La v3 aussi, vers la v20 (b25).
      expect(PARTIES_REPRISES_CONDITIONS_V3.map(p => `${p.source.key}@${p.source.version}`)).toEqual([
        'cadre_accompagnement@v1',
        'limites_securite@v1',
        'donnees_confidentialite@v20',
        'usage_ia@v8',
      ]);
      expect([...new Set(conditions.sections.map(s => s.partie))]).toEqual([
        'Le cadre de votre accompagnement',
        'Limites et sécurité médicale',
        'Vos données personnelles et leur confidentialité',
        'L’intelligence artificielle',
        'Quand ces conditions changent',
      ]);
    });

    // LE TEST QUI SIGNALE TOUT ÉCART D'ICI L'ACTIVATION (D-292 §5). Un des
    // quatre textes publié dans une nouvelle version : les conditions ne la
    // portent pas. Avant ACT-1, refaire l'assemblage (nouvelle source, nouveau
    // hash) ; après, publier une nouvelle version des conditions.
    it('chaque partie reprise est la version COURANTE de son texte, mot pour mot', () => {
      for (const { partie, source } of PARTIES_REPRISES_CONDITIONS_V3) {
        const courant = getDocumentCourant(source.key);
        expect(
          courant.version,
          `« ${courant.titre} » est passé en ${courant.version} ; les conditions reprennent la ${source.version}`,
        ).toBe(source.version);
        expect(conditions.sections.filter(s => s.partie === partie)).toEqual(sectionsDeLaPartie(partie, courant));
      }
    });

    it('une seule retouche : le renvoi de la partie 3 nomme la partie sur l’IA', () => {
      const texte = (sections: typeof conditions.sections) =>
        sections.flatMap(s => [...s.paragraphes, ...(s.points ?? [])]).join('\n');
      const donnees = getDocumentCourant('donnees_confidentialite');
      expect(texte(donnees.sections)).toContain('(voir « L’intelligence artificielle dans Wellneuro »)');
      expect(texte(conditions.sections)).not.toContain('(voir « L’intelligence artificielle dans Wellneuro »)');
      expect(texte(conditions.sections).split('(voir la partie « L’intelligence artificielle »)')).toHaveLength(2);
    });

    // LE TEXTE NEUF FACE AU TEXTE VALIDÉ. Le test des parties reprises ne voit
    // que les sources ; titre, résumé et partie 5 se lisent dans le README que le
    // responsable a validé, à l'apostrophe typographique du registre près.
    it('titre, résumé et partie 5 sont ceux du texte validé, mot pour mot', () => {
      const readme = fs
        .readFileSync(
          path.resolve(__dirname, '../../../../../docs/claude/propositions/2026-10-14-k-conditions-utilisation/README.md'),
          'utf8',
        )
        .replaceAll("'", '’');
      const bloc = (debut: string, fin: string) => readme.slice(readme.indexOf(debut) + debut.length, readme.indexOf(fin));
      const [titre, resume] = bloc('## Titre et résumé', '## Partie 5').trim().split(/\n\n+/);
      expect(conditions.titre).toBe(titre);
      expect(conditions.resume).toBe(resume);

      const attendu = bloc('## Partie 5 — Quand ces conditions changent', '## E-mail')
        .split('\n### ')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => {
          const [entete, ...corps] = s.replace(/^### /, '').split(/\n\n+/);
          return { titre: entete.trim(), paragraphes: corps.map(p => p.trim()) };
        });
      const partie5 = (doc: typeof conditions) =>
        doc.sections
          .filter(s => s.partie === 'Quand ces conditions changent')
          .map(s => ({ titre: s.titre, paragraphes: s.paragraphes }));
      expect(partie5(getVersion('conditions_utilisation', 'v1')!)).toEqual(attendu);

      // La v2 précise UNE phrase de la partie 5, validée le 2026-10-20 (B5) :
      // le filet ne joue qu'au dépôt du compte rendu biologique.
      const [phraseB5] = citations('### B5. Partie 5 des conditions v2, une phrase précisée');
      const ancienne = attendu.flatMap(s => s.paragraphes).find(p => p.includes('lorsque vous déposez un document'))!;
      expect(ancienne).toBeTruthy();
      const conditionsV2 = getVersion('conditions_utilisation', 'v2')!;
      expect(partie5(conditionsV2)).toEqual(
        attendu.map(s => ({ ...s, paragraphes: s.paragraphes.map(p => (p === ancienne ? phraseB5 : p)) })),
      );
      expect(conditionsV2.changeSummary).toBe(citations('### B3. Résumé des conditions v2')[0]);
      // La v3 garde la partie 5 de la v2 ; son résumé, validé le 2026-10-24 (b25).
      expect(partie5(conditions)).toEqual(partie5(conditionsV2));
      expect(conditions.titre).toBe(conditionsV2.titre);
      expect(conditions.resume).toBe(conditionsV2.resume);
      expect(conditions.changeSummary).toBe(
        'La partie « Vos données personnelles » précise ce qui reste d’un compte rendu d’analyses après sa lecture : seules les valeurs validées par votre praticien sont gardées, avec la trace de leur lecture. Le reste ne change pas.',
      );
    });

    it('réclament un accusé, et la partie 5 dit le bouton par son libellé', () => {
      expect(conditions.requiresAcknowledgement).toBe(true);
      expect(conditions.titre).toBe('Conditions d’utilisation de votre espace Wellneuro');
      const partie5 = conditions.sections.filter(s => s.partie === 'Quand ces conditions changent');
      expect(partie5.map(s => s.titre)).toEqual([
        'Votre première connexion',
        'Une nouvelle version',
        'Ce que veut dire « J’en ai pris connaissance »',
      ]);
      expect(partie5[0].paragraphes[0]).toContain('« J’en ai pris connaissance »');
    });
  });
});
