import { api } from '@/lib/api';
async function t() {
  const laws = await api.getProposals();
  const law = laws.find(l => l.title.includes('universel'));
  console.log('Author for law is:', law?.author);
}
t();
