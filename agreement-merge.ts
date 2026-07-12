import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fills a { curly-brace } merge field template (e.g. the loan agreement
 * .docx uploaded under Admin → Document Templates) with real loan data,
 * entirely in the browser — the file never leaves the user's machine
 * except to be fetched from and, when replaced, uploaded back to
 * Supabase Storage.
 */

export type AgreementMergeData = Record<string, string>;

export async function downloadTemplateFile(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from("document-templates").download(filePath);
  if (error || !data) throw new Error(error?.message ?? "Failed to download template file");
  return await data.arrayBuffer();
}

export function mergeAgreementDocx(templateBuffer: ArrayBuffer, data: AgreementMergeData): Blob {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Missing fields render as blank rather than the literal word
    // "undefined" on a document a customer is about to sign.
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
