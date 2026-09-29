// LE SERVICE PATIENT DES FICHES REMISES ([[D-251]] §7-§8, lot 9) — la lecture
// en base. Le calcul lui-même est PUR (`ficheServie.ts`).
//
// CE QUI SE SERT : pour chaque fiche, la remise EN COURS (la dernière), et
// rien d'autre. Une version remplacée ne réapparaît jamais : c'est un clic
// « Valider pour diffusion » qui remet, jamais la lecture (amendement du
// 2026-09-28, « la remise en cours »).
//
// LES CONTRÔLES SONT REJOUÉS AU MOMENT DE SERVIR (§6) : empreinte,
// appariement, précautions, claims cités encore valides. Une version qui ne
// les passe plus n'est pas servie, et c'est dit (`indisponible`) — même règle
// que l'aperçu du praticien, « ne rien servir, et le dire ».
//
// SEUL LE TEXTE DES REMISES EN COURS NON RETIRÉES EST CHARGÉ. Ni le motif d'un
// retrait, ni le validateur, ni les claims ne sortent d'ici : ce sont des
// notes du cabinet.

import { prisma } from '@/lib/prisma';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { controlerVersion } from './controle';
import { etatDeLaVersion } from './etat';
import {
  assiettesConseillees,
  contenuPourLePatient,
  etatAvantControle,
  placeDansLeProtocole,
  remisesEnCours,
  type ContenuServi,
  type EtatFicheServie,
  type FicheRemiseServie,
} from './ficheServie';

const SELECTION_ACTE = {
  ordre: true,
  acte: true,
  contenuSha256: true,
  validateur: true,
  relectureIntegrale: true,
  motif: true,
  le: true,
} as const;

/**
 * Les assiettes que le protocole SERVI au patient conseille encore, ou `null`
 * si aucun ne peut être établi. Même résolution que `api/portail/protocole` :
 * la tête de la chaîne d'approbations, recoupée avec la version active.
 */
async function assiettesDuProtocoleServi(idPatient: string): Promise<Set<string> | null> {
  try {
    const servi = await resolveProtocoleDiffuse(idPatient);
    if (!servi) return null;
    const brouillon = await prisma.protocolDraft.findUnique({
      where: { id: servi.protocolDraftId },
      select: { payload: true },
    });
    if (!brouillon) return null;
    const { actions } = reconstructProtocolDraft(brouillon.payload, servi.protocolDraftInputHash);
    return assiettesConseillees(actions);
  } catch (err) {
    // Une panne ici ne retient pas les fiches : elle tait seulement la mention.
    console.warn('[fiches-assiette/servicePatient] protocole servi illisible', err instanceof Error ? err.name : 'inconnu');
    return null;
  }
}

/**
 * Une fiche au moins a-t-elle été remise à ce patient ? C'est ce qui fait
 * paraître l'accès « Fiches remises par mon praticien » (lot 10). Une remise
 * retirée compte : son entrée reste lisible, avec sa mention (§7). Aucun texte
 * lu, aucun contrôle rejoué.
 */
export async function aDesFichesRemises(idPatient: string): Promise<boolean> {
  const remise = await prisma.ficheAssietteRemise.findFirst({ where: { idPatient }, select: { id: true } });
  return remise !== null;
}

/** Les fiches remises au patient, dans l'état où elles se servent. */
export async function fichesRemisesAuPatient(idPatient: string): Promise<FicheRemiseServie[]> {
  const remises = await prisma.ficheAssietteRemise.findMany({
    where: { idPatient },
    orderBy: { ordre: 'desc' },
    select: {
      id: true,
      ordre: true,
      contenuSha256: true,
      remiseLe: true,
      version: {
        select: {
          id: true,
          sourceId: true,
          plateCode: true,
          numero: true,
          contenuSha256: true,
          actes: { orderBy: { ordre: 'desc' }, take: 1, select: SELECTION_ACTE },
        },
      },
    },
  });
  const enCours = remisesEnCours(remises.map(remise => ({ ...remise, sourceId: remise.version.sourceId })));
  if (enCours.length === 0) return [];

  const avantControle = new Map(enCours.map(remise => [
    remise.id,
    etatAvantControle(remise, remise.version, etatDeLaVersion(remise.version, remise.version.actes)),
  ]));
  const aControler = enCours.filter(remise => avantControle.get(remise.id) === 'a_controler');
  const versions = aControler.length === 0 ? [] : await prisma.ficheAssietteVersion.findMany({
    where: { id: { in: aControler.map(remise => remise.version.id) } },
    select: { id: true, sourceId: true, plateCode: true, contenu: true, contenuSha256: true, texteSource: true },
  });
  const contenus = new Map<string, ContenuServi | null>(
    await Promise.all(versions.map(async version => {
      // Une panne pendant le rejeu retient CETTE fiche, pas la liste : les
      // autres, retirées comprises, restent à l'écran (§7, revue du lot 9).
      try {
        const { contenu, anomalies } = await controlerVersion(version);
        return [version.id, contenu !== null && anomalies.length === 0 ? contenuPourLePatient(contenu) : null] as const;
      } catch (err) {
        console.warn('[fiches-assiette/servicePatient] contrôles non rejoués', err instanceof Error ? err.name : 'inconnu');
        return [version.id, null] as const;
      }
    })),
  );

  const assiettes = await assiettesDuProtocoleServi(idPatient);
  return enCours.map(remise => {
    const avant = avantControle.get(remise.id);
    const contenu = avant === 'a_controler' ? (contenus.get(remise.version.id) ?? null) : null;
    const etat: EtatFicheServie = avant === 'retiree' ? 'retiree' : contenu !== null ? 'servie' : 'indisponible';
    return {
      idRemise: remise.id,
      libelle: getRecommendedPlate(remise.version.plateCode)?.label ?? remise.version.plateCode,
      numero: remise.version.numero,
      remiseLe: remise.remiseLe.toISOString(),
      etat,
      protocole: placeDansLeProtocole(remise.version.plateCode, assiettes),
      contenu,
    };
  });
}
