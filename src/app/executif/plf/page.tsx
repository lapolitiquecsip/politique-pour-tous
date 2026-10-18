import type { Metadata } from "next";
import PlfExplorer from "@/components/executif/plf/PlfExplorer";

export const metadata: Metadata = {
  title: "Budget 2027 : le PLF décrypté",
  description:
    "Le projet de loi de finances pour 2027 en analyse simple ou détaillée, comparé aux PLF 2026, 2025 et 2024. Chiffres tirés des textes officiels déposés à l'Assemblée nationale.",
};

export default function PlfPage() {
  return (
    <main className="min-h-screen bg-muted pb-20 pt-28">
      <PlfExplorer />
    </main>
  );
}
