"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Star
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // Adresse créée mais jamais confirmée : on propose de renvoyer le lien plutôt
  // que de laisser le membre bloqué devant « Email not confirmed ».
  const [nonConfirme, setNonConfirme] = useState(false);
  const [renvoi, setRenvoi] = useState<"" | "envoi" | "ok" | "attendre">("");
  const [dejaInscrit, setDejaInscrit] = useState(false);
  const [reinit, setReinit] = useState<"" | "envoi" | "ok" | "attendre">("");
  const router = useRouter();

  const retour = () => `${window.location.origin}/auth/callback`;

  /** Les messages de Supabase arrivent en anglais : on les dit en français. */
  const traduire = (m: string) => {
    if (/email not confirmed/i.test(m)) return "Votre adresse n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail, ou demandez-en un nouveau ci-dessous.";
    if (/invalid login credentials/i.test(m)) return "Adresse ou mot de passe incorrect.";
    if (/already registered|already exists/i.test(m)) return "Un compte existe déjà avec cette adresse. Connectez-vous.";
    if (/password should be at least|weak password/i.test(m)) return "Mot de passe trop court : 6 caractères au minimum.";
    if (/rate limit|too many|for security purposes/i.test(m)) return "Trop de tentatives rapprochées. Patientez une minute avant de réessayer.";
    if (/invalid email|unable to validate email/i.test(m)) return "Cette adresse e-mail n'est pas valide.";
    return m || "Une erreur est survenue.";
  };

  const renvoyerConfirmation = async () => {
    if (!email || renvoi === "envoi") return;
    setRenvoi("envoi");
    const { error: e } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: retour() } });
    // Supabase limite à un envoi par minute et par adresse.
    setRenvoi(e ? "attendre" : "ok");
  };

  /** Mot de passe oublié : lien de réinitialisation, qui ramène sur /auth/callback. */
  const reinitialiser = async () => {
    if (!email) { setError("Indiquez d'abord votre adresse e-mail ci-dessus."); return; }
    if (reinit === "envoi") return;
    setReinit("envoi");
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: retour() });
    setReinit(e ? "attendre" : "ok");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNonConfirme(false);
    setDejaInscrit(false);
    setRenvoi("");
    setReinit("");

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/");
        router.refresh();
      } else {
        const { data: inscrit, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: retour(),
          },
        });
        if (signUpError) throw signUpError;
        // Adresse DÉJÀ inscrite et confirmée : Supabase répond « succès » par
        // discrétion (pour ne pas révéler qui a un compte) mais n'envoie AUCUN
        // e-mail — on affichait « Vérifiez vos mails » et rien n'arrivait jamais.
        // On le reconnaît à la liste d'identités vide.
        if (inscrit.user && (inscrit.user.identities ?? []).length === 0) {
          setIsLogin(true);
          setDejaInscrit(true);
          setError("Un compte existe déjà avec cette adresse. Connectez-vous — ou, si vous avez oublié votre mot de passe, recevez un lien pour en choisir un nouveau.");
          return;
        }
        setSuccess(true);
      }
    } catch (err: any) {
      const m = String(err?.message || "");
      if (/email not confirmed/i.test(m)) setNonConfirme(true);
      setError(traduire(m));
    } finally {
      setLoading(false);
    }
  };

  /** Le bouton de renvoi, commun à l'écran de succès et à l'erreur « non confirmé ». */
  const boutonRenvoi = (
    <button
      type="button"
      onClick={renvoyerConfirmation}
      disabled={renvoi === "envoi" || renvoi === "ok"}
      className="mt-3 text-sm font-bold text-amber-600 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-70"
    >
      {renvoi === "envoi" ? "Envoi…"
        : renvoi === "ok" ? "Nouveau lien envoyé ✓ (pensez aux courriers indésirables)"
        : renvoi === "attendre" ? "Patientez une minute, puis réessayez"
        : "Je n'ai rien reçu : renvoyer l'e-mail"}
    </button>
  );

  const boutonReinit = (
    <button
      type="button"
      onClick={reinitialiser}
      disabled={reinit === "envoi" || reinit === "ok"}
      className="mt-3 text-sm font-bold text-amber-600 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-70"
    >
      {reinit === "envoi" ? "Envoi…"
        : reinit === "ok" ? "Lien envoyé ✓ — consultez votre boîte (et les courriers indésirables)"
        : reinit === "attendre" ? "Patientez une minute, puis réessayez"
        : "Mot de passe oublié ? Recevoir un lien"}
    </button>
  );

  return (
    <div className="min-h-screen bg-[slate-950] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border p-8 rounded-[32px] shadow-2xl relative z-10"
      >
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 via-rose-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">
            {success ? "Vérifiez vos mails !" : (isLogin ? "Bon retour !" : "Rejoignez-nous")}
          </h1>
          <p className="text-muted-foreground">
            {success 
              ? "Un lien de confirmation vous a été envoyé." 
              : "Accédez à votre espace Politique, C'est Simple."}
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-emerald-900 text-sm leading-relaxed">
              Nous avons envoyé un e-mail à <strong>{email}</strong>. Cliquez sur le lien pour valider votre compte.
              Il peut mettre une minute à arriver ; pensez à regarder dans les courriers indésirables.
            </p>
            <div>{boutonRenvoi}</div>
            <button
              onClick={() => setSuccess(false)}
              className="mt-6 text-emerald-600 text-sm font-bold hover:underline"
            >
              Retour à la connexion
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Adresse E-mail</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email"
                  required
                  placeholder="exemple@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Mot de passe</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-200 text-xs font-medium leading-tight">{error}</p>
                  {nonConfirme && boutonRenvoi}
                  {(dejaInscrit || /incorrect/.test(error)) && <div>{boutonReinit}</div>}
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-rose-600 to-amber-600 hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Se connecter" : "Créer un compte"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Mot de passe oublié : il n'existait aucun moyen de le réinitialiser. */}
            {isLogin && !dejaInscrit && !/incorrect/.test(error) && (
              <div className="text-center">{boutonReinit}</div>
            )}

            {/* Switch Mode */}
            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Star className="w-3 h-3 text-amber-500" />
          <span>Accès premium sécurisé par Supabase</span>
        </div>
      </motion.div>

      {/* Return Home */}
      <Link 
        href="/"
        className="absolute top-8 left-8 text-muted-foreground hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        Retour à l'accueil
      </Link>
    </div>
  );
}
