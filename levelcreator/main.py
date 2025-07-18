from PIL import Image

im = Image.open("in.png").convert("RGB")
width, height = im.size

out = ""
for i, px in enumerate(im.getdata()):
    print(px)
    match px:
        case (0, 0, 0):
            out += "#"
        case (237, 28, 36):
            out += "X"
        case _:
            out += " "
    # if sum(px) < 100: out += "#"
    # else: out += " "

    if i % width == width - 1:
        out += "\n"

with open("out.txt", "w") as f:
    f.write(out)
