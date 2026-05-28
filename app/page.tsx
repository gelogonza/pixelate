import { readdirSync } from "fs";
import path from "path";
import { LandingPage } from "@/components/LandingPage";

export default function HomePage() {
  const demoRoot = path.join(process.cwd(), "public", "demos");
  const entries = readdirSync(demoRoot, { withFileTypes: true });

  const demoVideos = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webm"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((name) => `/demos/${name}`);

  return <LandingPage demoVideos={demoVideos} />;
}
