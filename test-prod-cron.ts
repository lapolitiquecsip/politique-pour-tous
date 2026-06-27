async function run() {
  try {
    const res = await fetch('https://lapolitique.fr/api/cron/update-laws', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
