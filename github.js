// GitHub API相关功能模块

/**
 * 向GitHub仓库提交空提交，将payload存储在提交消息中
 * @param {Object} env - 环境变量对象
 * @param {string} payload - 要存储的payload
 * @returns {Promise<Object|null>} 提交信息或null
 */
export async function commitEmptyToGitHub(env, payload) {
  console.log("[commitEmptyToGitHub] 开始GitHub提交流程");

  const owner = env.REPO_OWNER;
  const repo = env.REPO_NAME;
  const branch = env.REPO_BRANCH || "main";
  const token = env.GITHUB_TOKEN; // secret

  console.log(
    `[commitEmptyToGitHub] 环境变量检查 - owner: ${owner}, repo: ${repo}, branch: ${branch}, token存在: ${!!token}`
  );

  if (!owner || !repo || !token) {
    console.log("[commitEmptyToGitHub] 缺少必要的环境变量");
    return null;
  }

  try {
    // First, get the current commit SHA for the branch
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(
      branch
    )}`;
    console.log(`[commitEmptyToGitHub] 获取分支信息: ${branchUrl}`);

    const branchResp = await fetch(branchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    console.log(
      `[commitEmptyToGitHub] 分支请求状态: ${branchResp.status} ${branchResp.statusText}`
    );

    if (!branchResp.ok) {
      const errorText = await branchResp.text();
      console.log(`[commitEmptyToGitHub] 获取分支失败: ${errorText}`);
      return null;
    }

    const branchData = await branchResp.json();
    const parentSha = branchData.object.sha;
    console.log(`[commitEmptyToGitHub] 获取到父提交SHA: ${parentSha}`);

    // Get the parent commit details to extract the tree SHA
    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`;
    console.log(`[commitEmptyToGitHub] 获取父提交详情: ${commitUrl}`);

    const commitResp = await fetch(commitUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "slink-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!commitResp.ok) {
      const errorText = await commitResp.text();
      console.log(`[commitEmptyToGitHub] 获取父提交详情失败: ${errorText}`);
      return null;
    }

    const parentCommitData = await commitResp.json();
    const treeSha = parentCommitData.tree.sha;
    console.log(`[commitEmptyToGitHub] 获取到父提交的树SHA: ${treeSha}`);

    // Create an empty commit with the payload in the subject
    const commitMessage = `slink:${payload}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
    const body = {
      message: commitMessage,
      tree: treeSha, // Use the same tree as parent (empty commit)
      parents: [parentSha],
    };

    console.log(
      `[commitEmptyToGitHub] 创建提交 - URL: ${url}, message长度: ${commitMessage.length}`
    );

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

    console.log(
      `[commitEmptyToGitHub] 提交请求状态: ${resp.status} ${resp.statusText}`
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      console.log(`[commitEmptyToGitHub] 创建提交失败: ${errorText}`);
      return null;
    }

    const commitData = await resp.json();
    const commitSha = commitData.sha;
    console.log(`[commitEmptyToGitHub] 提交创建成功，SHA: ${commitSha}`);

    // Update the branch reference to point to the new commit
    const updateRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(
      branch
    )}`;
    const updateRefBody = {
      sha: commitSha,
    };

    console.log(`[commitEmptyToGitHub] 更新分支引用: ${updateRefUrl}`);

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

    console.log(
      `[commitEmptyToGitHub] 分支更新状态: ${updateResp.status} ${updateResp.statusText}`
    );

    if (!updateResp.ok) {
      const errorText = await updateResp.text();
      console.log(`[commitEmptyToGitHub] 更新分支失败: ${errorText}`);
      return null;
    }

    console.log(
      `[commitEmptyToGitHub] GitHub提交流程完成，返回SHA: ${commitSha}`
    );
    return { sha: commitSha };
  } catch (error) {
    console.error("[commitEmptyToGitHub] GitHub提交过程中发生错误:", error);
    return null;
  }
}
