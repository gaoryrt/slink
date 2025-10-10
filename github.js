// GitHub API相关功能模块

/**
 * 向GitHub仓库提交空提交，将payload存储在提交消息中
 * @param {Object} env - 环境变量对象
 * @param {string} payload - 要存储的payload
 * @returns {Promise<Object|null>} 提交信息或null
 */
export async function commitEmptyToGitHub(env, payload) {
  const owner = env.REPO_OWNER;
  const repo = env.REPO_NAME;
  const branch = env.REPO_BRANCH || "main";
  const token = env.GITHUB_TOKEN; // secret

  if (!owner || !repo || !token) {
    return null;
  }

  try {
    // First, get the current commit SHA for the branch
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(
      branch
    )}`;

    const branchResp = await fetch(branchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!branchResp.ok) {
      return null;
    }

    const branchData = await branchResp.json();
    const parentSha = branchData.object.sha;

    // Get the parent commit details to extract the tree SHA
    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`;

    const commitResp = await fetch(commitUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!commitResp.ok) {
      return null;
    }

    const parentCommitData = await commitResp.json();
    const treeSha = parentCommitData.tree.sha;

    // Create an empty commit with the payload in the subject
    const commitMessage = `slink:${payload}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
    const body = {
      message: commitMessage,
      tree: treeSha, // Use the same tree as parent (empty commit)
      parents: [parentSha],
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return null;
    }

    const commitData = await resp.json();
    const commitSha = commitData.sha;

    // Update the branch reference to point to the new commit
    const updateRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(
      branch
    )}`;
    const updateRefBody = {
      sha: commitSha,
    };

    const updateResp = await fetch(updateRefUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(updateRefBody),
    });

    if (!updateResp.ok) {
      return null;
    }

    return { sha: commitSha };
  } catch (error) {
    return null;
  }
}
