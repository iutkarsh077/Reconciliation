import GithubConnect from "../../../components/GithubConnect";

export const metadata = {
  title: "Connect GitHub",
  description:
    "Sign in with your GitHub account to connect repositories and enable automated AI code reviews on Pull Requests.",
  alternates: {
    canonical: "/login",
  },
};

const LoginPage = () => {
  return (
    <>
      <GithubConnect />
    </>
  );
};

export default LoginPage;