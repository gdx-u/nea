import math
import time
import os

def foldername(ts):
    return ts.replace("/", "-").replace(":", "-").replace(" ", "_")

timestamp = time.strftime("%d/%m/%y %H:%M:%S")

offset = " " * len(timestamp)
total = 0

lengths = {}

os.chdir("backups")
os.mkdir(foldername(timestamp))
os.chdir("..")

folder = foldername(timestamp)

with open("prog.txt", "a") as f:
    f.write(f"{timestamp}: {input('Note: ')}\n")
    for file in [
        "auxiliary.js",
        "index.html",
        "script.js",
        "style.css"
    ]:
        read_file = open(file, "r", encoding="utf-8").read()

        with open(f"backups/{folder}/{file}", "w", encoding="utf-8") as backup:
            backup.write(read_file)

        length = len(read_file.split("\n"))
        f.write(f"{offset}- {file.split('.')[0]}: {length}\n")
        total += length

    f.write(f"{offset}- TOTAL: {total}\n")

    f.write("\n")
    