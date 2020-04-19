import { IGit, newGitRepo } from "./git-db.js";
import { GitCommit } from "./git-codec.js";
import { resolve } from "dns";

async function main() {
    const git = await newGitRepo("https://soniex2.autistic.space/git-repos/abdl.git");
    for await (const { hash, commit } of log(git, "HEAD")) {
        console.log(hash, commit);
    }
}
main();

async function* tree(git: IGit, ref: string) {
    const commit = await git.load(ref);
    const queue: { path: string, hash: string }[] = [
        { path: "/", hash: commit.tree }
    ];


}

// Async Generator for printing log of commits.
async function* log(git: IGit, ref: string) {
    const commits: string[] = [await git.resolve(ref)];
    while (true) {
        const hash = commits.shift();
        if (!hash) break;
        const { type, body } = await git.load(hash);
        if (type !== 'commit') throw new Error(`Expected commit, but found ${type}`);
        const commit = body as GitCommit;
        yield { hash, commit };
        commits.push.apply(commits, commit.parents as string[]);
    }
}