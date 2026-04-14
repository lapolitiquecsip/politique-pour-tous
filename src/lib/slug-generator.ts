/**
 * Robust slug generator that removes accents and special characters
 */
export function generateSlug(firstName: string, lastName: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "-")      // Replace anything not alnum with -
      .replace(/-+/g, "-")            // Deduplicate -
      .replace(/^-|-$/g, "");         // Remove leading/trailing -
  
  return `${normalize(firstName)}-${normalize(lastName)}`;
}
