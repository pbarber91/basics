import { Button } from "@/components/ui/button";

export default function SessionGuide({
  onlineUrl,
  pdfUrl,
}: { onlineUrl: string; pdfUrl: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">Session Guide</h3>
      <p className="text-sm text-muted-foreground">
        Read online or download a fillable PDF.
      </p>
      <div className="mt-3 flex gap-2">
        <a href={onlineUrl} target="_blank" rel="noreferrer">
          <Button size="sm">Read online</Button>
        </a>
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">Download PDF</Button>
        </a>
      </div>
    </div>
  );
}
