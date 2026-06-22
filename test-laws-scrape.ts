import * as cheerio from 'cheerio';
async function test() {
  const res = await fetch('https://www2.assemblee-nationale.fr/documents/liste?type=propositions-loi');
  const html = await res.text();
  const $ = cheerio.load(html);
  const els = $('ul.liens-liste li[data-id], .liens-liste li[data-id]');
  console.log(els.length, 'found');
}
test();
