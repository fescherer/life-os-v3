import { invoke } from "@tauri-apps/api/core";
import {
  BadgePlus,
  ImagePlus,
  Pencil,
  PlusCircle,
  Save,
  Search,
  Star,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
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

type Review = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  media_type: string;
  status: string;
  rating: number;
  review_text: string;
  image_path: string;
  image_src: string;
  media_type_label: string;
  media_type_color: string;
  status_label: string;
  status_color: string;
};

type DataSection = "media" | "status";

type ReviewsFeatureProps = {
  isDataDialogOpen: boolean;
  isEntryDialogOpen: boolean;
  onCloseDataDialog: () => void;
  onCloseEntryDialog: () => void;
};

function ReviewsFeature({
  isDataDialogOpen,
  isEntryDialogOpen,
  onCloseDataDialog,
  onCloseEntryDialog,
}: ReviewsFeatureProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mediaTypes, setMediaTypes] = useState<SelectOption[]>([]);
  const [statuses, setStatuses] = useState<SelectOption[]>([]);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [mediaFilter, setMediaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadReviewsData() {
    const [reviewItems, mediaOptions, statusOptions] = await Promise.all([
      invoke<Review[]>("list_reviews"),
      invoke<SelectOption[]>("list_review_media_type_options"),
      invoke<SelectOption[]>("list_review_status_options"),
    ]);

    setReviews(reviewItems);
    setMediaTypes(mediaOptions);
    setStatuses(statusOptions);
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadReviewsData().catch(error => setStatus(String(error)));
    });
  }, []);

  const filteredReviews = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesMedia = mediaFilter === "all" || review.media_type === mediaFilter;
      const matchesStatus = statusFilter === "all" || review.status === statusFilter;
      const matchesSearch = !normalizedSearch
        || [
          review.name,
          review.media_type_label,
          review.status_label,
        ].some(value => value.toLowerCase().includes(normalizedSearch));

      return matchesMedia && matchesStatus && matchesSearch;
    });
  }, [mediaFilter, reviews, search, statusFilter]);

  async function handleSaved() {
    await loadReviewsData();
    onCloseEntryDialog();
    setEditingReview(null);
  }

  async function handleDataChanged() {
    await loadReviewsData();
  }

  async function removeReview(id: string) {
    try {
      await invoke("remove_review", { id });
      setStatus("");
      await loadReviewsData();
    }
    catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <>
      <section className="rounded-md border border-border bg-sidebar p-3">
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_13rem_13rem]">
            <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-muted-foreground">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                onChange={event => setSearch(event.currentTarget.value)}
                placeholder="Search reviews..."
                value={search}
              />
            </label>

            <Select onValueChange={setMediaFilter} value={mediaFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All media</SelectItem>
                {mediaTypes.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {statuses.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,18rem))] gap-3">
            {filteredReviews.map(review => (
              <ReviewCard
                key={review.id}
                onEdit={() => setEditingReview(review)}
                onRemove={() => removeReview(review.id)}
                onView={() => setViewingReview(review)}
                review={review}
              />
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground">
              No reviews found.
            </div>
          )}
        </div>
      </section>

      {status && <p className="mt-3 text-xs text-destructive">{status}</p>}

      {isEntryDialogOpen && (
        <ReviewFormDialog
          mediaTypes={mediaTypes}
          onClose={onCloseEntryDialog}
          onSaved={handleSaved}
          statuses={statuses}
        />
      )}

      {editingReview && (
        <ReviewFormDialog
          mediaTypes={mediaTypes}
          onClose={() => setEditingReview(null)}
          onSaved={handleSaved}
          review={editingReview}
          statuses={statuses}
        />
      )}

      {isDataDialogOpen && (
        <ReviewsDataDialog
          mediaTypes={mediaTypes}
          onChanged={handleDataChanged}
          onClose={onCloseDataDialog}
          statuses={statuses}
        />
      )}

      {viewingReview && (
        <ReviewImageDialog
          onClose={() => setViewingReview(null)}
          review={viewingReview}
        />
      )}
    </>
  );
}

function ReviewCard({
  onEdit,
  onRemove,
  onView,
  review,
}: {
  onEdit: () => void;
  onRemove: () => void;
  onView: () => void;
  review: Review;
}) {
  function handleCardClick() {
    if (review.image_src) {
      onView();
    }
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!review.image_src) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView();
    }
  }

  return (
    <article
      aria-label={review.image_src ? `View image for ${review.name}` : review.name}
      className={[
        "group relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-card shadow-sm",
        review.image_src ? "cursor-zoom-in" : "",
      ].join(" ")}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={review.image_src ? "button" : undefined}
      tabIndex={review.image_src ? 0 : undefined}
    >
      <div
        className={[
          "absolute inset-0",
          review.image_src ? "pointer-events-none" : "",
        ].join(" ")}
      >
        {review.image_src
          ? (
              <img
                alt={review.name}
                className="h-full w-full object-cover"
                src={review.image_src}
              />
            )
          : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <ImagePlus aria-hidden="true" className="size-16 text-muted-foreground" strokeWidth={1.4} />
              </div>
            )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/5" />

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          aria-label="Edit review"
          className="flex size-8 items-center justify-center rounded-md bg-black/55 text-white transition hover:bg-black/75"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Remove review"
          className="flex size-8 items-center justify-center rounded-md bg-black/55 text-white transition hover:bg-black/75"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-2 p-4 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full border border-white/70"
            style={{ backgroundColor: review.media_type_color }}
          />
          <h2 className="truncate text-base leading-5">{review.name}</h2>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span
            className="max-w-full truncate rounded-md px-2 py-1 text-white shadow-sm"
            style={{ backgroundColor: review.status_color }}
          >
            {review.status_label}
          </span>
          <span className="text-sm">
            {review.rating}
            /10
          </span>
          <RatingStars rating={review.rating} />
        </div>
      </div>
    </article>
  );
}

function ReviewImageDialog({ onClose, review }: { onClose: () => void; review: Review }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-2rem)] overflow-hidden p-4 md:max-w-3xl">
        <DialogHeader className="mb-2 pb-2 pr-8">
          <DialogTitle className="grid gap-1">
            <span className="truncate">{review.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {`${review.media_type_label} - ${review.status_label}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-5rem)] gap-3 overflow-auto md:grid-cols-[minmax(13rem,18rem)_minmax(16rem,1fr)]">
          <div className="grid content-start rounded-md border border-border bg-card p-3">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <p className="text-xs text-muted-foreground">Media</p>
                  <p className="truncate text-sm text-foreground">{review.media_type_label}</p>
                </div>

                <div className="grid gap-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="truncate text-sm text-foreground">{review.status_label}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">Rating</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {review.rating}
                    /10
                  </span>
                  <RatingStars rating={review.rating} />
                </div>
              </div>

              <div className="flex items-center justify-center border-t border-border pt-3">
                {review.image_src
                  ? (
                      <img
                        alt={review.name}
                        className="max-h-[calc(92vh-14rem)] max-w-full object-contain"
                        src={review.image_src}
                      />
                    )
                  : (
                      <ImagePlus aria-hidden="true" className="size-16 text-muted-foreground" strokeWidth={1.5} />
                    )}
              </div>
            </div>
          </div>

          <aside className="grid max-h-[calc(92vh-5rem)] content-start gap-3 overflow-auto rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Review</p>
            {review.review_text.trim() && (
              <p className="whitespace-pre-wrap text-xs leading-5 text-foreground">
                {review.review_text}
              </p>
            )}
            {!review.review_text.trim() && (
              <p className="text-xs leading-5 text-muted-foreground">
                No written review yet.
              </p>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewFormDialog({
  mediaTypes,
  onClose,
  onSaved,
  review,
  statuses,
}: {
  mediaTypes: SelectOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  review?: Review;
  statuses: SelectOption[];
}) {
  const isEditing = Boolean(review);
  const [name, setName] = useState(review?.name ?? "");
  const [mediaType, setMediaType] = useState(() => review?.media_type ?? mediaTypes[0]?.value ?? "");
  const [reviewStatus, setReviewStatus] = useState(() => review?.status ?? statuses[0]?.value ?? "");
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [reviewText, setReviewText] = useState(review?.review_text ?? "");
  const [imageSourcePath, setImageSourcePath] = useState("");
  const [error, setError] = useState("");
  const selectedMediaType = mediaType || mediaTypes[0]?.value || "";
  const selectedStatus = reviewStatus || statuses[0]?.value || "";

  async function selectImage() {
    try {
      const selectedPath = await invoke<string>("select_review_image");
      setImageSourcePath(selectedPath);
      setError("");
    }
    catch (selectError) {
      setError(String(selectError));
    }
  }

  async function saveReview() {
    try {
      const payload = {
        image_source_path: imageSourcePath || null,
        media_type: selectedMediaType,
        name,
        rating,
        review_text: reviewText,
        status: selectedStatus,
      };

      if (review) {
        await invoke("update_review", {
          review: {
            ...payload,
            id: review.id,
          },
        });
      }
      else {
        await invoke("add_review", { review: payload });
      }
      setError("");
      await onSaved();
    }
    catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <Modal onClose={onClose} title={isEditing ? "Edit review" : "New review"}>
      <div className="grid gap-7">
        <div className="grid gap-5">
          <Field label="Name">
            <input
              className="h-8 rounded-md border border-border bg-card px-3 text-xs outline-none"
              onChange={event => setName(event.currentTarget.value)}
              placeholder="Perfect Blue"
              value={name}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Media type">
              <Select onValueChange={setMediaType} value={selectedMediaType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent>
                  {mediaTypes.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select onValueChange={setReviewStatus} value={selectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Rating">
            <StarRatingInput onChange={setRating} value={rating} />
          </Field>

          <Field label="Review">
            <textarea
              className="min-h-24 resize-none rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 outline-none"
              onChange={event => setReviewText(event.currentTarget.value)}
              placeholder="Optional notes about this media"
              value={reviewText}
            />
          </Field>

          <Field label="Image">
            <button
              className="flex h-8 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-left text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              onClick={selectImage}
              type="button"
            >
              <span className="truncate">
                {imageSourcePath || (review?.image_path ? "Keep current image" : "Select image")}
              </span>
              <ImagePlus aria-hidden="true" className="size-4 shrink-0" />
            </button>
          </Field>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-4">
          <button
            className="text-sm text-muted-foreground transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex h-9 min-w-44 items-center justify-center gap-3 rounded-md bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary/90"
            disabled={!selectedMediaType || !selectedStatus}
            onClick={saveReview}
            type="button"
          >
            {isEditing
              ? <Save aria-hidden="true" className="size-5" />
              : <BadgePlus aria-hidden="true" className="size-5" />}
            {isEditing ? "Save review" : "Add review"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewsDataDialog({
  mediaTypes,
  onChanged,
  onClose,
  statuses,
}: {
  mediaTypes: SelectOption[];
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  statuses: SelectOption[];
}) {
  const [activeSection, setActiveSection] = useState<DataSection>("media");

  return (
    <Modal onClose={onClose} title="Manage review data">
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
          <button
            className={[
              "flex h-8 items-center justify-center gap-2 rounded-md px-3 text-xs transition",
              activeSection === "media" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveSection("media")}
            type="button"
          >
            <Tags aria-hidden="true" className="size-4" />
            Media
          </button>
          <button
            className={[
              "flex h-8 items-center justify-center gap-2 rounded-md px-3 text-xs transition",
              activeSection === "status" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveSection("status")}
            type="button"
          >
            <Tags aria-hidden="true" className="size-4" />
            Status
          </button>
        </div>

        {activeSection === "media" && (
          <OptionManager
            addCommand="add_review_media_type_option"
            emptyLabel="No media types registered."
            invokeKey="mediaType"
            onChanged={onChanged}
            options={mediaTypes}
            placeholder="New media type"
            removeCommand="remove_review_media_type_option"
            updateCommand="update_review_media_type_option"
          />
        )}

        {activeSection === "status" && (
          <OptionManager
            addCommand="add_review_status_option"
            emptyLabel="No statuses registered."
            invokeKey="status"
            onChanged={onChanged}
            options={statuses}
            placeholder="New status"
            removeCommand="remove_review_status_option"
            updateCommand="update_review_status_option"
          />
        )}
      </div>

      <button
        className="mt-8 text-sm text-muted-foreground transition hover:text-foreground"
        onClick={onClose}
        type="button"
      >
        Cancel
      </button>
    </Modal>
  );
}

function OptionManager({
  addCommand,
  emptyLabel,
  invokeKey,
  onChanged,
  options,
  placeholder,
  removeCommand,
  updateCommand,
}: {
  addCommand: string;
  emptyLabel: string;
  invokeKey: string;
  onChanged: () => void | Promise<void>;
  options: SelectOption[];
  placeholder: string;
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
        [invokeKey]: { color: newColor, label: newLabel },
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
        [invokeKey]: option,
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
                  const label = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, label },
                  }));
                }}
                value={draft.label}
              />
              <input
                className="h-9 w-full rounded-md border border-border bg-sidebar p-1"
                onChange={(event) => {
                  const color = event.currentTarget.value;

                  setDraftOptions(current => ({
                    ...current,
                    [option.value]: { ...draft, color },
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
          placeholder={placeholder}
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
          Add
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div aria-label={`${rating / 2} stars`} className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(100, ((rating - index * 2) / 2) * 100));

        return (
          <span className="relative block size-4 text-white/35" key={index}>
            <Star aria-hidden="true" className="size-4 fill-current" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden text-[#f2a900]" style={{ width: `${fill}%` }}>
              <Star aria-hidden="true" className="size-4 fill-current" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StarRatingInput({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.max(0, Math.min(100, ((value - index * 2) / 2) * 100));

          return (
            <span className="relative block size-7 text-muted-foreground" key={index}>
              <Star aria-hidden="true" className="size-7 fill-current" strokeWidth={1.5} />
              <span className="absolute inset-0 overflow-hidden text-[#f2a900]" style={{ width: `${fill}%` }}>
                <Star aria-hidden="true" className="size-7 fill-current" strokeWidth={1.5} />
              </span>
              <button
                aria-label={`${index + 0.5} stars`}
                className="absolute inset-y-0 left-0 w-1/2"
                onClick={() => onChange(index * 2 + 1)}
                type="button"
              />
              <button
                aria-label={`${index + 1} stars`}
                className="absolute inset-y-0 right-0 w-1/2"
                onClick={() => onChange(index * 2 + 2)}
                type="button"
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {(value / 2).toFixed(1)}
        /5
      </span>
      <button
        className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
        onClick={() => onChange(0)}
        type="button"
      >
        Clear
      </button>
    </div>
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
              aria-label="Close"
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

export default ReviewsFeature;
