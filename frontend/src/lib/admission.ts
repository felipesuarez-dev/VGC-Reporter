/**
 * Some event locators publish the price inside the free-text details instead
 * of the dedicated Admission field. Recover the entry amount without picking
 * up prize money from nearby sentences.
 */
export function extractAdmission(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const sentences = normalized.split(/[.\n;]+/);
  const keywords = /(entry|admission|entrance|entrada|inscripci[oó]n|precio|fee|cost|coste)/i;
  const amount = /([$€£]\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:CLP|USD|EUR|MXN|ARS|COP|PEN|BRL|GBP|JPY|CAD|AUD))/i;
  for (const sentence of sentences) {
    if (!keywords.test(sentence)) continue;
    const match = sentence.match(amount);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}
