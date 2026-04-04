"use client";
// Force re-compile
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mail, MessageSquare, User, CheckCircle2, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "support",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── HEADER IMMERSIF ── */}
      <section className="relative bg-slate-950 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.elysee.fr/theme/front/dist/assets/images/elysee-social.jpg')] bg-cover bg-center opacity-10 saturate-0 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/60" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
          >
            <MessageSquare className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Dialogue & Support</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-9xl font-staatliches text-white leading-none uppercase italic mb-6">
            Parlons <span className="text-red-600 font-sans tracking-tighter not-italic">Politique</span>
          </h1>
          <p className="text-white/60 text-lg md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
            Une question sur votre abonnement ? Une suggestion de dossier ? Notre équipe vous répond sous 24h.
          </p>
        </div>
      </section>

      {/* ── FORMULAIRE ── */}
      <section className="container mx-auto px-6 max-w-5xl -mt-16 pb-32 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Info Card */}
          <div className="lg:col-span-1 bg-red-600 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-8 leading-none">Canaux <br/>Directs</h3>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Email</p>
                    <p className="font-bold">contact@lapolitiquesimple.fr</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Presse</p>
                    <p className="font-bold">presse@lapolitiquesimple.fr</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white/10 p-6 rounded-2xl border border-white/10 relative z-10 backdrop-blur-sm">
                <p className="text-xs font-bold leading-relaxed">
                  « Nous croyons en une communication transparente pour renforcer le lien démocratique. »
                </p>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-8 md:p-16 border border-slate-200 shadow-2xl overflow-hidden relative">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">Nom Complet</label>
                      <div className="relative">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          required
                          type="text"
                          placeholder="Jean Dupont"
                          className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-900"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">Votre Email</label>
                      <div className="relative">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                          required
                          type="email"
                          placeholder="jean@exemple.fr"
                          className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-900"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">Objet du message</label>
                    <select 
                      className="w-full px-8 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-900 appearance-none"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    >
                      <option value="support">Support Premium / Facturation</option>
                      <option value="press">Demande Presse</option>
                      <option value="idea">Suggestion de dossier</option>
                      <option value="other">Autre demande</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 pl-4">Votre Message</label>
                    <textarea 
                      required
                      placeholder="Comment pouvons-nous vous aider ?"
                      rows={5}
                      className="w-full px-8 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-900"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-6 bg-slate-950 text-white font-black rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 shadow-xl"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Envoyer le message
                        <Send className="w-5 h-5 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-950 uppercase tracking-tighter mb-4">Message Envoyé !</h2>
                  <p className="text-slate-500 font-medium mb-12 max-w-sm">
                    Votre demande a été transmise avec succès. Notre équipe reviendra vers vous sous peu.
                  </p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 text-red-600 font-black uppercase tracking-widest hover:gap-4 transition-all"
                  >
                    Envoyer un autre message <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
