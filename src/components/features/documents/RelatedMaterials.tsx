import { documentsRepository } from "@/lib/db/repositories/documents";
import { ResourceCard } from "./ResourceCard";

interface RelatedMaterialsProps {
  documentId: string;
  categoryId: string | null;
}

export async function RelatedMaterials({ documentId, categoryId }: RelatedMaterialsProps) {
  const related = await documentsRepository.getRelated(documentId, categoryId, 6);
  if (!related.length) return null;

  return (
    <section>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Related Materials
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {related.map((doc) => (
          <ResourceCard
            key={doc.id}
            document={doc}
            variant="compact"
            className="shrink-0"
          />
        ))}
      </div>
    </section>
  );
}