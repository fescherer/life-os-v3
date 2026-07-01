export type NoteFile = {
  name: string;
  file_type: string;
  data: string;
};

export type Note = {
  id: number;
  body: string;
  images: string[];
  files: NoteFile[];
  created_at: string;
  updated_at: string;
};
