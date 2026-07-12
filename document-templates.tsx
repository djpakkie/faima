import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Upload, Download, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/document-templates")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "administrator")
      .maybeSingle();
    if (!r) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Document templates — Faima Cash Solutions" }] }),
  component: DocumentTemplatesAdmin,
});

type Template = {
  id: string;
  key: string;
  name: string;
  file_path: string;
  file_name: string;
  size_bytes: number | null;
  updated_at: string;
};

// The set of templates the system knows how to generate. Add an entry here
// (and matching merge logic where it's used) to support another document.
const KNOWN_TEMPLATES: Array<{ key: string; name: string; description: string }> = [
  {
    key: "loan_agreement",
    name: "Loan Agreement",
    description:
      "Generated from an approved application on the Applications page. Upload a .docx with { curly-brace } merge fields — see the notes page in the template for the exact field names.",
  },
];

function DocumentTemplatesAdmin() {
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("document_templates").select("*");
    if (error) toast.error(error.message);
    const byKey: Record<string, Template> = {};
    for (const t of (data ?? []) as unknown as Template[]) byKey[t.key] = t;
    setTemplates(byKey);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const upload = async (key: string, name: string, file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please upload a .docx Word document.");
      return;
    }
    setBusyKey(key);
    const { data: userData } = await supabase.auth.getUser();
    const path = `${key}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: upErr } = await supabase.storage.from("document-templates").upload(path, file, {
      contentType:
        file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
    if (upErr) {
      setBusyKey(null);
      toast.error(upErr.message);
      return;
    }

    const existing = templates[key];
    const payload = {
      key,
      name,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: userData.user?.id ?? null,
    };

    const { error: dbErr } = existing
      ? await supabase.from("document_templates").update(payload).eq("id", existing.id)
      : await supabase.from("document_templates").insert(payload);

    if (dbErr) {
      toast.error(dbErr.message);
      await supabase.storage.from("document-templates").remove([path]);
      setBusyKey(null);
      return;
    }

    // Clean up the old file now that the new one is safely referenced.
    if (existing) await supabase.storage.from("document-templates").remove([existing.file_path]);

    await logAudit("document.upload", {
      entity: "document_template",
      meta: { key, file_name: file.name },
    });
    setBusyKey(null);
    toast.success(`${name} template uploaded.`);
    void load();
  };

  const download = async (t: Template) => {
    const { data, error } = await supabase.storage
      .from("document-templates")
      .createSignedUrl(t.file_path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (t: Template) => {
    setBusyKey(t.key);
    const { error: sErr } = await supabase.storage.from("document-templates").remove([t.file_path]);
    if (sErr) toast.error(sErr.message);
    const { error } = await supabase.from("document_templates").delete().eq("id", t.id);
    setBusyKey(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("document.delete", { entity: "document_template", meta: { key: t.key } });
    toast.success("Template removed.");
    void load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Document templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload the master Word documents staff generate filled copies from.
        </p>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {KNOWN_TEMPLATES.map(({ key, name, description }) => {
            const t = templates[key];
            const busy = busyKey === key;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {name}
                    {t ? (
                      <Badge variant="outline">Uploaded</Badge>
                    ) : (
                      <Badge variant="secondary">Not set</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t ? (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="font-medium text-foreground truncate">{t.file_name}</div>
                      <div>Updated {formatDateTime(t.updated_at)}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No template uploaded yet — this document can&apos;t be generated until one is.
                    </p>
                  )}

                  <input
                    ref={(el) => {
                      fileInputs.current[key] = el;
                    }}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(key, name, file);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => fileInputs.current[key]?.click()}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1" />
                      )}
                      {t ? "Replace" : "Upload"}
                    </Button>
                    {t && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => download(t)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Download
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(t)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
