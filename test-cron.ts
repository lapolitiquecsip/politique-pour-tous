import { GET } from './src/app/api/cron/update-laws/route';
async function run() {
  const req = new Request('http://localhost:3000/api/cron/update-laws', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  });
  const res = await GET(req);
  console.log(await res.json());
}
run();
