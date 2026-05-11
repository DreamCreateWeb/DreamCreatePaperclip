import { Octokit } from "@octokit/rest";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN (or GH_TOKEN) is not set");
  return new Octokit({ auth: token });
}

function templateOwner(): string {
  return process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
}

export async function getRepoId(slug: string): Promise<number> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.get({
    owner: templateOwner(),
    repo: `dreamcreate-${slug}`,
  });
  return data.id;
}

export async function deleteRepo(slug: string): Promise<void> {
  const octokit = getOctokit();
  await octokit.repos.delete({
    owner: templateOwner(),
    repo: `dreamcreate-${slug}`,
  });
}
