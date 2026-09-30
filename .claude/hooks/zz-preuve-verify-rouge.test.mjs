// TEMPORAIRE — preuve de la PR #1263 : un échec de `controles` doit rendre
// `verify` ROUGE, jamais sauté. Retiré par le commit suivant.
import test from "node:test";
import assert from "node:assert/strict";

test("échec volontaire pour éprouver l'agrégateur verify", () => {
  assert.fail("preuve #1263");
});
