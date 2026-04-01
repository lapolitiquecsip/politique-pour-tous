"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Webhook, RefreshCw, AlertCircle, CheckCircle2, PlayCircle, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const [politiciansCount, setPoliticiansCount] = useState<number | null>(null);
  const [subscribersCount, setSubscribersCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pols, subs, pipelineLogs] = await Promise.all([
        api.getPoliticians().catch(() => []),
        api.getSubscribers().catch(() => []),
        api.getPipelineLogs().catch(() => [])
      ]);
      setPoliticiansCount(pols.length);
      setSubscribersCount(subs.length);
      setLogs(pipelineLogs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPipeline = async () => {
    setTriggering(true);
    try {
      await api.triggerAssembleePipeline();
      // Wait 1 second then refresh logs
      setTimeout(() => fetchData(), 1500);
    } catch (error) {
      alert("Erreur lors du lancement de la pipeline.");
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
     return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900">Vue d'ensemble</h1>
        <p className="text-slate-500 mt-1">Supervision de la plateforme et des mises à jour automatiques.</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Abonnés Newsletter</p>
            <h2 className="text-4xl font-extrabold text-slate-900">{subscribersCount ?? 0}</h2>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Politiciens en base</p>
            <h2 className="text-4xl font-extrabold text-slate-900">{politiciansCount ?? 0}</h2>
          </div>
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Webhook className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-heading text-slate-900">Historique des Scrapers (Pipelines)</h3>
            <p className="text-sm text-slate-500">Liste des exécutions des robots de collecte de données RSS.</p>
          </div>
          <button 
            onClick={handleTriggerPipeline}
            disabled={triggering}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-all"
          >
            {triggering ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
            Récupération RSS manuelle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold">
                <th className="p-4 pl-6">Date d'exécution</th>
                <th className="p-4">Pipeline</th>
                <th className="p-4">Items traités</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                    Aucun historique de pipeline trouvé.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateStr = new Date(log.started_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 pl-6 text-slate-700 font-medium">{dateStr}</td>
                      <td className="p-4 text-slate-600 font-mono text-sm">{log.pipeline_name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">{log.items_processed || 0}</span>
                      </td>
                      <td className="p-4">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Succès
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200" title={log.log_data ? JSON.stringify(log.log_data) : ''}>
                            <AlertCircle className="w-3 h-3" /> Erreur ({log.errors_count || 0})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 text-center border-t border-slate-200">
          <button onClick={() => fetchData()} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 justify-center mx-auto">
            <RefreshCw className="w-4 h-4" /> Rafraîchir les logs
          </button>
        </div>
      </div>
    </div>
  );
}
