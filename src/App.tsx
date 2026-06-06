import { useState } from "react";
import "./App.css";
import BackupFeature from "./features/backup";
import NotesFeature from "./features/notes";

type FeatureId = "notes" | "backup";

const features: Array<{ id: FeatureId; label: string }> = [
  { id: "notes", label: "Notes" },
  { id: "backup", label: "Backup" },
];

function App() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("notes");

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <div className="flex flex-1 flex-col-reverse md:flex-row">
        <section className="flex-1 px-6 py-8 md:px-10 md:py-10">
          {activeFeature === "notes" && <NotesFeature />}
          {activeFeature === "backup" && <BackupFeature />}
        </section>

        <aside className="border-b border-border bg-card px-4 py-4 text-card-foreground md:w-56 md:border-b-0 md:border-l">
          <div className="flex items-center justify-between gap-4 md:block">
            <h2 className="text-lg font-semibold md:mb-5">Life OS</h2>
            <nav className="flex gap-2 md:grid">
              {features.map(feature => (
                <button
                  className={[
                    "rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                    activeFeature === feature.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  type="button"
                >
                  {feature.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      <footer className="border-t border-border bg-card px-6 py-3 text-center text-xs text-muted-foreground">
        Created by Fennec Tales
      </footer>
    </main>
  );
}

export default App;
