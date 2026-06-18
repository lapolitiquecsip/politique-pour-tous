import PromisesClient from "./PromisesClient";

export function generateStaticParams() {
  return [
    { id: "emmanuel-macron" },
    { id: "gabriel-attal" }
  ];
}

export default function Page() {
  return <PromisesClient />;
}
