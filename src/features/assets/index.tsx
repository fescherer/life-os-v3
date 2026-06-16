import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  ArrowDownToLine,
  BadgePlus,
  BriefcaseBusiness,
  Building2,
  Pencil,
  PlusCircle,
  Search,
  Save,
  Store,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

type AssetRegisterType = "dividend" | "buy" | "sell";
type DataSection = "assets" | "banks" | "types";

type SelectOption = {
  value: string;
  label: string;
  color: string;
};

type Asset = {
  id: string;
  created_at: string;
  updated_at: string;
  ticker: string;
  type: string;
  full_name: string;
  type_label: string;
  type_color: string;
};

type AssetRegister = {
  id: string;
  created_at: string;
  updated_at: string;
  type: AssetRegisterType;
  date: string;
  bank: string;
  quantity: number;
  price: number;
  asset: string;
  bank_label: string;
  bank_color: string;
  asset_ticker: string;
  asset_full_name: string;
  asset_type: string;
  asset_type_label: string;
  asset_type_color: string;
};

type AssetsFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

type PortfolioRow = {
  asset: Asset;
  quantity: number;
  total: number;
  average: number;
  dividends: number;
  dividendYield: number;
};

const registerTypes: Array<{
  icon: typeof ArrowDownToLine;
  label: string;
  value: AssetRegisterType;
}> = [
  { icon: ArrowDownToLine, label: "Income", value: "dividend" },
  { icon: TrendingUp, label: "Buy", value: "buy" },
  { icon: Store, label: "Sell", value: "sell" },
];

function AssetsFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: AssetsFeatureProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [banks, setBanks] = useState<SelectOption[]>([]);
  const [types, setTypes] = useState<SelectOption[]>([]);
  const [registers, setRegisters] = useState<AssetRegister[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [registerSearch, setRegisterSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [status, setStatus] = useState("");

  async function loadAssetsData() {
    const [assetOptions, bankOptions, typeOptions, assetRegisters] = await Promise.all([
      invoke<Asset[]>("list_assets"),
      invoke<SelectOption[]>("list_asset_bank_options"),
      invoke<SelectOption[]>("list_asset_type_options"),
      invoke<AssetRegister[]>("list_asset_registers"),
    ]);

    setAssets(assetOptions);
    setBanks(bankOptions);
    setTypes(typeOptions);
    setRegisters(assetRegisters);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadAssetsData().catch(error => setStatus(String(error)));
    });
  }, []);

  const portfolioRows = useMemo(
    () => buildPortfolioRows(assets, registers),
    [assets, registers],
  );

  const filteredPortfolioRows = useMemo(() => {
    const normalizedSearch = assetSearch.trim().toLowerCase();

    return portfolioRows.filter((row) => {
      const matchesType = assetTypeFilter === "all" || row.asset.type === assetTypeFilter;
      const matchesSearch = !normalizedSearch
        || [
          row.asset.ticker,
          row.asset.full_name,
          row.asset.type_label,
          formatCurrency(row.total),
          formatCurrency(row.dividends),
        ].some(value => value.toLowerCase().includes(normalizedSearch));

      return matchesType && matchesSearch;
    });
  }, [assetSearch, assetTypeFilter, portfolioRows]);

  const filteredRegisters = useMemo(() => {
    const normalizedSearch = registerSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return registers;
    }

    return registers.filter(register =>
      [
        register.asset_ticker,
        register.asset_full_name,
        register.bank_label,
        register.type,
        formatDisplayDate(register.date),
        formatCurrency(register.price),
      ].some(value => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [registerSearch, registers]);

  const totals = useMemo(() => {
    return portfolioRows.reduce(
      (summary, row) => ({
        dividends: summary.dividends + row.dividends,
        invested: summary.invested + row.total,
      }),
      { dividends: 0, invested: 0 },
    );
  }, [portfolioRows]);

  async function handleChanged() {
    await loadAssetsData();
  }

  async function handleEntryCreated() {
    await loadAssetsData();
    onCloseEntryDialog();
  }

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="grid gap-4 xl:col-span-6">
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="rounded-md border border-border bg-sidebar p-3 lg:col-span-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base text-foreground">Proventos</h2>
                <select className="h-8 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none">
                  <option>12 meses</option>
                  <option>6 meses</option>
                  <option>30 dias</option>
                </select>
              </div>
              <div className="mt-4 flex h-44 items-end gap-3 rounded-md border border-border px-2 pb-3">
                {Array.from({ length: 12 }, (_, index) => (
                  <div
                    className="w-full rounded-sm bg-primary"
                    key={index}
                    style={{ height: `${34 + ((index * 17) % 86)}px` }}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-md border border-border bg-sidebar p-3 lg:col-span-2">
              <h2 className="border-b border-border pb-3 text-base text-foreground">Carteira</h2>
              <div className="flex h-44 items-center justify-center">
                <div
                  aria-hidden="true"
                  className="size-36 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#4f4749 0 78%, #d8d0c3 78% 100%)",
                  }}
                />
              </div>
            </section>
          </div>

          <section className="min-h-96 rounded-md border border-border bg-sidebar p-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base">LanÃ§amentos</h2>
              <select className="h-8 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none">
                <option>Ãšltimos 30 dias</option>
                <option>Ãšltimos 12 meses</option>
                <option>Todos</option>
              </select>
            </div>

            <label className="mt-4 flex h-8 items-center gap-2 rounded-md border border-border px-2 text-muted-foreground">
              <Search aria-hidden="true" className="size-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                onChange={event => setRegisterSearch(event.currentTarget.value)}
                placeholder="Pesquisar ..."
                value={registerSearch}
              />
            </label>

            <div className="mt-6 overflow-x-auto border-t border-border pt-5">
              <table className="w-full min-w-xl text-left text-xs">
                <thead className="text-sm text-muted-foreground">
                  <tr>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Banco</th>
                    <th className="pb-3">Qtd</th>
                    <th className="pb-3">UnitÃ¡rio</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegisters.map(register => (
                    <tr key={register.id}>
                      <td className="py-2">{formatDisplayDate(register.date)}</td>
                      <td className="py-2">{registerTypeLabel(register.type)}</td>
                      <td className="py-2">
                        <span
                          className="rounded-full px-2 py-1 text-xs text-primary-foreground"
                          style={{ backgroundColor: register.bank_color }}
                        >
                          {register.bank_label}
                        </span>
                      </td>
                      <td className="py-2">{formatQuantity(register.quantity)}</td>
                      <td className="py-2">{formatCurrency(register.price)}</td>
                      <td className="py-2">{formatCurrency(totalForRegister(register))}</td>
                      <td className="py-2">{register.asset_ticker}</td>
                    </tr>
                  ))}
                  {filteredRegisters.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                        Nenhum lanÃ§amento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="min-h-[42rem] rounded-md border border-border bg-sidebar p-3 xl:col-span-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base">Ativos</h2>
            <select
              className="h-8 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setAssetTypeFilter(event.currentTarget.value)}
              value={assetTypeFilter}
            >
              <option value="all">Todos os ativos</option>
              {types.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-4 flex h-8 items-center gap-2 rounded-md border border-border px-2 text-muted-foreground">
            <Search aria-hidden="true" className="size-4" />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              onChange={event => setAssetSearch(event.currentTarget.value)}
              placeholder="Pesquisar ..."
              value={assetSearch}
            />
          </label>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs md:grid-cols-4">
            <SummaryTile label="Investido" value={formatCurrency(totals.invested)} />
            <SummaryTile label="Dividendos" value={formatCurrency(totals.dividends)} />
            <SummaryTile label="DY" value={`${formatPercent(safePercent(totals.dividends, totals.invested))}`} />
            <SummaryTile label="Ativos" value={String(portfolioRows.length)} />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-xl text-left text-xs">
              <thead className="text-sm text-muted-foreground">
                <tr>
                  <th className="pb-3">Ativo</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Qnt</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">MÃ©dia</th>
                  <th className="pb-3">DY</th>
                </tr>
              </thead>
              <tbody>
                {filteredPortfolioRows.map(row => (
                  <tr key={row.asset.id}>
                    <td className="py-2">{row.asset.ticker}</td>
                    <td className="py-2">{shortTypeLabel(row.asset.type_label)}</td>
                    <td className="py-2">{formatQuantity(row.quantity)}</td>
                    <td className="py-2">{formatCurrency(row.total)}</td>
                    <td className="py-2">{formatCurrency(row.average)}</td>
                    <td className="py-2">{formatPercent(row.dividendYield)}</td>
                  </tr>
                ))}
                {filteredPortfolioRows.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-muted-foreground" colSpan={6}>
                      Nenhum ativo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <EntryDialog
          assets={assets}
          banks={banks}
          onClose={onCloseEntryDialog}
          onCreated={handleEntryCreated}
        />
      )}

      {isDataDialogOpen && (
        <DataDialog
          assets={assets}
          banks={banks}
          onChanged={handleChanged}
          onClose={onCloseDataDialog}
          types={types}
        />
      )}
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <span className="block text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-sm text-foreground">{value}</strong>
    </div>
  );
}

function EntryDialog({
  assets,
  banks,
  onClose,
  onCreated,
}: {
  assets: Asset[];
  banks: SelectOption[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [registerType, setRegisterType] = useState<AssetRegisterType>("dividend");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [asset, setAsset] = useState(() => assets[0]?.id ?? "");
  const [bank, setBank] = useState(() => banks[0]?.value ?? "");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const total = parseCurrencyToCents(price) * parseQuantity(quantity);

  async function submitEntry() {
    const priceInCents = parseCurrencyToCents(price);
    const parsedQuantity = parseQuantity(quantity);

    if (!asset) {
      setError("Cadastre um ativo antes de criar lanÃ§amentos.");
      return;
    }

    if (!bank) {
      setError("Cadastre um banco antes de criar lanÃ§amentos.");
      return;
    }

    if (parsedQuantity <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }

    if (priceInCents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("add_asset_register", {
        register: {
          asset,
          bank,
          date,
          price: priceInCents,
          quantity: parsedQuantity,
          register_type: registerType,
        },
      });
      await onCreated();
    }
    catch (submitError) {
      setError(String(submitError));
    }
    finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Novo lanÃ§amento">
      <div className="mx-auto grid max-w-xl gap-7">
        <div className="grid grid-cols-3 rounded-md bg-muted p-1">
          {registerTypes.map((type) => {
            const TypeIcon = type.icon;

            return (
              <button
                className={[
                  "flex h-8 items-center justify-center gap-2 rounded text-xs",
                  registerType === type.value ? "bg-sidebar shadow-sm" : "text-foreground",
                ].join(" ")}
                key={type.value}
                onClick={() => setRegisterType(type.value)}
                type="button"
              >
                <TypeIcon aria-hidden="true" className="size-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-3 text-sm text-muted-foreground">
            Data
            <input
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setDate(event.currentTarget.value)}
              type="date"
              value={date}
            />
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Ativo
            <select
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setAsset(event.currentTarget.value)}
              value={asset}
            >
              {assets.map(option => (
                <option key={option.id} value={option.id}>
                  {shortTypeLabel(option.type_label)}
                  {" - "}
                  {option.ticker}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Banco
            <select
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              onChange={event => setBank(event.currentTarget.value)}
              value={bank}
            >
              {banks.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-3 text-sm text-muted-foreground">
            Quantidade
            <input
              className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
              inputMode="decimal"
              onChange={event => setQuantity(event.currentTarget.value)}
              placeholder="3"
              value={quantity}
            />
          </label>
        </div>

        <label className="grid gap-3 text-sm text-muted-foreground">
          {registerType === "dividend" ? "Valor por cota/aÃ§Ã£o" : "PreÃ§o unitÃ¡rio"}
          <input
            className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs text-foreground outline-none"
            inputMode="decimal"
            onChange={event => setPrice(event.currentTarget.value)}
            placeholder="R$ 40,00"
            value={price}
          />
        </label>

        <div className="grid gap-3 text-sm text-muted-foreground">
          Total
          <div className="flex h-9 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
            {formatCurrency(total)}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button className="text-sm text-muted-foreground" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="flex h-10 min-w-56 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={isSaving}
            onClick={submitEntry}
            type="button"
          >
            <BadgePlus aria-hidden="true" className="size-5" />
            Adicionar lanÃ§amento
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DataDialog({
  assets,
  banks,
  onChanged,
  onClose,
  types,
}: {
  assets: Asset[];
  banks: SelectOption[];
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  types: SelectOption[];
}) {
  const [activeSection, setActiveSection] = useState<DataSection | null>(null);
  const title = activeSection ? `Gerenciar dados- ${sectionLabel(activeSection)}` : "Gerenciar dados";

  return (
    <Modal onClose={onClose} title={title}>
      <div className="min-h-[28rem]">
        {!activeSection && (
          <div className="grid gap-8">
            <div className="grid gap-6 md:grid-cols-3">
              <DataSectionCard
                icon={BriefcaseBusiness}
                label="Assets"
                onClick={() => setActiveSection("assets")}
              />
              <DataSectionCard
                icon={Building2}
                label="Bancos"
                onClick={() => setActiveSection("banks")}
              />
              <DataSectionCard
                icon={Pencil}
                label="Tipos"
                onClick={() => setActiveSection("types")}
              />
            </div>
          </div>
        )}

        {activeSection && (
          <button
            className="mb-8 flex h-9 items-center gap-3 rounded-md px-1 text-sm text-muted-foreground transition hover:text-foreground"
            onClick={() => setActiveSection(null)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
            Voltar
          </button>
        )}

        {activeSection === "assets" && (
          <AssetManager assets={assets} onChanged={onChanged} types={types} />
        )}
        {activeSection === "banks" && (
          <OptionManager
            addCommand="add_asset_bank_option"
            emptyLabel="Nenhum banco cadastrado."
            options={banks}
            removeCommand="remove_asset_bank_option"
            title="Banco"
            updateCommand="update_asset_bank_option"
            onChanged={onChanged}
          />
        )}
        {activeSection === "types" && (
          <OptionManager
            addCommand="add_asset_type_option"
            emptyLabel="Nenhum tipo cadastrado."
            options={types}
            removeCommand="remove_asset_type_option"
            title="Tipo"
            updateCommand="update_asset_type_option"
            onChanged={onChanged}
          />
        )}

        <button
          className="mt-12 text-sm text-muted-foreground transition hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}

function DataSectionCard({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex aspect-square min-h-36 flex-col items-center justify-center gap-5 rounded-md border border-border bg-sidebar text-muted-foreground transition hover:bg-accent hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-16" strokeWidth={1.8} />
      <span className="text-base text-foreground">{label}</span>
    </button>
  );
}

function sectionLabel(section: DataSection) {
  const labels: Record<DataSection, string> = {
    assets: "Assets",
    banks: "Bancos",
    types: "Tipos",
  };

  return labels[section];
}

function AssetManager({
  assets,
  onChanged,
  types,
}: {
  assets: Asset[];
  onChanged: () => void | Promise<void>;
  types: SelectOption[];
}) {
  const [ticker, setTicker] = useState("");
  const [fullName, setFullName] = useState("");
  const [assetType, setAssetType] = useState(() => types[0]?.value ?? "");
  const [editing, setEditing] = useState<Record<string, Asset>>({});
  const [error, setError] = useState("");

  async function addAsset() {
    try {
      await invoke("add_asset", {
        asset: {
          asset_type: assetType,
          full_name: fullName,
          ticker,
        },
      });
      setTicker("");
      setFullName("");
      setError("");
      await onChanged();
    }
    catch (addError) {
      setError(String(addError));
    }
  }

  async function updateAsset(asset: Asset) {
    try {
      await invoke("update_asset", {
        asset: {
          asset_type: asset.type,
          full_name: asset.full_name,
          id: asset.id,
          ticker: asset.ticker,
        },
      });
      setEditing((current) => {
        const next = { ...current };
        delete next[asset.id];
        return next;
      });
      setError("");
      await onChanged();
    }
    catch (updateError) {
      setError(String(updateError));
    }
  }

  async function removeAsset(id: string) {
    try {
      await invoke("remove_asset", { id });
      setError("");
      await onChanged();
    }
    catch (removeError) {
      setError(String(removeError));
    }
  }

  return (
    <div className="grid max-w-2xl gap-0">
      <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_1fr_1.5fr_auto]">
        <select
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
          onChange={event => setAssetType(event.currentTarget.value)}
          value={assetType}
        >
          {types.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <input
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs uppercase outline-none"
          onChange={event => setTicker(event.currentTarget.value)}
          placeholder="Ticker"
          value={ticker}
        />
        <input
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
          onChange={event => setFullName(event.currentTarget.value)}
          placeholder="Nome completo"
          value={fullName}
        />
        <button
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs text-primary-foreground"
          onClick={addAsset}
          type="button"
        >
          <PlusCircle aria-hidden="true" className="size-4" />
          Adicionar
        </button>
      </div>

      <div className="grid max-h-80 overflow-y-auto pr-1">
        {assets.map((asset) => {
          const draft = editing[asset.id] ?? asset;

          return (
            <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_1fr_1.5fr_auto]" key={asset.id}>
              <select
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
                onChange={(event) => {
                  setEditing(current => ({
                    ...current,
                    [asset.id]: { ...draft, type: event.currentTarget.value },
                  }));
                }}
                value={draft.type}
              >
                {types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs uppercase outline-none"
                onChange={(event) => {
                  setEditing(current => ({
                    ...current,
                    [asset.id]: { ...draft, ticker: event.currentTarget.value },
                  }));
                }}
                value={draft.ticker}
              />
              <input
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
                onChange={(event) => {
                  setEditing(current => ({
                    ...current,
                    [asset.id]: { ...draft, full_name: event.currentTarget.value },
                  }));
                }}
                value={draft.full_name}
              />
              <div className="flex gap-2">
                <button
                  className="flex h-9 items-center justify-center rounded-md border border-border px-3"
                  onClick={() => updateAsset(draft)}
                  type="button"
                >
                  <Save aria-hidden="true" className="size-4" />
                </button>
                <button
                  className="flex h-9 items-center justify-center rounded-md border border-border px-3 text-destructive"
                  onClick={() => removeAsset(asset.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        {assets.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum ativo cadastrado.</p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OptionManager({
  addCommand,
  emptyLabel,
  onChanged,
  options,
  removeCommand,
  title,
  updateCommand,
}: {
  addCommand: string;
  emptyLabel: string;
  onChanged: () => void | Promise<void>;
  options: SelectOption[];
  removeCommand: string;
  title: string;
  updateCommand: string;
}) {
  const [draftOptions, setDraftOptions] = useState<Record<string, SelectOption>>({});
  const [newColor, setNewColor] = useState("#4f4749");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  async function addOption() {
    try {
      await invoke<SelectOption[]>(addCommand, {
        [title === "Tipo" ? "assetType" : "bank"]: { color: newColor, label: newLabel },
      });
      setNewLabel("");
      setError("");
      await onChanged();
    }
    catch (addError) {
      setError(String(addError));
    }
  }

  async function updateOption(option: SelectOption) {
    try {
      await invoke<SelectOption[]>(updateCommand, {
        [title === "Tipo" ? "assetType" : "bank"]: option,
      });
      setDraftOptions((current) => {
        const next = { ...current };
        delete next[option.value];
        return next;
      });
      setError("");
      await onChanged();
    }
    catch (updateError) {
      setError(String(updateError));
    }
  }

  async function removeOption(value: string) {
    try {
      await invoke<SelectOption[]>(removeCommand, { value });
      setError("");
      await onChanged();
    }
    catch (removeError) {
      setError(String(removeError));
    }
  }

  return (
    <div className="grid max-w-xl gap-0">
      <div className="grid">
        {options.map((option) => {
          const draft = draftOptions[option.value] ?? option;

          return (
            <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_4rem_2.75rem_2.75rem]" key={option.value}>
              <input
                className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
                onChange={(event) => {
                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, label: event.currentTarget.value },
                  }));
                }}
                value={draft.label}
              />
              <input
                className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
                onChange={(event) => {
                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, color: event.currentTarget.value },
                  }));
                }}
                type="color"
                value={draft.color}
              />
              <button
                className="flex h-9 items-center justify-center rounded-md border border-border"
                onClick={() => updateOption(draft)}
                type="button"
              >
                <Save aria-hidden="true" className="size-4" />
              </button>
              <button
                className="flex h-9 items-center justify-center rounded-md border border-border text-destructive"
                onClick={() => removeOption(option.value)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
        {options.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      <div className="grid gap-2 border-b border-border py-3 md:grid-cols-[1fr_4rem_auto]">
        <input
          className="h-9 rounded-md border border-border bg-sidebar px-3 text-xs outline-none"
          onChange={event => setNewLabel(event.currentTarget.value)}
          placeholder={`Novo ${title.toLowerCase()}`}
          value={newLabel}
        />
        <input
          className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
          onChange={event => setNewColor(event.currentTarget.value)}
          type="color"
          value={newColor}
        />
        <button
          className="h-9 rounded-md bg-primary px-4 text-xs text-primary-foreground"
          onClick={addOption}
          type="button"
        >
          Adicionar
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function buildPortfolioRows(assets: Asset[], registers: AssetRegister[]): PortfolioRow[] {
  return assets
    .map((asset) => {
      const assetRegisters = registers.filter(register => register.asset === asset.id);
      const quantity = assetRegisters.reduce((sum, register) => {
        if (register.type === "buy") {
          return sum + register.quantity;
        }

        if (register.type === "sell") {
          return sum - register.quantity;
        }

        return sum;
      }, 0);
      const total = assetRegisters.reduce((sum, register) => {
        if (register.type === "buy") {
          return sum + totalForRegister(register);
        }

        if (register.type === "sell") {
          return sum - totalForRegister(register);
        }

        return sum;
      }, 0);
      const dividends = assetRegisters
        .filter(register => register.type === "dividend")
        .reduce((sum, register) => sum + totalForRegister(register), 0);

      return {
        asset,
        average: quantity > 0 ? total / quantity : 0,
        dividendYield: safePercent(dividends, total),
        dividends,
        quantity,
        total,
      };
    })
    .sort((first, second) => first.asset.ticker.localeCompare(second.asset.ticker));
}

function totalForRegister(register: Pick<AssetRegister, "price" | "quantity">) {
  return Math.round(register.price * register.quantity);
}

function registerTypeLabel(type: AssetRegisterType) {
  const labels: Record<AssetRegisterType, string> = {
    buy: "Buy",
    dividend: "Income",
    sell: "Sell",
  };

  return labels[type];
}

function shortTypeLabel(label: string) {
  return label.split("-")[0].trim();
}

function safePercent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(value / 100);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8,
  }).format(value);
}

function parseCurrencyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized.replace(/[^\d.]/g, ""));

  if (Number.isNaN(number)) {
    return 0;
  }

  return Math.round(number * 100);
}

function parseQuantity(value: string) {
  const normalized = value.replace(",", ".");
  const number = Number(normalized.replace(/[^\d.]/g, ""));

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
}

export default AssetsFeature;
