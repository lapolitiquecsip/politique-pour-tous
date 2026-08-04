import FaqSection from "@/components/home/FaqSection";

export const metadata = {
  title: "FAQ — La Politique Pour Tous",
  description: "Questions fréquentes : d'où proviennent les données, neutralité du site, abonnement premium…",
};

export default function FaqPage() {
  return (
    <main className="min-h-screen">
      <FaqSection />
    </main>
  );
}
