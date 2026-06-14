import * as cheerio from 'cheerio';
async function test() {
  const res = await fetch('https://www2.assemblee-nationale.fr/documents/liste?type=propositions-loi');
  const html = await res.text();
  const $ = cheerio.load(html);
  const els = $('ul.liens-liste li[data-id], .liens-liste li[data-id]');
  els.each((_i, el) => {
      const title = $(el).find('h3').text().trim();
      const dateTextRaw = $(el).find('span.heure, .date').text().trim();
      if (_i < 5) {
          console.log('Title:', title);
          console.log('Date:', dateTextRaw);
      }
  });
}
test();
