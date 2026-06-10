import { scrapeAndStoreAgenda } from './src/lib/services/agendaScrapingService.ts';

async function test() {
  console.log("Testing Agenda Scraper...");
  try {
    const result = await scrapeAndStoreAgenda();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Test failed", err);
  }
}

test();
