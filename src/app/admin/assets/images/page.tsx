import { createAdminClient } from "@/lib/supabase/admin";
import ImagesAdmin from "./ImagesAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "assets";
const FOLDER = "images";

export interface AssetFile {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string;
}

export default async function ImagesAdminPage() {
  const supabase = createAdminClient();

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(FOLDER, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    // Bucket may not exist yet — render page with empty state and instructions
    return <ImagesAdmin initialFiles={[]} bucketMissing />;
  }

  const assets: AssetFile[] = (files ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const path = `${FOLDER}/${f.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return {
        name:      f.name,
        path,
        url:       data.publicUrl,
        size:      f.metadata?.size ?? 0,
        createdAt: f.created_at ?? "",
      };
    });

  return <ImagesAdmin initialFiles={assets} bucketMissing={false} />;
}
