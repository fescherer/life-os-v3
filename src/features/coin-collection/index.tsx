import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  BadgePlus,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  MinusCircle,
  Pencil,
  Palette,
  PlusCircle,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type SelectOption = {
  value: string;
  label: string;
  color: string;
};

type Coin = {
  id: string;
  created_at: string;
  updated_at: string;
  value: string;
  period: string;
  family: string;
  numista_id: string;
  description: string;
  image_path: string;
  image_src: string;
  in_collection: boolean;
  family_label: string;
  family_color: string;
};

type CoinCollectionFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

function CoinCollectionFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: CoinCollectionFeatureProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [families, setFamilies] = useState<SelectOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editingCoin, setEditingCoin] = useState<Coin | null>(null);
  const [viewingCoin, setViewingCoin] = useState<Coin | null>(null);

  async function loadCoinData() {
    const [coinOptions, coinFamilyOptions] = await Promise.all([
      invoke<Coin[]>("list_coins"),
      invoke<SelectOption[]>("list_coin_family_options"),
    ]);

    setCoins(coinOptions);
    setFamilies(coinFamilyOptions);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadCoinData().catch(error => setStatus(String(error)));
    });
  }, []);

  const filteredCoins = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return coins;
    }

    return coins.filter(coin =>
      [
        coin.value,
        coin.period,
        coin.family_label,
        coin.numista_id,
        coin.description,
      ].some(value => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [coins, search]);

  const collectionTotals = useMemo(() => {
    const collected = coins.filter(coin => coin.in_collection).length;

    return {
      collected,
      missing: coins.length - collected,
      total: coins.length,
    };
  }, [coins]);

  async function handleChanged() {
    await loadCoinData();
  }

  async function handleCoinCreated() {
    await loadCoinData();
    onCloseEntryDialog();
  }

  async function toggleCoinCollection(coin: Coin) {
    await invoke("update_coin_collection", {
      update: {
        id: coin.id,
        in_collection: !coin.in_collection,
      },
    });
    await loadCoinData();
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Total" value={String(collectionTotals.total)} />
            <SummaryCard label="Na coleção" value={String(collectionTotals.collected)} />
            <SummaryCard label="Faltando" value={String(collectionTotals.missing)} />
          </div>

          <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-muted-foreground">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              onChange={event => setSearch(event.currentTarget.value)}
              placeholder="Pesquisar..."
              value={search}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredCoins.map(coin => (
              <CoinCard
                coin={coin}
                key={coin.id}
                onEdit={() => setEditingCoin(coin)}
                onToggle={() => {
                  toggleCoinCollection(coin).catch(error => setStatus(String(error)));
                }}
                onView={() => setViewingCoin(coin)}
              />
            ))}
          </div>

          {filteredCoins.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
              Nenhuma moeda encontrada.
            </div>
          )}
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isDataDialogOpen && (
        <FamilyDataDialog
          families={families}
          onChanged={handleChanged}
          onClose={onCloseDataDialog}
        />
      )}

      {isEntryDialogOpen && (
        <CoinFormDialog
          families={families}
          onClose={onCloseEntryDialog}
          onSaved={handleCoinCreated}
        />
      )}

      {editingCoin && (
        <CoinFormDialog
          coin={editingCoin}
          families={families}
          onClose={() => setEditingCoin(null)}
          onSaved={async () => {
            await loadCoinData();
            setEditingCoin(null);
          }}
        />
      )}

      {viewingCoin && (
        <CoinImageDialog
          coin={viewingCoin}
          onClose={() => setViewingCoin(null)}
        />
      )}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl text-foreground">{value}</p>
    </div>
  );
}

function CoinCard({
  coin,
  onEdit,
  onToggle,
  onView,
}: {
  coin: Coin;
  onEdit: () => void;
  onToggle: () => void;
  onView: () => void;
}) {
  const imageSrc = coin.image_src;

  async function openNumistaPage() {
    if (!coin.numista_id.trim()) {
      return;
    }

    await openUrl(`https://en.numista.com/${coin.numista_id.trim()}`);
  }

  return (
    <article
      className={[
        "grid min-h-64 rounded-md border border-border p-3 transition",
        coin.in_collection ? "bg-accent text-accent-foreground" : "bg-card text-card-foreground",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{coin.period}</p>
          <h2 className="mt-1 truncate text-sm text-foreground">{coin.value}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{coin.family_label}</p>
          <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted-foreground">
            {coin.description || "Sem descrição"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Abrir Numista"
            className="flex size-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary disabled:opacity-40"
            disabled={!coin.numista_id.trim()}
            onClick={() => {
              openNumistaPage().catch(console.error);
            }}
            type="button"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label="Editar moeda"
            className="flex size-6 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
            onClick={onEdit}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <button
        aria-label={`Ver imagem de ${coin.value}`}
        className={[
          "my-3 flex h-64 items-center justify-center overflow-hidden rounded-sm bg-sidebar transition",
          imageSrc ? "cursor-zoom-in hover:bg-secondary" : "cursor-default",
        ].join(" ")}
        disabled={!imageSrc}
        onClick={onView}
        type="button"
      >
        {imageSrc
          ? (
              <img
                alt={coin.value}
                className="h-full w-full object-contain"
                src={imageSrc}
              />
            )
          : (
              <ImagePlus aria-hidden="true" className="size-10 text-muted-foreground" strokeWidth={1.5} />
            )}
      </button>

      <button
        className={[
          "mt-auto flex h-9 items-center justify-center gap-3 rounded-md px-3 text-xs transition",
          coin.in_collection
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground hover:bg-accent",
        ].join(" ")}
        onClick={onToggle}
        type="button"
      >
        {coin.in_collection
          ? <MinusCircle aria-hidden="true" className="size-5" />
          : <CheckCircle2 aria-hidden="true" className="size-5" />}
        {coin.in_collection ? "Remove from collection" : "Add to collection"}
      </button>
    </article>
  );
}

function CoinImageDialog({ coin, onClose }: { coin: Coin; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[95vh] max-w-[calc(100vw-2rem)] overflow-hidden p-4 md:max-w-5xl">
        <DialogHeader className="mb-3 pb-3 pr-8">
          <DialogTitle className="grid gap-1">
            <span className="truncate">{coin.value}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {`${coin.period} - ${coin.family_label}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[calc(95vh-6rem)] min-h-72 items-center justify-center overflow-auto rounded-sm bg-card p-3">
          {coin.image_src
            ? (
                <img
                  alt={coin.value}
                  className="max-h-[calc(95vh-8rem)] max-w-full object-contain"
                  src={coin.image_src}
                />
              )
            : (
                <ImagePlus aria-hidden="true" className="size-16 text-muted-foreground" strokeWidth={1.5} />
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoinFormDialog({
  coin,
  families,
  onClose,
  onSaved,
}: {
  coin?: Coin;
  families: SelectOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(coin);
  const [value, setValue] = useState(coin?.value ?? "");
  const [period, setPeriod] = useState(coin?.period ?? "");
  const [family, setFamily] = useState(() => coin?.family ?? families[0]?.value ?? "");
  const [numistaId, setNumistaId] = useState(coin?.numista_id ?? "");
  const [description, setDescription] = useState(coin?.description ?? "");
  const [imageSourcePath, setImageSourcePath] = useState("");
  const [inCollection, setInCollection] = useState(coin?.in_collection ?? false);
  const [error, setError] = useState("");
  const selectedFamily = family || families[0]?.value || "";

  async function selectImage() {
    try {
      const selectedPath = await invoke<string>("select_coin_image");
      setImageSourcePath(selectedPath);
      setError("");
    }
    catch (selectError) {
      setError(String(selectError));
    }
  }

  async function saveCoin() {
    try {
      if (coin) {
        await invoke("update_coin", {
          coin: {
            id: coin.id,
            description,
            family: selectedFamily,
            image_source_path: imageSourcePath || null,
            in_collection: inCollection,
            numista_id: numistaId,
            period,
            value,
          },
        });
      }
      else {
        await invoke("add_coin", {
          coin: {
            description,
            family: selectedFamily,
            image_source_path: imageSourcePath || null,
            in_collection: inCollection,
            numista_id: numistaId,
            period,
            value,
          },
        });
      }
      setError("");
      await onSaved();
    }
    catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <Modal onClose={onClose} title={isEditing ? "Editar moeda" : "Nova moeda"}>
      <div className="grid gap-7">
        <div className="grid gap-5">
          <Field label="Value">
            <input
              className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
              onChange={event => setValue(event.currentTarget.value)}
              placeholder="2000 Reis"
              value={value}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Periodo">
              <input
                className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
                onChange={event => setPeriod(event.currentTarget.value)}
                placeholder="1906-1912"
                value={period}
              />
            </Field>
            <Field label="Numista ID">
              <input
                className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
                onChange={event => setNumistaId(event.currentTarget.value)}
                placeholder="330"
                value={numistaId}
              />
            </Field>
          </div>

          <Field label="Familia">
            <Select onValueChange={setFamily} value={selectedFamily}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar familia" />
              </SelectTrigger>
              <SelectContent>
                {families.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Descricao">
            <textarea
              className="min-h-16 resize-none rounded-md border border-border bg-card px-3 py-2 text-xs outline-none"
              onChange={event => setDescription(event.currentTarget.value)}
              placeholder="400 anos do imperador"
              value={description}
            />
          </Field>

          <Field label="Imagem">
            <button
              className="flex h-8 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              onClick={selectImage}
              type="button"
            >
              <span className="truncate">
                {imageSourcePath || (coin?.image_path ? "Manter imagem atual" : "Selecionar imagem")}
              </span>
              <ImagePlus aria-hidden="true" className="size-4 shrink-0" />
            </button>
          </Field>

          <label className="flex items-center gap-3 text-xs text-muted-foreground">
            <input
              checked={inCollection}
              className="size-4 accent-primary"
              onChange={event => setInCollection(event.currentTarget.checked)}
              type="checkbox"
            />
            Ja esta na colecao
          </label>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button
            className="text-sm text-muted-foreground transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex h-9 min-w-52 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90"
            onClick={saveCoin}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Salvar moeda" : "Adicionar moeda"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function FamilyDataDialog({
  families,
  onChanged,
  onClose,
}: {
  families: SelectOption[];
  onChanged: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState(false);
  const title = activeSection ? "Gerenciar dados- Famílias" : "Gerenciar dados";

  return (
    <Modal onClose={onClose} title={title}>
      <div className="min-h-96">
        {!activeSection && (
          <div className="grid gap-6 md:grid-cols-2">
            <DataSectionCard
              icon={Tags}
              label="Famílias"
              onClick={() => setActiveSection(true)}
            />
            <DataSectionCard
              icon={Palette}
              label="Cores"
              onClick={() => setActiveSection(true)}
            />
          </div>
        )}

        {activeSection && (
          <>
            <button
              className="mb-8 flex h-9 items-center gap-3 rounded-md px-1 text-sm text-muted-foreground transition hover:text-foreground"
              onClick={() => setActiveSection(false)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
              Voltar
            </button>
            <OptionManager
              addCommand="add_coin_family_option"
              emptyLabel="Nenhuma família cadastrada."
              options={families}
              removeCommand="remove_coin_family_option"
              updateCommand="update_coin_family_option"
              onChanged={onChanged}
            />
          </>
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
  icon: LucideIcon;
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

function OptionManager({
  addCommand,
  emptyLabel,
  onChanged,
  options,
  removeCommand,
  updateCommand,
}: {
  addCommand: string;
  emptyLabel: string;
  onChanged: () => void | Promise<void>;
  options: SelectOption[];
  removeCommand: string;
  updateCommand: string;
}) {
  const [draftOptions, setDraftOptions] = useState<Record<string, SelectOption>>({});
  const [newColor, setNewColor] = useState("#4f4749");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  async function addOption() {
    try {
      await invoke<SelectOption[]>(addCommand, {
        family: { color: newColor, label: newLabel },
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
        family: option,
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
                  const labelValue = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, label: labelValue },
                  }));
                }}
                value={draft.label}
              />
              <input
                className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
                onChange={(event) => {
                  const colorValue = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, color: colorValue },
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
          placeholder="Nova família"
          value={newLabel}
        />
        <input
          className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
          onChange={event => setNewColor(event.currentTarget.value)}
          type="color"
          value={newColor}
        />
        <button
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs text-primary-foreground"
          onClick={addOption}
          type="button"
        >
          <PlusCircle aria-hidden="true" className="size-4" />
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
  children: ReactNode;
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
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{title}</span>
            <button
              aria-label="Fechar"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default CoinCollectionFeature;
