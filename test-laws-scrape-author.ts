import * as cheerio from 'cheerio';
async function test() {
  const res = await fetch('https://www2.assemblee-nationale.fr/documents/liste?type=propositions-loi');
  const html = await res.text();
  const $ = cheerio.load(html);
  const els = $('ul.liens-liste li[data-id], .liens-liste li[data-id]');
  els.each((_i, el) => {
      const subtitle = $(el).find('p').first().text().trim();
      const authorLink = $(el).find('p a[href*="/deputes/"]').first();
      let author = '';
      if (authorLink.length > 0) {
        author = authorLink.text().trim();
      } else {
        const authorMatch = subtitle.match(/(?:de loi organique de|de loi de)\s+([^,]+?)(?:\s+et plusieurs|\s+relative|\s+visant|\s+déposée|$)/i);
        author = authorMatch ? authorMatch[1].trim() : 'Député(s)';
      }
      console.log('Subtitle:', subtitle);
      console.log('Author:', author);
  });
}
test();
