import ListRepoPage from "../components/ListRepos";

export const metadata = {
  title: "Dashboard - Your Repositories",
  description:
    "Manage and enable automated AI code reviews across your GitHub repositories. Monitor review status and configure webhook triggers.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div className="min-h-full">
      <ListRepoPage />
    </div>
  );
}