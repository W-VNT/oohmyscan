// ============================================================================
// Font.register Roboto (via CDN fontsource).
// En Deno / Supabase Edge Runtime les fonts standards PDF (Helvetica etc.)
// ne se chargent pas via le mecanisme interne @react-pdf/pdfkit. On registre
// explicitement Roboto (400 + 700) depuis un CDN stable. Validation via le
// pilote generate-contract-pdf-pilot.
// ============================================================================
import { Font } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf", fontWeight: 700 },
  ],
});
