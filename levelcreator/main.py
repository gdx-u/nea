from PIL import Image

im = Image.open("in.png").convert("RGB")
width, height = im.size

symbols = "!\"$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
symbol_id = 0
colours = {}

def rgb_to_hex(rgb):
    r, g, b = rgb
    return "#" + hex(r)[2:].rjust(2, "0") + hex(g)[2:].rjust(2, "0") + hex(b)[2:].rjust(2, "0")

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
        case (195, 195, 195):
            out += "T"
        case _:
            if px in colours:
                out += colours[px]
            else:
                out += symbols[symbol_id]
                colours[px] = symbols[symbol_id]
                symbol_id += 1
                print(colours)

    # if sum(px) < 100: out += "#"
    # else: out += " "

    if i % width == width - 1:
        out += "\n"

with open("out.txt", "w") as f:
    f.write(out)
    f.write("META:\n")
    for colour, symbol in colours.items():
        f.write(f"{symbol} {rgb_to_hex(colour)}\n")