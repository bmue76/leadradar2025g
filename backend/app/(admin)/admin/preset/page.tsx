import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminPresetAliasPage() {
  redirect("/admin/presets");
}
