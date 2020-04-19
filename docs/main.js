import { newGitRepo } from "./git-db.js";
import { modes, toType } from "./git-codec.js";
import { domBuilder } from "./dombuilder.js";
import { toString } from "./utils.js";
function link(ref) {
    return ["a", { href: `#${ref}` }, ref];
}
async function main() {
    const match = document.location.search.match(/http.*/);
    if (!match) {
        document.body.textContent = "Please add git repo to url as query string...";
        return;
    }
    const [url] = match;
    const git = await newGitRepo(url);
    async function render() {
        const match2 = document.location.hash.match(/#?(.+)/);
        const ref = match2 ? match2[1] : await git.getHead();
        const hash = await git.resolve(ref);
        document.body.textContent = '';
        document.body.appendChild(domBuilder([
            ["h1", url],
            ["dl",
                (ref !== hash ? [['dt', 'ref'], ['dd', link(ref)]] : []),
                ['dt', 'hash'], ['dd', link(hash)],
            ],
        ]));
        const result = await git.load(hash);
        document.body.appendChild(domBuilder(["h2", result.type]));
        if (result.type === "commit") {
            const commit = result.body;
            document.body.appendChild(domBuilder(["dl",
                ["dt", 'tree'], ['dd', link(commit.tree)],
                commit.parents.map(parent => [["dt", 'parent '], ['dd', link(parent)]]),
                ["dt", 'author'], ['dd', `${commit.author.name} <${commit.author.email}> ${new Date(commit.author.date.seconds * 1000)}`],
                ["dt", 'committer'], ['dd', `${commit.committer.name} <${commit.committer.email}> ${new Date(commit.committer.date.seconds * 1000)}`],
                ["dt", 'message'], ['dd', ['pre', commit.message]]
            ]));
        }
        else if (result.type === "tree") {
            const tree = result.body;
            document.body.appendChild(domBuilder(["table",
                ['thead',
                    ['tr',
                        ['th', 'Name'], ['th', 'Type'], ['th', 'Mode'], ['th', 'hash']
                    ]
                ],
                ['tbody', Object.entries(tree).map(([name, { mode, hash }]) => ['tr',
                        ['td', name], ['td', toType(mode)], ['td', `0${mode.toString(8)}`], ['td', link(hash)]
                    ])
                ]
            ]));
        }
        else if (result.type === "blob") {
            const blob = result.body;
            try {
                const text = toString(blob);
                document.body.appendChild(domBuilder([
                    ['p', `Text file with ${blob.length} bytes.`],
                    ['pre', text]
                ]));
            }
            catch (err) {
                document.body.appendChild(domBuilder(['p', `Binary file with ${blob.length} bytes.`]));
            }
        }
    }
    window.onhashchange = render;
    render();
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