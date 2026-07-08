import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-warning" /> Coming in the next phase
          </CardTitle>
          <CardDescription>
            This module is scaffolded and will be enabled in an upcoming build phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The database schema, roles and shell are ready. Feature UI (forms, tables, workflows) is delivered per the
          approved plan.
        </CardContent>
      </Card>
    </div>
  );
}
