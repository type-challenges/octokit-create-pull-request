import type { Octokit } from '@octokit/core'
import type { Changes, PullRequestOptions, State, CommitOptions } from './types'

import { createTree } from './create-tree'
import { createCommit } from './create-commit'

export async function PushCommit(
  octokit: Octokit,
  {
    owner,
    repo,
    base,
    head,
    createWhenEmpty,
    changes: changesOption,
    fresh,
  }: CommitOptions,
) {
  const changes = Array.isArray(changesOption)
    ? changesOption
    : [changesOption]

  if (changes.length === 0) {
    throw new Error(
      '[octokit-plugin-create-pull-request] "changes" cannot be an empty array',
    )
  }

  const state: State = { octokit, owner, repo }

  // https://developer.github.com/v3/repos/#get-a-repository
  const { data: repository } = await octokit.request(
    'GET /repos/:owner/:repo',
    {
      owner,
      repo,
    },
  )

  if (!repository.permissions) {
    throw new Error(
      '[octokit-plugin-create-pull-request] Missing authentication',
    )
  }

  if (!base)
    base = repository.default_branch

  // https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
  const {
    data: [latestCommit],
  } = await octokit.request('GET /repos/:owner/:repo/commits', {
    owner,
    repo,
    sha: base,
    per_page: 1,
  })

  state.latestCommitSha = latestCommit.sha
  state.latestCommitTreeSha = latestCommit.commit.tree.sha
  const baseCommitTreeSha = latestCommit.commit.tree.sha

  for (const change of changes) {
    let treeCreated = false
    if (change.files && Object.keys(change.files).length) {
      const latestCommitTreeSha = await createTree(
        state as Required<State>,
        change as Required<Changes>,
      )

      if (latestCommitTreeSha) {
        state.latestCommitTreeSha = latestCommitTreeSha
        treeCreated = true
      }
    }

    if (treeCreated || change.emptyCommit !== false) {
      state.latestCommitSha = await createCommit(
        state as Required<State>,
        treeCreated,
        change,
      )
    }
  }

  const hasNoChanges = baseCommitTreeSha === state.latestCommitTreeSha
  if (hasNoChanges && createWhenEmpty === false)
    return null

  if (fresh) {
    await octokit.git.createRef({
      owner,
      repo,
      sha: state.latestCommitSha!,
      ref: `refs/heads/${head}`,
    })
  }
  else {
    await octokit.git.updateRef({
      owner,
      repo,
      sha: state.latestCommitSha!,
      ref: `refs/heads/${head}`,
      force: true,
    })
  }

  return state
}

export async function CreatePullRequest(
  octokit: Octokit,
  options: PullRequestOptions,
) {
  const {
    owner,
    repo,
    title,
    body,
    base,
    head,
  } = options

  // https://developer.github.com/v3/pulls/#create-a-pull-request
  return await octokit.request('POST /repos/:owner/:repo/pulls', {
    owner,
    repo,
    head: `${owner}:${head}`,
    base,
    title,
    body,
  })
}
