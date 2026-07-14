import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { formatDate, formatDateTime, formatNAD } from "@/lib/format";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Loader2, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { CustomerFormDialog } from "./customers.index";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({ meta: [{ title: "Customer — Faima Cash Solutions" }] }),
  component: CustomerDetail,
});

type Customer = {
  id: string;
  customer_number: string;
  full_name: string;
  id_number: string;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  physical_address: string | null;
  postal_address: string | null;
  employer: string | null;
  employment_status: string | null;
  occupation: string | null;
  monthly_income: number | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Doc = {
  id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const DOC_TYPES = [
  { value: "id_document", label: "ID Document" },
  { value: "payslip", label: "Payslip" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "proof_of_residence", label: "Proof of Residence" },
  { value: "employment_letter", label: "Employment Letter" },
  { value: "other", label: "Other" },
];

function CustomerDetail() {
  const { customerId } = useParams({ from: "/_authenticated/customers/$customerId" });
  const { hasAnyRole, isAdmin } = useAuth();
  const canEdit = hasAnyRole(["administrator", "loan_officer"]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: c, error: ce }, { data: d, error: de }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).single(),
      supabase.from("customer_documents").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
    ]);
    if (ce) toast.error(ce.message);
    if (de) toast.error(de.message);
    setCustomer((c as Customer) ?? null);
    setDocs((d ?? []) as Doc[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to customers</Link>
        <p className="text-sm text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Customers</Link>
          <h1 className="text-2xl font-display font-semibold tracking-tight">{customer.full_name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{customer.customer_number}</span>
            <span>•</span>
            <Badge variant="outline">{customer.status}</Badge>
          </div>
        </div>
        {canEdit && (
          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogTrigger asChild><Button variant="outline"><Pencil className="h-4 w-4 mr-1" /> Edit</Button></DialogTrigger>
            <CustomerFormDialog
              initial={{
                id: customer.id,
                full_name: customer.full_name,
                id_number: customer.id_number,
                date_of_birth: customer.date_of_birth ?? "",
                gender: customer.gender ?? "",
                marital_status: customer.marital_status ?? "",
                phone: customer.phone,
                alt_phone: customer.alt_phone ?? "",
                email: customer.email ?? "",
                physical_address: customer.physical_address ?? "",
                postal_address: customer.postal_address ?? "",
                employer: customer.employer ?? "",
                employment_status: customer.employment_status ?? "",
                occupation: customer.occupation ?? "",
                monthly_income: customer.monthly_income != null ? String(customer.monthly_income) : "",
                bank_name: customer.bank_name ?? "",
                bank_account_number: customer.bank_account_number ?? "",
                bank_branch_code: customer.bank_branch_code ?? "",
                next_of_kin_name: customer.next_of_kin_name ?? "",
                next_of_kin_phone: customer.next_of_kin_phone ?? "",
                next_of_kin_relationship: customer.next_of_kin_relationship ?? "",
                status: customer.status as "active" | "inactive" | "blacklisted",
                notes: customer.notes ?? "",
              }}
              onClose={() => setOpenEdit(false)}
              onSaved={() => { setOpenEdit(false); void load(); }}
            />
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InfoCard title="Personal">
              <Info label="Full name" value={customer.full_name} />
              <Info label="ID / Passport" value={customer.id_number} />
              <Info label="Date of birth" value={formatDate(customer.date_of_birth)} />
              <Info label="Gender" value={customer.gender ?? "—"} />
              <Info label="Marital status" value={customer.marital_status ?? "—"} />
            </InfoCard>
            <InfoCard title="Contact">
              <Info label="Phone" value={customer.phone} />
              <Info label="Alt phone" value={customer.alt_phone ?? "—"} />
              <Info label="Email" value={customer.email ?? "—"} />
              <Info label="Physical address" value={customer.physical_address ?? "—"} />
              <Info label="Postal address" value={customer.postal_address ?? "—"} />
            </InfoCard>
            <InfoCard title="Employment">
              <Info label="Employer" value={customer.employer ?? "—"} />
              <Info label="Status" value={customer.employment_status ?? "—"} />
              <Info label="Occupation" value={customer.occupation ?? "—"} />
              <Info label="Monthly income" value={customer.monthly_income != null ? formatNAD(Number(customer.monthly_income)) : "—"} />
            </InfoCard>
            <InfoCard title="Banking">
              <Info label="Bank" value={customer.bank_name ?? "—"} />
              <Info label="Account #" value={customer.bank_account_number ?? "—"} />
              <Info label="Branch code" value={customer.bank_branch_code ?? "—"} />
            </InfoCard>
            <InfoCard title="Next of kin">
              <Info label="Name" value={customer.next_of_kin_name ?? "—"} />
              <Info label="Phone" value={customer.next_of_kin_phone ?? "—"} />
              <Info label="Relationship" value={customer.next_of_kin_relationship ?? "—"} />
            </InfoCard>
            <InfoCard title="Record">
              <Info label="Created" value={formatDateTime(customer.created_at)} />
              <Info label="Updated" value={formatDateTime(customer.updated_at)} />
              {customer.notes && <Info label="Notes" value={customer.notes} />}
            </InfoCard>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <DocumentsPanel customerId={customer.id} customerNumber={customer.customer_number} docs={docs} canEdit={canEdit} isAdmin={isAdmin} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className="col-span-2 break-words">{value}</span>
    </div>
  );
}

// ---------------------- Documents ----------------------

function DocumentsPanel({
  customerId, customerNumber, docs, canEdit, isAdmin, onChanged,
}: {
  customerId: string;
  customerNumber: string;
  docs: Doc[];
  canEdit: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [docType, setDocType] = useState("id_document");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 15MB limit.`);
        continue;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${customerNumber}/${docType}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from("customer-documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) { toast.error(upErr.message); continue; }
      const { error: insErr } = await supabase.from("customer_documents").insert({
        customer_id: customerId,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (insErr) {
        toast.error(insErr.message);
        await supabase.storage.from("customer-documents").remove([path]);
        continue;
      }
      await logAudit("document.upload", { entity: "customer", entity_id: customerId, meta: { doc_type: docType, file_name: file.name } });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    onChanged();
    toast.success("Upload complete.");
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("customer-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { toast.error(error?.message ?? "Failed to create link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (d: Doc) => {
    const { error: sErr } = await supabase.storage.from("customer-documents").remove([d.file_path]);
    if (sErr) toast.error(sErr.message);
    const { error } = await supabase.from("customer_documents").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("document.delete", { entity: "customer", entity_id: customerId, meta: { doc_id: d.id } });
    toast.success("Document deleted.");
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer documents</CardTitle>
        <CardDescription>KYC & supporting documents. Max 15MB per file.</CardDescription>
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Badge variant="outline">{DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type}</Badge></TableCell>
                <TableCell className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[280px]">{d.file_name}</span>
                  {d.size_bytes != null && <span className="text-xs text-muted-foreground">({Math.round(d.size_bytes / 1024)} KB)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(d.created_at)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete document?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes {d.file_name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(d)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No documents uploaded yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
