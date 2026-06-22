import { scrapeAndUpdateContent } from './src/lib/services/contentScrapingService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  const result = await scrapeAndUpdateContent();
  console.log(JSON.stringify(result, null, 2));
}

run();
