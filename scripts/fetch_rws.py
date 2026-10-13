import json, os, sys, time, urllib.parse, urllib.request

MAJOR = ["Fool", "Magician", "High Priestess", "Empress", "Emperor", "Hierophant", "Lovers", "Chariot", "Strength", "Hermit",
         "Wheel of Fortune", "Justice", "Hanged Man", "Death", "Temperance", "Devil", "Tower", "Star", "Moon", "Sun", "Judgement", "World"]
files = {f"m{i:02d}": f"RWS Tarot {i:02d} {n}.jpg" for i, n in enumerate(MAJOR)}
for suit, src in [("wands", "Wands"), ("cups", "Cups"), ("swords", "Swords"), ("pents", "Pents")]:
    for r in range(1, 15):
        files[f"{suit}{r:02d}"] = f"{src}{r:02d}.jpg"

os.makedirs("deck", exist_ok=True)
failed = []
for cid, name in files.items():
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(name) + "?width=500"
    req = urllib.request.Request(url, headers={"User-Agent": "TarotReader/1.0 (personal app; github.com/giovlnv/tarot-reader)"})
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(req, timeout=60).read()
            open(f"deck/{cid}.jpg", "wb").write(data)
            break
        except Exception as e:
            err = e
            time.sleep(3 * (attempt + 1))
    else:
        failed.append(f"{cid} {name}: {err}")
    time.sleep(0.5)
print(len(files) - len(failed), "ok")
print("\n".join(failed))
json.dump({"name": "Rider-Waite-Smith (1909)", "source": "Wikimedia Commons, public domain", "cards": sorted(f[:-4] for f in os.listdir("deck"))}, open("deck/deck.json", "w"))
sys.exit(1 if failed else 0)
