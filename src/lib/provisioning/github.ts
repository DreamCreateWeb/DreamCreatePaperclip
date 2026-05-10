import { Octokit } from "@octokit/rest";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return new Octokit({ auth: token });
}

function templateOwner(): string {
  return process.env.GITHUB_TEMPLATE_OWNER ?? "DreamCreateWeb";
}

function templateRepo(): string {
  return process.env.GITHUB_TEMPLATE_REPO ?? "DreamCreate-Master-Template";
}

export async function cloneTemplateRepo(
  slug: string,
): Promise<{ repoUrl: string }> {
  const octokit = getOctokit();
  const owner = templateOwner();

  const response = await octokit.request(
    "POST /repos/{template_owner}/{template_repo}/generate",
    {
      template_owner: owner,
      template_repo: templateRepo(),
      owner,
      name: `clinic-${slug}`,
      private: false,
      include_all_branches: false,
    },
  );

  return { repoUrl: response.data.html_url };
}

export async function deleteRepo(slug: string): Promise<void> {
  const octokit = getOctokit();
  await octokit.repos.delete({
    owner: templateOwner(),
    repo: `clinic-${slug}`,
  });
}
