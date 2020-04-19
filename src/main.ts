import { IGit, newGitRepo } from "./git-db.js";
import { modes, toType } from "./git-codec.js";

async function main() {
    const match = document.location.hash.match(/[^#]+/);
    if (!match) throw new Error("Please add git repo to url after #");
    const [url] = match;
    const git = await newGitRepo(url);
    console.log("Mounting git repo", url)
    for await (const { hash, commit: { message, committer: { name, email, date } } } of commitLog(git, "HEAD")) {
        console.log(`Commit: ${hash}\n`
            + `Committer: ${name} <${email}> ${new Date(date.seconds * 1000)}\n`
            + `\n${message}`);
    }
    for await (const { path, mode, hash } of walkTree(git, "HEAD")) {
        console.log(path, toType(mode), hash);
    }
}
main();

async function* walkTree(git: IGit, ref: string) {
    const commit = await git.loadCommit(ref);
    const queue: { path: string, mode: number, hash: string }[] = [
        { path: "/", mode: modes.tree, hash: commit.tree }
    ];
    while (true) {
        const entry = queue.shift();
        if (!entry) break;
        yield entry;
        if (entry.mode === modes.tree) {
            const tree = await git.loadTree(entry.hash);
            for (const [name, { mode, hash }] of Object.entries(tree)) {
                queue.push({ path: entry.path + name + (mode === modes.tree ? "/" : ""), mode, hash });
            }
        }
    }
}

// Async Generator for printing log of commits.
async function* commitLog(git: IGit, ref: string) {
    const commits: string[] = [await git.resolve(ref)];
    while (true) {
        const hash = commits.shift();
        if (!hash) break;
        const commit = await git.loadCommit(hash);
        yield { hash, commit };
        commits.push.apply(commits, commit.parents as string[]);
    }
}