from PIL import Image

im = Image.open("in.png").convert("RGB")
width, height = im.size

out = ""
for i, px in enumerate(im.getdata()):
    match px:
        case (0, 0, 0):
            out += "#"
        case (237, 28, 36):
            out += "X"
        case (127, 127, 127):
            out += "O"
        case (255, 127, 39):
            out += "L"
        case (255, 255, 255):
            out += " "
        case _:
            print(px)
            out += " "
    # if sum(px) < 100: out += "#"
    # else: out += " "

    if i % width == width - 1:
        out += "\n"

with open("out.txt", "w") as f:
    f.write(out)
