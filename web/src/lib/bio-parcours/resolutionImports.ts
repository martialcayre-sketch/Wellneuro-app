import { readFileSync, realpathSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, relative, sep } from 'node:path';
import * as ts from 'typescript';
import type { CompilerOptions, ModuleResolutionCache, ModuleResolutionHost } from 'typescript';
import { IMPORT_NON_CONSTANT, importsSyntaxiques, lire, RACINE, type ImportSyntaxique } from './balayageSources';

// Outillage des bancs de garde — RÉSOUDRE un import comme le fait TypeScript,
// pas le lire comme un texte. Extrait du banc de la bibliothèque des options
// ([[D-480]] §8, `bibliotheque-options/importeurs.guard.test.ts`), où chaque
// pièce a été posée par une contre-passe, et partagé par les autres bancs de
// garde (lot `bp17-extension-bancs-garde`). Jamais exécuté par l'application.
//
// LES VERROUS DE CONFIGURATION qui rendent cette résolution fidèle au bundler
// — `tsconfig` et `package.json` aux clés admises, `paths` figé, aucun babel ni
// swc, `next.config` évalué sans alias, chaîne de lancement figée — vivent dans
// `resolutionImports.guard.test.ts` : un banc qui résout par ce module en
// dépend, et ils valent pour tous.

const { createModuleResolutionCache, parseConfigFileTextToJson, parseJsonConfigFileContent, resolveModuleName, sys } = ts;

export const WEB = join(RACINE, 'web');

/** Le chemin réel, ou le chemin tel quel s'il n'existe pas sur disque (hôte de résolution en mémoire). */
function cheminReel(chemin: string): string {
  try {
    return realpathSync(chemin);
  } catch {
    return chemin;
  }
}

/** Les options de résolution de `web/tsconfig.json`. */
export function optionsDeResolution(): CompilerOptions {
  const fichier = join(WEB, 'tsconfig.json');
  const { config, error } = parseConfigFileTextToJson(fichier, lire('web/tsconfig.json'));
  if (error || !config) throw new Error('web/tsconfig.json illisible');
  // `include` vidé : seules les options comptent, pas l'énumération des fichiers.
  return parseJsonConfigFileContent({ ...config, include: [], files: [] }, sys, WEB, undefined, fichier).options;
}

/**
 * LES DÉTOURS PAR LA CONFIGURATION (passe Codex P1-4 sur #2006) : un alias
 * `paths` ou `baseUrl` de `tsconfig`, ou un `#import` de `package.json`, mène
 * à un module par un spécificateur qui ne le nomme pas (`"@options"`). Chaque
 * spécificateur est donc RÉSOLU comme le fait TypeScript, avec les options de
 * `web/tsconfig.json`. UN LIEN SYMBOLIQUE est suivi : TypeScript garde le
 * chemin du lien pour un import relatif, alors que le bundler charge la cible
 * — le fichier atteint est donc CANONICALISÉ (`realpath`), racine comprise
 * (contre-passe Codex n° 7 sur #2006).
 *
 * Rend le fichier atteint, relatif à la racine du dépôt, ou `null` s'il ne se
 * résout pas.
 */
export function fichierAtteint(
  specificateur: string,
  importeur: string,
  options: CompilerOptions,
  hote: ModuleResolutionHost = sys,
  cache?: ModuleResolutionCache,
  racine: string = RACINE,
): string | null {
  if (specificateur === IMPORT_NON_CONSTANT) return null;
  const { resolvedModule } = resolveModuleName(specificateur, join(racine, importeur), options, hote, cache);
  if (!resolvedModule) return null;
  return relative(cheminReel(racine), cheminReel(resolvedModule.resolvedFileName)).split(sep).join('/');
}

/**
 * UN NOM NU INCONNU EST UN LECTEUR POSSIBLE (contre-passe Codex n° 3 sur
 * db10dd9f) : `NODE_PATH`, que Next ajoute aux `resolve.modules` de webpack,
 * peut venir d'un script ou de l'environnement de déploiement — hors du dépôt,
 * hors de tout verrou de configuration. Un spécificateur nu doit donc nommer
 * une dépendance déclarée de `web/package.json` ou un module natif de Node ;
 * sinon il ferme le verrou, quel que soit l'environnement.
 *
 * SI UN BANC ROUGIT SUR UN NOM NU LÉGITIME (`server-only`, un paquet de types
 * comme `geojson`) : DÉCLARER la dépendance dans `web/package.json`, jamais
 * assouplir cette règle — tous les bancs qui résolvent la partagent, et un
 * nom nu non déclaré est exactement ce qu'un `NODE_PATH` servirait.
 */
export function dependancesDeclarees(racine: string = RACINE): Set<string> {
  const paquet = JSON.parse(readFileSync(join(racine, 'web/package.json'), 'utf8')) as Record<
    string,
    Record<string, string> | undefined
  >;
  return new Set([...Object.keys(paquet.dependencies ?? {}), ...Object.keys(paquet.devDependencies ?? {})]);
}

export function nomNuInconnu(specificateur: string, dependances: ReadonlySet<string>): boolean {
  // Seuls `.`, `..`, `./…` et `../…` sont relatifs : `.detour/x` est un nom nu (contre-passe Codex n° 4).
  if (specificateur === IMPORT_NON_CONSTANT || /^(\.\.?(\/|$)|\/|@\/)/.test(specificateur)) return false;
  if (specificateur.startsWith('node:')) return false;
  // Un module natif ne s'admet qu'en entrée exacte (`fs/promises`, pas `fs/charge`) ; une dépendance, avec ses sous-chemins.
  if (builtinModules.includes(specificateur)) return false;
  const nom = specificateur.startsWith('@') ? specificateur.split('/').slice(0, 2).join('/') : specificateur.split('/')[0];
  return !dependances.has(nom);
}

/**
 * POURQUOI LA RÈGLE DES NOMS NUS FERME `NODE_PATH`, OÙ QU'IL POINTE
 * (contre-passe Codex n° 5) : au-dessus d'un dossier gardé, le spécificateur
 * le nomme et le motif du banc le voit ; dans le dossier, son premier segment
 * est un nom du dossier — inconnu, il ferme le verrou ; nom de dépendance ou
 * de module natif, ou portée `@…` d'un nom à portée, il doit être interdit à
 * TOUTE profondeur du dossier. Rend les segments d'un dossier qui tombent sous
 * cet interdit (casse ignorée : un build sur système insensible à la casse
 * servirait `react/…` depuis `React/`).
 */
export function segmentsInterditsDuDossier(
  dossier: string,
  fichiers: readonly string[],
  dependances: ReadonlySet<string>,
): string[] {
  const segments = fichiers.flatMap(f =>
    f
      .slice(dossier.length)
      .split('/')
      // Le nom brut et chacun de ses préfixes avant un point (`zod.ts`, `zod.test.ts` → `zod`).
      .flatMap(seg => seg.split('.').map((_, i, parts) => parts.slice(0, i + 1).join('.'))),
  );
  return segments.filter(n => {
    const bas = n.toLowerCase();
    return bas !== '' && (bas.startsWith('@') || dependances.has(bas) || builtinModules.includes(bas));
  });
}

/** Ce qu'il faut pour résoudre : options, cache (sur le dépôt seulement), dépendances déclarées. */
export interface ContexteResolution {
  options: CompilerOptions;
  cache?: ModuleResolutionCache;
  /** L'hôte de résolution : le disque, ou un graphe en mémoire pour une contre-épreuve. */
  hote?: ModuleResolutionHost;
  dependances: ReadonlySet<string>;
  racine: string;
}

export function contexteResolution(racine: string = RACINE): ContexteResolution {
  const options = optionsDeResolution();
  return {
    options,
    // Le cache n'est partagé que sur le dépôt lui-même ; une racine d'essai résout sans cache.
    cache: racine === RACINE ? createModuleResolutionCache(WEB, x => x, options) : undefined,
    // Celles du dépôt, même sur une racine d'essai (qui n'a pas de `package.json`).
    dependances: dependancesDeclarees(),
    racine,
  };
}

/** Un import lu par le parseur, résolu. */
export interface ImportResolu extends ImportSyntaxique {
  /** Le fichier atteint, canonicalisé, relatif à la racine ; `null` s'il ne se résout pas. */
  atteint: string | null;
  /**
   * Un lecteur POSSIBLE de n'importe quel module : argument non constant, ou nom
   * nu qui n'est ni une dépendance déclarée ni un module natif. Le client
   * Prisma GÉNÉRÉ importe les dépendances de `@prisma/client`, installées avec
   * lui : la règle des noms nus ne vaut que pour le code écrit au dépôt.
   */
  indetermine: boolean;
}

/** Les imports d'un fichier, lus par le parseur et résolus. */
export function importsResolus(chemin: string, contexte: ContexteResolution, source?: string): ImportResolu[] {
  const texte = source ?? readFileSync(join(contexte.racine, chemin), 'utf8');
  const genere = chemin.startsWith('web/src/generated/');
  return importsSyntaxiques(texte, chemin).map(i => ({
    ...i,
    atteint: fichierAtteint(i.specificateur, chemin, contexte.options, contexte.hote ?? sys, contexte.cache, contexte.racine),
    indetermine:
      i.specificateur === IMPORT_NON_CONSTANT || (!genere && nomNuInconnu(i.specificateur, contexte.dependances)),
  }));
}

/**
 * Un hôte de résolution qui voit, sous `web/src`, les seuls fichiers d'un
 * graphe EN MÉMOIRE (clés relatives à `web/src`), et le disque ailleurs
 * (`node_modules`, `package.json`) : une contre-épreuve résout ses sources
 * fabriquées comme le dépôt, sans écrire aucun fichier.
 */
export function hoteEnMemoire(sources: ReadonlyMap<string, string>): ModuleResolutionHost {
  const src = join(WEB, 'src') + sep;
  const cle = (f: string) => f.slice(src.length).split(sep).join('/');
  return {
    ...sys,
    fileExists: f => (f.startsWith(src) ? sources.has(cle(f)) : sys.fileExists(f)),
    readFile: f => (f.startsWith(src) ? sources.get(cle(f)) : sys.readFile(f)),
    directoryExists: d =>
      (d + sep).startsWith(src) ? [...sources.keys()].some(k => `${src}${k}`.startsWith(d + sep)) : (sys.directoryExists?.(d) ?? false),
    realpath: f => f,
  };
}

/**
 * UN IMPORT DÉSIGNE UNE CIBLE s'il la NOMME (motif du banc, sur le
 * spécificateur décodé), s'il l'ATTEINT (résolution, liens suivis), ou s'il
 * est INDÉTERMINÉ (argument non constant, nom nu inconnu) : un lecteur
 * possible de tout module ferme le verrou de chaque banc.
 */
export function designe(i: ImportResolu, motif: RegExp, cibles: readonly string[]): boolean {
  return i.indetermine || motif.test(i.specificateur) || atteintSous(i.atteint, cibles);
}

/**
 * L'import atteint-il le paquet `nom` installé ? Par le chemin canonicalisé,
 * où qu'il soit : le contrôle de fusion pose `web/node_modules` en lien
 * symbolique, et le fichier atteint sort alors du dépôt (`../…`) — une cible
 * `web/node_modules/<nom>/` ne correspondrait plus (`wn-reviewer` sur ce lot).
 */
export function atteintLePaquet(i: ImportResolu, nom: string): boolean {
  return i.atteint !== null && new RegExp(`(^|/)node_modules/${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`).test(i.atteint);
}

/**
 * Le fichier atteint est-il sous l'un des dossiers ou est-il l'un des fichiers
 * donnés ? Casse ignorée : un système de fichiers qui l'ignore (macOS) résout
 * `./BIBLIOTHEQUE-options/…` (`wn-reviewer` sur #2006). Un dossier se termine
 * par `/`.
 */
export function atteintSous(atteint: string | null, cibles: readonly string[]): boolean {
  if (atteint === null) return false;
  const bas = atteint.toLowerCase();
  return cibles.some(c => (c.endsWith('/') ? bas.startsWith(c.toLowerCase()) : bas === c.toLowerCase()));
}
