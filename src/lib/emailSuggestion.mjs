// Suggest only known provider typos. Custom domains remain valid choices.
const DOMAIN_CORRECTIONS = {
  'ggmail.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllook.com': 'outlook.com', 'outlook.con': 'outlook.com',
};

export function suggestEmailAddress(value) {
  const parts = value.trim().split('@');
  if (parts.length !== 2 || !parts[0] || /\s/.test(parts[0])) return null;
  const domain = parts[1].toLowerCase();
  const corrected = Object.hasOwn(DOMAIN_CORRECTIONS, domain) ? DOMAIN_CORRECTIONS[domain] : null;
  return corrected ? `${parts[0]}@${corrected}` : null;
}
