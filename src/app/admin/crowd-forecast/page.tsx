import { getCrowdSettings } from "@/app/actions/crowdSettings";
import CrowdForecastAdmin from "./CrowdForecastAdmin";

export default async function CrowdForecastAdminPage() {
  const settings = await getCrowdSettings();
  return <CrowdForecastAdmin settings={settings} />;
}
