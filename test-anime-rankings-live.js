const { fetchAniListSnapshot } = require("./lib/anime-rankings/anilist.js");
const { fetchBahamutSnapshot, matchBahamutSnapshot } = require("./lib/anime-rankings/bahamut.js");

function hourBucket(date) {
  const value = new Date(date);
  value.setUTCMinutes(0, 0, 0);
  return value.toISOString();
}

async function main() {
  const sampledAt = hourBucket(new Date());
  const aniList = await fetchAniListSnapshot({ sampledAt });
  const bahamut = await fetchBahamutSnapshot({ sampledAt });
  const matched = matchBahamutSnapshot(bahamut, aniList);
  const result = {
    sampledAt,
    anilist: { items: aniList.items.length, first: aniList.items[0] && aniList.items[0].canonicalId },
    bahamut: { items: bahamut.items.length, contentHash: bahamut.contentHash, matched: matched.items.length },
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write("anime ranking live smoke failed: " + error.message + "\n");
  process.exitCode = 1;
});
