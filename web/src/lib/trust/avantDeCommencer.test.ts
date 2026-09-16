import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOCUMENTS_AVANT_DE_COMMENCER,
  avantDeCommencerRequis,
  documentsRequerantAccuse,
  type AccuseConnu,
} from './avantDeCommencer';
import { getDocumentCourant } from './contenus/registre';

// L'INVARIANT QUI COMPTE : LA SÉQUENCE DOIT POUVOIR SE TERMINER.
//
// Si la porte exige un accusé que la séquence n'enregistre pas, le patient
// boucle sans fin — quatre écrans, une validation, un retour, et les quatre
// écrans à nouveau. Ce n'est pas une gêne d'affichage : c'est un portail
// inaccessible, sur la surface où le patient dépose ses réponses.
//
// Ce fichier éprouve cette terminaison, et garde aussi le défaut qui a produit
// ce module : `requiresAcknowledgement` était un champ MORT — déclaré, posé sur
// treize documents, lu par personne.

function accuseSur(cle: string): AccuseConnu {
  return {
    documentKey: cle,
    documentVersion: getDocumentCourant(cle as never).version,
    type: 'pris_connaissance',
  };
}

describe('avantDeCommencer — la séquence peut toujours se terminer', () => {
  it('poser les accusés que la séquence enregistre SUFFIT à fermer la porte', () => {
    // C'est exactement ce que fait `terminer()` : une boucle sur
    // `documentsRequerantAccuse()`. Si cette assertion tombe, le patient
    // boucle.
    const accuses = documentsRequerantAccuse().map(accuseSur);
    expect(avantDeCommencerRequis(accuses)).toBe(false);
  });

  it('il manque un seul accusé, et la porte se referme', () => {
    const requis = documentsRequerantAccuse();
    expect(requis.length).toBeGreaterThan(0);

    for (const absent of requis) {
      const accuses = requis.filter(c => c !== absent).map(accuseSur);
      expect(avantDeCommencerRequis(accuses), `sans ${absent}`).toBe(true);
    }
  });

  it('un accusé sur une version PÉRIMÉE ne vaut pas pour la courante', () => {
    const accuses: AccuseConnu[] = documentsRequerantAccuse().map(cle => ({
      documentKey: cle,
      documentVersion: 'v0-perimee',
      type: 'pris_connaissance',
    }));
    expect(avantDeCommencerRequis(accuses)).toBe(true);
  });

  it('« présenté » n’est pas « pris connaissance »', () => {
    // `presente` trace qu'un texte a été AFFICHÉ. Le confondre avec une
    // reconnaissance viderait l'accusé de son sens : il suffirait d'ouvrir.
    const accuses: AccuseConnu[] = documentsRequerantAccuse().map(cle => ({
      ...accuseSur(cle),
      type: 'presente',
    }));
    expect(avantDeCommencerRequis(accuses)).toBe(true);
  });
});

describe('avantDeCommencer — la liste et les écrans ne divergent pas', () => {
  it('la liste est EXACTEMENT les trois documents que la séquence présente', () => {
    // Épinglée en entier, et dans l'ordre : une assertion « contient » aurait
    // laissé passer aussi bien une clé de trop qu'une clé manquante, et c'est
    // exactement le genre de dérive que ce module existe pour empêcher.
    expect([...DOCUMENTS_AVANT_DE_COMMENCER]).toEqual([
      'cadre_accompagnement',
      'limites_securite',
      'donnees_confidentialite',
    ]);
  });

  it('« Vos données personnelles » est PRÉSENTÉ sans être EXIGÉ — et c’est le mécanisme', () => {
    // LA DISTINCTION QUE CE BANC GARDE, et elle n'est pas théorique. La clé est
    // dans la liste (la séquence montre bien ce texte, à l'écran 3), mais sa
    // version courante ne réclame aucun accusé — les v3 à v7 DÉCRIVAIENT sans
    // rien recueillir de neuf. Le filtre l'écarte donc tout seul, sans qu'on
    // ait à retirer sa clé, et la porte n'interrompt personne.
    //
    // Le jour où une version de ce document recueillera vraiment du neuf, elle
    // posera `requiresAcknowledgement` et rentrera dans le périmètre exigé par
    // le seul fait de sa publication. Voir le banc de dépendance de release
    // ci-dessous, qui dit à quelle condition ce jour peut arriver.
    expect(DOCUMENTS_AVANT_DE_COMMENCER).toContain('donnees_confidentialite');
    expect(documentsRequerantAccuse()).not.toContain('donnees_confidentialite');
    expect(documentsRequerantAccuse()).toEqual(['cadre_accompagnement', 'limites_securite']);
  });

  it('aucun document de la liste n’est absent des écrans de la séquence', () => {
    // GARDE DE COHÉRENCE ÉCRAN ↔ ACCUSÉ. Exiger la reconnaissance d'un texte
    // que la séquence ne montre pas demanderait au patient de reconnaître ce
    // qu'il n'a pas vu. Les trois documents ont chacun leur écran ; `usage_ia`,
    // `droits_patient` et `consentement_suivi` n'en ont pas, et sont donc hors
    // liste — ajouter une clé ici oblige à ajouter un écran là-bas.
    const source = readFileSync(
      path.resolve(__dirname, '../../components/patient/trust/AvantDeCommencer.tsx'),
      'utf8',
    );
    // La séquence annonce son propre compte d'écrans ; il doit couvrir les
    // documents exigés plus l'écran de confirmations finales.
    expect(source).toContain('Étape {ecran + 1} sur 4');
    expect(DOCUMENTS_AVANT_DE_COMMENCER.length).toBeLessThanOrEqual(3);

    // Et la séquence lit bien la liste partagée, au lieu d'une copie en dur.
    expect(source).toContain('documentsRequerantAccuse()');
    expect(source).not.toMatch(/\[\s*'cadre_accompagnement',\s*'limites_securite'\s*\]\s*as const/);
  });

  it('les trois clés hors séquence n’y entrent pas par mégarde', () => {
    for (const hors of ['usage_ia', 'droits_patient', 'consentement_suivi']) {
      expect(DOCUMENTS_AVANT_DE_COMMENCER).not.toContain(hors);
    }
  });
});

describe('avantDeCommencer — un texte n’exige rien pour des champs qui n’existent pas', () => {
  it('« Vos données personnelles » ne peut EXIGER un accusé que si le dossier sait tenir les trois renseignements', () => {
    // CE BANC EXISTE POUR UN CONSTAT DE REVUE DU 2026-09-16, et il vaut mieux
    // qu'une note dans une PR — une note ne bloque personne.
    //
    // La v8 de ce document annonce au patient que son praticien tient désormais
    // son adresse postale, son numéro de sécurité sociale et son médecin
    // traitant, et lui fait franchir une porte pour le reconnaître. Publiée
    // avant que la migration n'ajoute les colonnes (LOT-03) et que la fiche ne
    // sache les écrire (LOT-05), cette phrase serait FAUSSE : on aurait fait
    // accuser réception, à chaque patient, d'un traitement qui n'existe pas.
    //
    // Un document de confidentialité qui EXIGE un accusé engage donc ce que
    // l'application fait réellement. Tant que la version courante n'exige rien,
    // ce banc ne demande rien ; dès qu'une version l'exige en nommant ces
    // renseignements, elle doit trouver les colonnes ET la route qui les écrit.
    const courant = getDocumentCourant('donnees_confidentialite');
    const texte = courant.sections.flatMap(s => s.paragraphes ?? []).join(' ');
    const nommeLeDossierAdministratif =
      texte.includes('adresse postale') && texte.includes('numéro de sécurité sociale');

    if (!courant.requiresAcknowledgement || !nommeLeDossierAdministratif) return;

    // BORNÉ AU BLOC `model Patient`, et ce n'est pas du zèle : cherchés dans le
    // schéma entier, « adresse » et « nir » trouvent des commentaires et
    // d'autres modèles, et le banc passerait au vert en n'ayant rien vérifié.
    const schema = readFileSync(path.resolve(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    const blocPatient = /\nmodel Patient \{([\s\S]*?)\n\}/.exec(schema)?.[1] ?? '';
    expect(blocPatient, 'modèle Patient introuvable dans schema.prisma').not.toBe('');
    for (const colonne of ['adresse', 'nir', 'medecinTraitantNom', 'medecinTraitantCoordonnees']) {
      expect(blocPatient, `colonne ${colonne} absente du modèle Patient`).toContain(colonne);
    }

    const patch = readFileSync(
      path.resolve(__dirname, '../../app/api/praticien/patients/route.ts'),
      'utf8',
    );
    for (const champ of ['adresse', 'nir', 'medecinTraitantNom']) {
      expect(patch, `le praticien ne peut pas saisir ${champ}`).toContain(champ);
    }
  });
});
