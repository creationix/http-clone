import { newGitRepo } from "./git-db.js";
import { modes, toType } from "./git-codec.js";
async function main() {
    const git = await newGitRepo("http://crossorigin.me/https://soniex2.autistic.space/git-repos/abdl.git");
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
async function* walkTree(git, ref) {
    const commit = await git.loadCommit(ref);
    const queue = [
        { path: "/", mode: modes.tree, hash: commit.tree }
    ];
    while (true) {
        const entry = queue.shift();
        if (!entry)
            break;
        yield entry;
        if (entry.mode === modes.tree) {
            const tree = await git.loadTree(entry.hash);
            for (const [name, { mode, hash }] of Object.entries(tree)) {
                queue.push({ path: entry.path + name + (mode === modes.tree ? "/" : ""), mode, hash });
            }
        }
    }
}
async function* commitLog(git, ref) {
    const commits = [await git.resolve(ref)];
    while (true) {
        const hash = commits.shift();
        if (!hash)
            break;
        const commit = await git.loadCommit(hash);
        yield { hash, commit };
        commits.push.apply(commits, commit.parents);
    }
}
//# sourceMappingURL=main.js.map