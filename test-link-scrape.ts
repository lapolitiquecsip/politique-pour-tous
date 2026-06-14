import * as cheerio from 'cheerio';
async function test() {
  const res = await fetch('https://www2.assemblee-nationale.fr/documents/liste?type=propositions-loi');
  const html = await res.text();
  const $ = cheerio.load(html);
  const els = $('ul.liens-liste li[data-id], .liens-liste li[data-id]');
  els.each((_i, el) => {
      const link = $(el).find('h3 a').attr('href') || $(el).find('a').first().attr('href');
      if (_i < 2) console.log('Link:', link);
  });
}
test();
