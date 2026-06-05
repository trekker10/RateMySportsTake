import { getShowAccounts } from "@/app/actions/show-accounts";
import ShowAccountsPanel from "./ShowAccountsPanel";

export default async function ShowAccountsPage() {
  const accounts = await getShowAccounts();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Show Accounts</h1>
        <p className="mt-1 text-gray-500">
          X/Twitter accounts that post quotes and clips from analysts you track.
          Takes scraped from these accounts get attributed to the analyst being quoted,
          not the show itself.
        </p>
      </div>
      <ShowAccountsPanel initialAccounts={accounts} />
    </div>
  );
}
