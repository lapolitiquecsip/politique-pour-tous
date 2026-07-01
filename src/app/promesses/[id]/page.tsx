import PromisesClient from "./PromisesClient";

export function generateStaticParams() {
  return [{ id: "indisponible" }];
}

export default function Page() {
  return <PromisesClient />;
}
