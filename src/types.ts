import type { Octokit } from "@octokit/core";
import type { Endpoints } from "@octokit/types";

export type TreeParameter = Endpoints["POST /repos/:owner/:repo/git/trees"]["parameters"]["tree"];

export interface CommitOptions {
  owner: string;
  repo: string;
  head: string;
  base: string;
  createWhenEmpty?: boolean;
  changes: Changes | Changes[];
};

export interface PullRequestOptions {
  title: string;
  body: string;
  owner: string;
  repo: string;
  head: string;
  base: string;
} 

export type Changes = {
  files?: {
    [path: string]: string | File | UpdateFunction;
  };
  emptyCommit?: boolean | string;
  commit: string;
};

// https://developer.github.com/v3/git/blobs/#parameters
export type File = {
  content: string;
  encoding: "utf-8" | "base64";
};

export type UpdateFunctionFile =
  | {
      exists: true;
      size: number;
      encoding: "base64";
      content: string;
    }
  | {
      exists: false;
      size: never;
      encoding: never;
      content: never;
    };

export type UpdateFunction = (file: UpdateFunctionFile) => string | File | null;

export type State = {
  octokit: Octokit;
  owner: string;
  repo: string;
  latestCommitSha?: string;
  latestCommitTreeSha?: string;
  treeSha?: string;
};
