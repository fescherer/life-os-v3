import {
  Archive,
  BadgePlus,
  Bell,
  Box,
  Calendar,
  CircleDollarSign,
  DollarSign,
  Download,
  Home,
  Landmark,
  PencilLine,
  Settings,
  Sparkles,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import AssetsFeature from "./features/assets";
import BackupFeature from "./features/backup";
import CoinCollectionFeature from "./features/coin-collection";
import FinancialFeature from "./features/financial";
import NotesFeature from "./features/notes";
import PackagingFeature from "./features/packaging";
import RemindersFeature, { ReminderAlerts } from "./features/reminders";
import WarehouseFeature from "./features/warehouse";

type FeatureId
  = | "home"
    | "notes"
    | "habits"
    | "financial"
    | "assets"
    | "coin-collection"
    | "gogo-collection"
    | "packaging"
    | "reminders"
    | "reviews"
    | "warehouse"
    | "configuration"
    | "backup";

type NavItem = {
  id: FeatureId;
  icon: LucideIcon;
  label: string;
};

const navItems: NavItem[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "notes", icon: PencilLine, label: "Notes" },
  { id: "habits", icon: Sparkles, label: "Habits" },
  { id: "financial", icon: DollarSign, label: "Financial" },
  { id: "assets", icon: Landmark, label: "Assets" },
  { id: "coin-collection", icon: CircleDollarSign, label: "Coin Collection" },
  { id: "gogo-collection", icon: Calendar, label: "Gogo Collection" },
  { id: "packaging", icon: Box, label: "Packaging" },
  { id: "reminders", icon: Bell, label: "Reminders" },
  { id: "reviews", icon: Archive, label: "Reviews" },
  { id: "warehouse", icon: Warehouse, label: "Warehouse" },
];

const featureTitles: Record<FeatureId, { title: string; description: string }> = {
  "assets": {
    title: "Assets page",
    description: "Manage your tracked assets",
  },
  "backup": {
    title: "Backup page",
    description: "Export or restore your Life OS data",
  },
  "configuration": {
    title: "Configuration page",
    description: "Adjust your workspace settings",
  },
  "coin-collection": {
    title: "Coin Collection",
    description: "Manage your coin collection",
  },
  "financial": {
    title: "Financial page",
    description: "Manage your expenses and incomes",
  },
  "gogo-collection": {
    title: "Gogo Collection page",
    description: "Catalog your Gogo collection",
  },
  "habits": {
    title: "Habits page",
    description: "Track habits and routines",
  },
  "home": {
    title: "Home page",
    description: "Your Life OS dashboard",
  },
  "notes": {
    title: "Notes page",
    description: "Quick SQLite-backed notes",
  },
  "packaging": {
    title: "Packaging page",
    description: "Manage packages and materials",
  },
  "reminders": {
    title: "Reminders page",
    description: "Review upcoming reminders",
  },
  "reviews": {
    title: "Reviews page",
    description: "Keep track of reviews",
  },
  "warehouse": {
    title: "Warehouse page",
    description: "Manage stored items",
  },
};

function App() {
  const [activeFeature, setActiveFeature] = useState<FeatureId>("financial");
  const [isAssetsDataOpen, setIsAssetsDataOpen] = useState(false);
  const [isAssetsEntryOpen, setIsAssetsEntryOpen] = useState(false);
  const [isCoinDataOpen, setIsCoinDataOpen] = useState(false);
  const [isCoinEntryOpen, setIsCoinEntryOpen] = useState(false);
  const [isFinancialDataOpen, setIsFinancialDataOpen] = useState(false);
  const [isFinancialEntryOpen, setIsFinancialEntryOpen] = useState(false);
  const [isPackagingDataOpen, setIsPackagingDataOpen] = useState(false);
  const [isPackagingEntryOpen, setIsPackagingEntryOpen] = useState(false);
  const [isReminderEntryOpen, setIsReminderEntryOpen] = useState(false);
  const [isWarehouseDataOpen, setIsWarehouseDataOpen] = useState(false);
  const [isWarehouseEntryOpen, setIsWarehouseEntryOpen] = useState(false);
  const activeTitle = featureTitles[activeFeature];

  return (
    <main className="flex min-h-screen flex-col bg-background font-mono font-bold text-foreground antialiased">
      <div className="flex min-h-0 flex-1 gap-3 px-3 py-2">
        <aside className="flex w-40 shrink-0 flex-col rounded border border-border bg-sidebar px-2 py-4 text-sidebar-foreground">
          <img
            alt="Life OS"
            className="mb-6 h-auto w-36"
            src="/Logo.svg"
          />

          <nav className="flex flex-1 flex-col gap-3.5">
            {navItems.map((item) => {
              const NavIcon = item.icon;

              return (
                <button
                  className={[
                    "flex h-7 w-full items-center gap-3 rounded-md px-2 text-left text-xs leading-none transition",
                    activeFeature === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-secondary hover:text-foreground",
                  ].join(" ")}
                  key={item.id}
                  onClick={() => setActiveFeature(item.id)}
                  type="button"
                >
                  <NavIcon aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            className={[
              "flex h-7 w-full items-center gap-3 rounded-md px-2 text-left text-xs leading-none transition",
              activeFeature === "configuration"
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-secondary hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveFeature("configuration")}
            type="button"
          >
            <Settings aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
            <span className="truncate">Configuration</span>
          </button>
        </aside>

        <section className="min-w-0 flex-1 px-1 pt-3">
          <header className="flex items-start justify-between gap-6 border-b border-border pb-4">
            <div>
              <h1 className="text-xl leading-none tracking-normal">{activeTitle.title}</h1>
              <p className="mt-2 text-sm leading-none text-muted-foreground">
                {activeTitle.description}
              </p>
            </div>

            {(activeFeature === "financial" || activeFeature === "assets" || activeFeature === "coin-collection" || activeFeature === "warehouse" || activeFeature === "packaging") && (
              <div className="flex shrink-0 gap-5">
                <button
                  className="flex h-10 min-w-52 items-center justify-center gap-4 rounded-md border border-primary bg-secondary px-4 text-sm text-secondary-foreground shadow-sm transition hover:bg-accent"
                  onClick={() => {
                    if (activeFeature === "coin-collection") {
                      setIsCoinDataOpen(true);
                      return;
                    }

                    if (activeFeature === "assets") {
                      setIsAssetsDataOpen(true);
                      return;
                    }

                    if (activeFeature === "warehouse") {
                      setIsWarehouseDataOpen(true);
                      return;
                    }

                    if (activeFeature === "packaging") {
                      setIsPackagingDataOpen(true);
                      return;
                    }

                    setIsFinancialDataOpen(true);
                  }}
                  type="button"
                >
                  <Download aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                  Gerenciar dados
                </button>
                <button
                  className="flex h-10 min-w-52 items-center justify-center gap-4 rounded-md border border-primary bg-primary px-4 text-sm text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  onClick={() => {
                    if (activeFeature === "coin-collection") {
                      setIsCoinEntryOpen(true);
                      return;
                    }

                    if (activeFeature === "assets") {
                      setIsAssetsEntryOpen(true);
                      return;
                    }

                    if (activeFeature === "warehouse") {
                      setIsWarehouseEntryOpen(true);
                      return;
                    }

                    if (activeFeature === "packaging") {
                      setIsPackagingEntryOpen(true);
                      return;
                    }

                    setIsFinancialEntryOpen(true);
                  }}
                  type="button"
                >
                  <BadgePlus aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                  {activeFeature === "financial" ? "Novo lancamento" : "New Item"}
                </button>
              </div>
            )}

            {activeFeature === "reminders" && (
              <button
                className="flex h-10 min-w-52 items-center justify-center gap-4 rounded-md border border-primary bg-primary px-4 text-sm text-primary-foreground shadow-sm transition hover:bg-primary/90"
                onClick={() => setIsReminderEntryOpen(true)}
                type="button"
              >
                <BadgePlus aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                New reminder
              </button>
            )}
          </header>

          <div className="pt-6">
            {activeFeature === "home" && <ReminderAlerts />}
            {activeFeature === "assets" && (
              <AssetsFeature
                isDataDialogOpen={isAssetsDataOpen}
                isEntryDialogOpen={isAssetsEntryOpen}
                onCloseDataDialog={() => setIsAssetsDataOpen(false)}
                onCloseEntryDialog={() => setIsAssetsEntryOpen(false)}
              />
            )}
            {activeFeature === "financial" && (
              <FinancialFeature
                isDataDialogOpen={isFinancialDataOpen}
                isEntryDialogOpen={isFinancialEntryOpen}
                onCloseDataDialog={() => setIsFinancialDataOpen(false)}
                onCloseEntryDialog={() => setIsFinancialEntryOpen(false)}
              />
            )}
            {activeFeature === "coin-collection" && (
              <CoinCollectionFeature
                isDataDialogOpen={isCoinDataOpen}
                isEntryDialogOpen={isCoinEntryOpen}
                onCloseDataDialog={() => setIsCoinDataOpen(false)}
                onCloseEntryDialog={() => setIsCoinEntryOpen(false)}
              />
            )}
            {activeFeature === "notes" && <NotesFeature />}
            {activeFeature === "packaging" && (
              <PackagingFeature
                isDataDialogOpen={isPackagingDataOpen}
                isEntryDialogOpen={isPackagingEntryOpen}
                onCloseDataDialog={() => setIsPackagingDataOpen(false)}
                onCloseEntryDialog={() => setIsPackagingEntryOpen(false)}
              />
            )}
            {activeFeature === "reminders" && (
              <RemindersFeature
                isEntryDialogOpen={isReminderEntryOpen}
                onCloseEntryDialog={() => setIsReminderEntryOpen(false)}
              />
            )}
            {activeFeature === "warehouse" && (
              <WarehouseFeature
                isDataDialogOpen={isWarehouseDataOpen}
                isEntryDialogOpen={isWarehouseEntryOpen}
                onCloseDataDialog={() => setIsWarehouseDataOpen(false)}
                onCloseEntryDialog={() => setIsWarehouseEntryOpen(false)}
              />
            )}
            {activeFeature === "backup" && <BackupFeature />}
          </div>
        </section>
      </div>

      <footer className="flex h-14 items-center justify-center border border-border bg-sidebar px-6 text-center text-xs leading-none text-muted-foreground">
        Created by Fennec Tales
      </footer>
    </main>
  );
}

export default App;
