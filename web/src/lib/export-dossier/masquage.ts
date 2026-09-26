// Export PDF du dossier patient (D-252) — le masquage de la version « IA externe ».
//
// Un FILET, appliqué au document entier juste avant le rendu : les sections
// pseudonymisées n'écrivent déjà aucune valeur identifiante, mais un patient
// ou un praticien a pu en taper une dans une anamnèse, une réponse ou une
// note. Masquer un mot de trop coûte peu ; en laisser passer un fait sortir
// une identité vers un service externe.
//
// Toutes les expressions sont réunies en UNE alternance, appliquée en une
// passe : la marque déjà posée n'est jamais relue, et à position égale la
// forme la plus longue l'emporte (e-mail entier avant le prénom qu'il contient).

import type { BlocExport, DocumentExport, PatientExport } from './modele';

export const MARQUE_MASQUE = '[masqué]';

type Motif = { source: string; poids: number };

const FRONTIERE_AVANT = '(?<![\\p{L}\\p{N}])';
const FRONTIERE_APRES = '(?![\\p{L}\\p{N}])';
const SEPARATEUR_CHIFFRES = '[\\s.\\-]*';
const DIACRITIQUES = new RegExp('\\p{M}', 'gu');
const LETTRE = new RegExp('\\p{L}', 'gu');
const LETTRE_OU_CHIFFRE = new RegExp('[\\p{L}\\p{N}]', 'u');

const CIVILITES = new Set([
  'dr', 'docteur', 'pr', 'professeur', 'mme', 'madame', 'm', 'monsieur', 'mlle', 'mademoiselle',
]);

// Particules de nom de 3 lettres et plus : les masquer effacerait « des » ou
// « les » de tous les textes. Le nom entier, lui, reste masqué.
const PARTICULES = new Set(['des', 'les', 'del', 'della', 'der', 'den', 'van', 'von', 'dos', 'das']);

// Une saisie sans accent (« Dogne ») doit masquer autant que l'accentuée.
const VARIANTES = new Map<string, string>([
  ['a', 'aàâäáãå'],
  ['c', 'cç'],
  ['e', 'eéèêë'],
  ['i', 'iîïíì'],
  ['n', 'nñ'],
  ['o', 'oôöóòõ'],
  ['u', 'uùûüú'],
  ['y', 'yÿý'],
]);

// Bornes techniques de pseudonymisation, sans rapport clinique (DC-20) : en
// deçà, une suite de chiffres ou un morceau de texte est trop court pour être
// cherché sans masquer des valeurs qui ne désignent pas le patient.
const CHIFFRES_MIN_TELEPHONE = 8;
const CHIFFRES_MIN_NIR = 10;
const CARACTERES_MIN_MORCEAU = 8;

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(DIACRITIQUES, '').toLowerCase();
}

/** Casse et accents indifférents, espaces, tirets et apostrophes souples. */
function motifTexte(texte: string): string {
  let source = '';
  let dansEspace = false;
  for (const caractere of texte.normalize('NFC')) {
    if (/\s/.test(caractere)) {
      if (!dansEspace) source += '\\s+';
      dansEspace = true;
      continue;
    }
    dansEspace = false;
    if (caractere === "'" || caractere === '’') {
      source += "['’]";
    } else if (caractere === '-' || caractere === '‐') {
      source += '[\\-‐\\s]';
    } else {
      const variantes = VARIANTES.get(sansAccents(caractere));
      source += variantes ? `[${variantes}]\\p{M}*` : echapper(caractere);
    }
  }
  return source;
}

function motifChiffres(caracteres: string): string {
  return Array.from(caracteres, echapper).join(SEPARATEUR_CHIFFRES);
}

function texteUtile(valeur: string | null): string | null {
  const texte = valeur?.trim();
  return texte && LETTRE_OU_CHIFFRE.test(texte) ? texte : null;
}

function motifsEmail(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  return texte ? [{ source: echapper(texte), poids: texte.length }] : [];
}

function motifsEmailsDans(valeur: string | null): Motif[] {
  return (valeur?.match(/[^\s@,;<>()]+@[^\s@,;<>()]+/g) ?? []).flatMap(motifsEmail);
}

// Le numéro national à 9 chiffres, quelle que soit la forme stockée (0…, 33…, +33 (0)…, 0033…).
function numeroNational(chiffres: string): string | null {
  const trouve = /^(?:0|33|330|0033)(\d{9})$/.exec(chiffres);
  return trouve ? trouve[1] : null;
}

function motifsTelephone(valeur: string | null): Motif[] {
  const motifs: Motif[] = [];
  for (const serie of valeur?.match(/\+?\d[\d\s.\-()]*\d/g) ?? []) {
    const chiffres = serie.replace(/\D/g, '');
    if (chiffres.length < CHIFFRES_MIN_TELEPHONE) continue;
    const national = numeroNational(chiffres);
    if (national) {
      motifs.push(
        { source: motifChiffres(`0${national}`), poids: 10 },
        { source: `(?:\\+|00)?${SEPARATEUR_CHIFFRES}${motifChiffres(`33${national}`)}`, poids: 11 },
      );
    } else {
      motifs.push({ source: `\\+?${motifChiffres(chiffres)}`, poids: chiffres.length });
    }
  }
  return motifs;
}

function motifsNir(valeur: string | null): Motif[] {
  // Lettres gardées : les NIR de Corse portent 2A ou 2B.
  const caracteres = (valeur ?? '').replace(/[^0-9A-Za-z]/g, '');
  if (caracteres.replace(/\D/g, '').length < CHIFFRES_MIN_NIR) return [];
  const motifs = [{ source: motifChiffres(caracteres), poids: caracteres.length }];
  // Le numéro cité sans sa clé de contrôle.
  if (caracteres.length === 15) motifs.push({ source: motifChiffres(caracteres.slice(0, 13)), poids: 13 });
  return motifs;
}

function motifsCoordonnees(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  const morceaux = new Set([texte, ...texte.split(/[\n,;]+/).map(morceau => morceau.trim())]);
  return [...morceaux]
    .filter(morceau => morceau.length >= CARACTERES_MIN_MORCEAU)
    .map(morceau => ({ source: motifTexte(morceau), poids: morceau.length }));
}

function nombreSouple(deuxChiffres: string): string {
  return deuxChiffres.startsWith('0') ? `0?${deuxChiffres.slice(1)}` : deuxChiffres;
}

function motifsDateNaissance(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  const trouve = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
  if (!trouve) {
    return texte.length >= CARACTERES_MIN_MORCEAU ? [{ source: motifTexte(texte), poids: texte.length }] : [];
  }
  const [, annee, moisChiffres, jourChiffres] = trouve;
  const separateur = '[\\-/.]';
  const jour = nombreSouple(jourChiffres);
  const mois = nombreSouple(moisChiffres);
  const motifs: Motif[] = [
    { source: `${annee}${separateur}${mois}${separateur}${jour}`, poids: 10 },
    { source: `${jour}${separateur}${mois}${separateur}${annee}`, poids: 10 },
  ];
  const nomMois = MOIS[Number(moisChiffres) - 1];
  if (nomMois) {
    const jourLong = jourChiffres === '01' ? '(?:0?1|1er)' : jour;
    motifs.push({ source: `${jourLong}\\s+${motifTexte(nomMois)}\\s+${annee}`, poids: 10 + nomMois.length });
  }
  return motifs;
}

function jetonsNom(texte: string): string[] {
  return texte
    .normalize('NFC')
    .split(/[\s\-‐'’.,;:()]+/)
    .filter(jeton => {
      const cle = sansAccents(jeton);
      return (jeton.match(LETTRE)?.length ?? 0) >= 3 && !CIVILITES.has(cle) && !PARTICULES.has(cle);
    });
}

function motifsNom(valeur: string | null): Motif[] {
  const texte = texteUtile(valeur);
  if (!texte) return [];
  return [texte, ...jetonsNom(texte)].map(morceau => ({ source: motifTexte(morceau), poids: morceau.length }));
}

export function creerMasqueur(patient: PatientExport): (texte: string) => string {
  const motifs = [
    ...motifsEmail(patient.email),
    ...motifsTelephone(patient.telephone),
    ...motifsNir(patient.nir),
    ...motifsCoordonnees(patient.adresse),
    ...motifsCoordonnees(patient.medecinTraitantCoordonnees),
    ...motifsTelephone(patient.medecinTraitantCoordonnees),
    ...motifsEmailsDans(patient.medecinTraitantCoordonnees),
    ...motifsDateNaissance(patient.dateNaissance),
    ...motifsNom(patient.prenom),
    ...motifsNom(patient.nom),
    ...motifsNom(patient.medecinTraitantNom),
  ].sort((a, b) => b.poids - a.poids);

  const sources = [...new Set(motifs.map(motif => motif.source))];
  if (!sources.length) return texte => texte;

  const expression = new RegExp(
    `${FRONTIERE_AVANT}(?:${sources.map(source => `(?:${source})`).join('|')})${FRONTIERE_APRES}`,
    'giu',
  );
  const masquerMorceau = (morceau: string) => morceau.replace(expression, MARQUE_MASQUE);

  // L'identifiant PATnnn est la clé que le praticien retrouve : il ne se masque jamais.
  const identifiant = patient.idPatient.trim();
  if (!identifiant) return masquerMorceau;
  const protege = new RegExp(`(${echapper(identifiant)})`, 'i');
  return texte =>
    texte
      .split(protege)
      .map((morceau, rang) => (rang % 2 === 1 ? morceau : masquerMorceau(morceau)))
      .join('');
}

function masquerBloc(bloc: BlocExport, masquer: (texte: string) => string): BlocExport {
  switch (bloc.type) {
    case 'titre':
      return { ...bloc, texte: masquer(bloc.texte) };
    case 'paragraphe':
      return { ...bloc, texte: masquer(bloc.texte) };
    case 'champ':
      return { ...bloc, libelle: masquer(bloc.libelle), valeur: masquer(bloc.valeur) };
    case 'liste':
      return { ...bloc, elements: bloc.elements.map(element => masquer(element)) };
    case 'espace':
      return { ...bloc };
    default: {
      const inconnu: never = bloc;
      return inconnu;
    }
  }
}

/** Copie neuve : le document d'origine n'est pas touché. */
export function masquerDocument(
  doc: DocumentExport,
  masquer: (texte: string) => string,
): DocumentExport {
  return {
    titre: masquer(doc.titre),
    sousTitre: masquer(doc.sousTitre),
    mentionPied: masquer(doc.mentionPied),
    metadonnees: { titre: masquer(doc.metadonnees.titre), sujet: masquer(doc.metadonnees.sujet) },
    blocs: doc.blocs.map(bloc => masquerBloc(bloc, masquer)),
  };
}
