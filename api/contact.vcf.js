export default function handler(req, res) {
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Rikhash;Abdullah;;;',
    'FN:Abdullah Rikhash',
    'TEL;TYPE=CELL:+918891456003',
    'TITLE:Entrepreneur',
    'END:VCARD'
  ].join('\r\n') + '\r\n';

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="abdul-rikash.vcf"');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(vcard);
}
