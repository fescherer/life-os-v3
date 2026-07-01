import type { NoteFile } from "./types";

export function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function readFile(file: File) {
  return new Promise<NoteFile>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      data: String(reader.result),
      file_type: file.type,
      name: file.name,
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
