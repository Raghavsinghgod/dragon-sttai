import argparse
import csv
import tarfile
import urllib.request
from pathlib import Path

sources = {
    "dev-clean": "https://www.openslr.org/resources/12/dev-clean.tar.gz",
    "test-clean": "https://www.openslr.org/resources/12/test-clean.tar.gz",
}


def download(name: str, url: str, cache: Path) -> Path:
    dest = cache / f"{name}.tar.gz"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"{dest} cached")
        return dest
    tmp = dest.with_suffix(".part")
    print(f"downloading {url}")
    urllib.request.urlretrieve(url, tmp)
    tmp.rename(dest)
    return dest


def extract(tgz: Path, root: Path) -> None:
    marker = root / tgz.stem
    if marker.exists():
        print(f"{marker} already extracted")
        return
    print(f"extracting {tgz}")
    with tarfile.open(tgz) as handle:
        try:
            handle.extractall(root, filter="data")
        except TypeError:
            handle.extractall(root)
    marker.touch()


def collect(root: Path) -> list[tuple[Path, str]]:
    rows: list[tuple[Path, str]] = []
    for trans in sorted(root.rglob("*.trans.tsv")):
        for line in trans.read_text().splitlines():
            parts = line.split(" ", 1)
            if len(parts) != 2:
                continue
            uid, text = parts[0], parts[1].strip().lower()
            flac = trans.parent / f"{uid}.flac"
            if flac.exists() and text:
                rows.append((flac, text))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data")
    parser.add_argument("--hours", type=float, default=10.0)
    args = parser.parse_args()

    root = Path(args.out)
    cache = root / "tarballs"
    cache.mkdir(parents=True, exist_ok=True)

    for name, url in sources.items():
        extract(download(name, url, cache), root)

    rows = collect(root)
    print(f"{len(rows)} clips found")

    import soundfile

    budget = args.hours * 3600
    used = 0.0
    kept: list[tuple[str, str]] = []
    for path, text in rows:
        info = soundfile.info(path)
        seconds = info.frames / info.samplerate
        if used + seconds > budget:
            break
        used += seconds
        kept.append((str(path), text))

    manifest = root / "manifest.csv"
    with open(manifest, "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerows(kept)
    print(f"manifest {manifest}: {len(kept)} clips, {used / 3600:.2f} hours")


if __name__ == "__main__":
    main()
