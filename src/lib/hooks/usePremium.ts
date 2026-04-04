"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePremium() {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkPremium() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsPremium(false);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      if (error) {
        console.warn("Erreur usePremium:", error.message);
        setIsPremium(false);
      } else {
        setIsPremium(data?.is_premium || false);
      }
      
      setLoading(false);
    }

    checkPremium();

    // S'abonner aux changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        checkPremium();
      } else {
        setUserId(null);
        setIsPremium(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isPremium, loading, userId };
}
