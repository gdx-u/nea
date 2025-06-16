const fps = 144;             // Frames per second
const mspf = 1000 / fps;    // Milliseconds per frame
let frame = 0;

// const slowdown = 60 / fps;
const slowdown = 0.6;

let fps_history = [];
let prev_tick;

function get_relevant_tiles(x, y, range, transform) {
    transform = transform || ((a, b) => {a, b});
    return Tile.tiles.filter(e => {return Math.hypot(...transform(e.x, x, e.y, y)) <= range});
}

const tile_properties = {
    "wall": {
        solid: true
    },
    "lava": {
        solid: false
    }
};

class Tile {
    static tiles = [];

    /**
    * @param {Object} information Everything to do with the tile: type, etc.
    * @param {Number} x The tile's position on the X-axis (right positive)
    * @param {Number} y The tile's position on the Y-axis (down positive)
    */
    constructor(x, y, information, append) {
        this.append = append == false ? false : true;
        this.x = x;
        this.y = y;
        this.information = information;
        this.colours = {
            // "wall": "#949396" // Taupe gray if you're interested
            "wall": "#414a4c",
            "lava": "#ff7f27"
        }

        this.el = create_tile_div(this.x, this.y, {
            colour: this.information.colour || this.colours[this.information.type]
        });
        if (this.append) {
            document.getElementById("tiles").appendChild(this.el);
            Tile.tiles.push(this);
        }

        this.type = "tile";

    }

    tick() {
        // this.el.style.left = `${this.x * tile_size - player_x}px`;
        // this.el.style.top = `${this.y * tile_size - player_y}px`;
        // this.el.style.transform = `translate(${this.x * tile_size - player_x}px, ${this.y * tile_size - player_y}px)`;
    }

    append_el() {
        if (!this.append) {
            document.getElementById("tiles").appendChild(this.el);
            Tile.tiles.push(this);
        }
        this.append = true;
    }
}

class Player {
    constructor() {
        this.terminal = 8 * slowdown; // Max speed
        this.base_speed = 1; // For dashing
        this.dashing = false;

        this.type = "player";

        this.keys = {}; // Tracks held/released keys

        /*
            Note that in the event handlers we use .toLowerCase() to handle one specific edge case:
            -> The user has shift held or caps lock on
            -> this.keys now looks something like: {Shift: {...}, A: {...}}
            -> The user releases shift / turns off caps lock
            -> this.keys now looks something like {A: {...}}
            -> Now upon releasing the key a, we attempt to delete this.keys.a, rather than this.keys.A
        */

        document.body.onkeydown = (ev) => {
            if (!Object.keys(this.keys).includes(ev.key.toLowerCase())) {
                this.keys[ev.key.toLowerCase()] = {
                    held_for: 0 // Used for charging up attacks etc.
                }; 
            }
        };

        document.body.onkeyup = (ev) => {
            if (Object.keys(this.keys).includes(ev.key.toLowerCase())) {
                delete this.keys[ev.key.toLowerCase()];
            }

            // if statement required incase website is loaded with a key already pressed.
        }

        this.tick_interval = window.setInterval(() => {this.tick()}, mspf);

        // Create the element to display the player -- this does NOT move, the world tiles move around it.
        this.el = document.createElement("div");
        this.el.className = "player";
        document.body.appendChild(this.el);


        // Create the weapon indicator
        this.indicator = document.createElement("div");
        this.indicator.className = "indicator";
        this.indicator_x = null;
        this.indicator_y = null;
        this.indicator_angle = null;
        document.body.appendChild(this.indicator);


        let bound = this.el.getBoundingClientRect();
        this.bound = bound;
        this.center_x = bound.left + bound.width / 2 - offset_x;
        this.center_y = bound.top + bound.height / 2 - offset_y;

        this.tlx = bound.left - offset_x;
        this.tly = bound.top - offset_y;

    }

    tick() {
        if (player_lock) return;

        let dt;
        let relevant_tiles = get_relevant_tiles(
            this.center_x, this.center_y, 100,
            (x, px, y, py) => {return [x * tile_size - player_x - px, y * tile_size - player_y - py]}
        );
        // let relevant_tiles = [];

        if (!prev_tick) {
            prev_tick = Date.now()
            dt = 1;
        } else {
            let curr = Date.now();
            let elapsed = curr - prev_tick;
            prev_tick = curr;
            let curr_fps = 1000 / elapsed;
            curr_fps = Math.round(curr_fps);
            fps_history.push(curr_fps);
            if (fps_history.length > 50) fps_history = fps_history.slice(1);

            document.getElementById("fps").innerText = `${Math.round(fps_history.reduce((cur, val) => cur + val, 0) / fps_history.length)}FPS`;

            dt = elapsed / mspf;
        }

        frame++;

        // Update position

        for (const key of Object.keys(this.keys)) {
            this.keys[key].held_for++;
        }

        let held_keys = Object.keys(this.keys);

        let v = slowdown * dt;
        if (
            (held_keys.includes("a") || held_keys.includes("d")) &&
            (held_keys.includes("w") || held_keys.includes("s"))
        ) v *= 1 / Math.SQRT2;

        if (held_keys.includes(" ") && this.keys[" "].held_for == 1 && this.base_speed == 1) {
            this.base_speed = 3.6;
            this.dashing = true;
            this.el.classList.add("dashing");
        } else {
            this.base_speed = Math.max(1, this.base_speed * 0.97);
            if (this.base_speed < 1.2 && this.dashing) {
                this.dashing = false;
                this.el.classList.remove("dashing");
            }
        }

        v *= this.base_speed;

        // let prev_x = player_x;
        // let prev_y = player_y;

        let x_movement = 0;
        let y_movement = 0;

        if (held_keys.includes("a")) {
            // x_movement = -1 * v * Math.min(this.keys["a"].held_for, this.terminal);
            x_movement = -v * this.terminal
        } else if (held_keys.includes("d")) {
            // x_movement = v * Math.min(this.keys["d"].held_for, this.terminal);
            x_movement = v * this.terminal;
        }
        player_x += x_movement;
        player_x = Math.round(player_x);
        
        if (x_movement) {
            for (let tile of relevant_tiles) {
                let changed = false;
                let exit = false;
                while (collides(
                    this.tlx, 
                    this.tly,
                    player_size,
                    player_size, 
                    tile.x * tile_size - player_x, 
                    tile.y * tile_size - player_y,
                    tile_size,
                    tile_size
                ) && !exit) {
                    switch (tile.information.type) {
                        case "lava":
                            if (this.dashing) {
                                exit = true;
                                break;
                            } else {
                                this.damage(tile);
                                changed = true;
                                exit = true;
                            }
                            break;
                        default:
                            if (tile_properties[tile.information.type].solid) {
                                player_x -= Math.sign(x_movement);
                                changed = true;
                                break;
                            } else {
                                exit = true;
                                break;
                            }
                    }
                }
                if (changed) break;
            }
        }


        if (held_keys.includes("w")) {
            // y_movement = -1 * v * Math.min(this.keys["w"].held_for, this.terminal);
            y_movement = -v * this.terminal;
        } else if (held_keys.includes("s")) {
            y_movement = v * this.terminal;
        }
        player_y += y_movement;
        player_y = Math.round(player_y);

        if (y_movement) {
            for (let tile of relevant_tiles) {
                let changed = false;
                let exit = false;
                while (collides(
                    this.tlx, 
                    this.tly,
                    player_size,
                    player_size, 
                    tile.x * tile_size - player_x, 
                    tile.y * tile_size - player_y,
                    tile_size,
                    tile_size
                ) && !exit) {
                    switch (tile.information.type) {
                        case "lava":
                            if (this.dashing) {
                                exit = true;
                                break;
                            } else {
                                this.damage(tile);
                                changed = true;
                                exit = true;
                            }
                            break;
                        default:
                            if (tile_properties[tile.information.type].solid) {
                                player_y -= Math.sign(y_movement);
                                changed = true;
                                break;
                            } else {
                                exit = true;
                                break;
                            }
                    }
                    
                }
                if (changed) break;
            }
        }

        // Update tiles

        // for (let tile of Tile.tiles) tile.tick();
        tile_tick();


        // --- Indicator ---

        const dx = mouse_x - this.center_x;
        const dy = mouse_y - this.center_y;
        const angle = Math.atan2(dy, dx);

        const radius = (this.bound.width / 2) + 15; // adjust “20” as needed

        const indicator_bound = this.indicator.getBoundingClientRect();
        const iw = indicator_bound.width / 2;
        const ih = indicator_bound.height / 2;

        const cx = this.center_x + Math.cos(angle) * radius;
        const cy = this.center_y + Math.sin(angle) * radius;

        this.indicator.style.left = (cx - iw) + 'px';
        this.indicator.style.top = (cy - ih) + 'px';

        this.indicator_x = cx - iw;
        this.indicator_y = cy - ih;
        this.indicator_angle = angle;

        // this.indicator.style.transform = `rotate(${angleDeg}deg)`;

    }

    damage(origin) {
        document.body.style.backgroundColor = "red";
        switch (origin.type) {
            case "tile":
                switch (origin.information.type) {
                    case "lava":
                        let x = origin.x;
                        let y = origin.y;
                        // TODO
                        return;
                }
                break;
        }
    }
}

let draw_x = -50 * window.innerWidth;
let draw_y = -50 * window.innerHeight;

function tile_tick() {
    document.getElementById("tiles").style.left = `${draw_x - player_x}px`;
    document.getElementById("tiles").style.top = `${draw_y - player_y}px`;
}

let tile_map = {};
let rooms = [];
const tile_size = 32;
const player_size = Math.floor(tile_size * 7 / 8);

let player_x = 0; // Used to shift the tile grid
let player_y = 0; // ^                         ^

const css_root = document.querySelector(":root");
const offset_x = window.innerWidth % 2 == 1 ? 0.5 : 0
const offset_y = window.innerHeight % 2 == 1 ? 0.5 : 0


css_root.style.setProperty("--tile-size", `${tile_size}px`);
css_root.style.setProperty("--player-size", `${player_size}px`);
css_root.style.setProperty("--offset-x", `${offset_x}px`);
css_root.style.setProperty("--offset-y", `${offset_y}px`);


let mouse_x = 0;
let mouse_y = 0;
document.onmousemove = (ev) => {
    mouse_x = ev.pageX;
    mouse_y = ev.pageY;
}

/**
* @param {Object} information Everything to do with the tile: type, etc.
* @param {Number} x The tile's position on the X-axis (right positive)
* @param {Number} y The tile's position on the Y-axis (down positive)
*/
function create_tile_div(x, y, information) {
    // Here I create a div for every tile. This is slightly worse for performance than using a canvas,
    // But it allows easier & more efficient freedom for animations, movement, etc.
    // Plus, I can use CSS styling on individual tiles.
    
    let tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `${x};${y}`;

    tile.style.left = `${-draw_x + x * tile_size - player_y}px`;
    tile.style.top = `${-draw_y + y * tile_size - player_x}px`;
    // tile.style.transform = `translate(${x * tile_size - player_y}px, ${y * tile_size - player_x}px)`;
    // Note that not multiplying px/py by tile_size allows the map to go off-grid.

    tile.style.background = information.colour;

    tile_map[[x, y]] = information;
    // TODO: explain

    return tile;
}

const directions = [
    "top",
    "bottom",
    "left",
    "right"
];

const opposites = {
    "top": "bottom",
    "left": "right",
    "bottom": "top",
    "right": "left",
    "X": ""
};

const door_width = 7;

function create_hallway(direction, start_cx, start_cy) {
    let dx, dy, active;
    switch (direction) {
        case "left":
            dx = -1;
            dy = 0;
            active = "y";
            break;
        case "right":
            dx = 1;
            dy = 0;
            active = "y";
            break;
        case "bottom":
            dx = 0;
            dy = 1;
            active = "x";
            break;
        case "top":
            dx = 0;
            dy = -1;
            active = "x";
            break;
    }

    let cx = start_cx;
    let cy = start_cy;
    let ret = []

    let hallway_length = random(5, 9);
    for (let i = 0; i < hallway_length; i++) {
        ret.push(new Tile(
            cx - (active == "x" ? (door_width - 1) / 2 : 0),
            cy - (active == "y" ? (door_width - 1) / 2 : 0), 
            {
                type: "wall"
        }, false));
        ret.push(new Tile(
            cx + (active == "x" ? (door_width - 1) / 2 : 0),
            cy + (active == "y" ? (door_width - 1) / 2 : 0), 
            {
                type: "wall"
        }, false));

        cx += dx;
        cy += dy;
    }

    return [cx, cy, ret];
}

function center_room(direction, width, height) {
    switch (direction) {
        case "left":
            // Door is on the RIGHT
            return [2 - width, -((height - 1) / 2)];
        case "right":
            // Door is on the LEFT
            return [-1, -((height - 1) / 2)];
        case "top":
            // Door is on the BOTTOM
            return [-((width - 1) / 2), 2 - height];
        case "bottom":
            // Door is on the TOP
            return [-((width - 1) / 2), -1];
        default:
            return [-((width - 1) / 2), -((height - 1) / 2)]
    }
}

async function load_room(off_x, off_y, room_id, entrance, depth) {
    function get_door_tiles(width, height, x_mid, y_mid, direction) {
        let out_list = [];
        switch (direction) {
            case "left":
                // Entering from the left
                for (let dy = -((door_width - 1) / 2); dy <= ((door_width - 1) / 2); dy++) {
                    out_list.push([0, y_mid + dy]);
                }
                break;
            case "right":
                // Entering from the right
                for (let dy = -((door_width - 1) / 2); dy <= ((door_width - 1) / 2); dy++) {
                    out_list.push([width - 1, y_mid + dy]);
                }
                break;
            case "top":
                // Entering from the top
                for (let dx = -((door_width - 1) / 2); dx <= ((door_width - 1) / 2); dx++) {
                    out_list.push([x_mid + dx, 0]);
                }
                break;
            case "bottom":
                // Entering from the bottom
                for (let dx = -((door_width - 1) / 2); dx <= ((door_width - 1) / 2); dx++) {
                    out_list.push([x_mid + dx, height - 1]);
                }
                break;
        }

        return out_list
    }
  
    depth = depth || 0;
    if (depth == max_depth) {
        room_id = 1; // Dead end room
    }

    let file = await fetch(`./rooms/${room_id}.txt`);
    let full_text = await file.text();

    let specials = "!\"$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    let [text, metadata] = full_text.split("META:");
    text = text.trim();
    let colours = {}
    if (metadata) {
        metadata = metadata.trim();
        metadata = metadata.split("\n");
        for (let line of metadata) {
            let [symbol, colour, collides] = line.split(" ");
            collides = collides || false;
            if (collides) collides = true;

            tile_properties[`special_${symbol}_${room_id}`] = {
                solid: collides
            };
            colours[symbol] = colour.trim();
        }
    }
    
    let width = text.split("\n")[0].trim().length;
    let height = text.split("\n").length;
    
    let x_mid = (width - 1) / 2;
    let y_mid = (height - 1) / 2;

    [cxo, cyo] = center_room(opposites[entrance || "X"], width, height);
    off_x += cxo;
    off_y += cyo;

    off_x = Math.round(off_x);
    off_y = Math.round(off_y);
    
    let x = off_x;
    let y = off_y;

    for (let room of rooms) {
        if (collides(
            room[0] - 1,
            room[1] - 1,
            room[2] + 2,
            room[3] + 2,
            x,
            y,
            width,
            height
        )) return false;
    }

    let or_x = x;
    let or_y = y;
    
    rooms.push([or_x, or_y, width, height]);

    let block_list = get_door_tiles(width, height, x_mid, y_mid, entrance);    

    let num_exits = random(3, 3);
    let available_exits = directions.slice();
    available_exits = remove(available_exits, entrance);

    let exits = random_choice_multiple(available_exits, num_exits);

    for (let exit of exits) {
        let removed_tiles = get_door_tiles(width, height, x_mid, y_mid, exit);
        let [prop_x, prop_y, tiles_] = create_hallway(exit, removed_tiles[(door_width - 1) / 2][0] + off_x, removed_tiles[(door_width - 1) / 2][1] + off_y);
        if (depth < max_depth) {
            await load_room(prop_x, prop_y, random(1, num_rooms), opposites[exit], depth + 1).then(res => {
                if (res == true) {
                    block_list = block_list.concat(removed_tiles);
                    for (let tile_ of tiles_) tile_.append_el();
                }
            });
            await sleep(10);
        } else {
            // block_list = block_list.concat(removed_tiles);
            // for (let tile_ of tiles_) tile_.append_el();
        }
    }

    let background_el = document.createElement("div");
    background_el.className = "background";
    background_el.style.left = `${-draw_x + or_x * tile_size - player_x}px`;
    background_el.style.top = `${-draw_y + or_y * tile_size - player_y}px`;
    background_el.style.width = `${width * tile_size}px`;
    background_el.style.height = `${height * tile_size}px`;
    document.getElementById("tiles").appendChild(background_el);
    for (let char of text) {
        if (char == "\n") {
            y += 1;
            x = off_x - 1;
        } else if (!includes(block_list, [x - off_x, y - off_y])) {
            switch (char) {
                case "#":
                    let tile = new Tile(x, y, {
                        type: "wall"
                    });
                    break;
                case "L":
                    let lava = new Tile(x, y, {
                        type: "lava"
                    });
                    break;
                case "T":
                    let turret = new Enemy(x, y, {
                        type: "turret"
                    });
                    break;
                default:
                    if (specials.includes(char)) {
                        let special = new Tile(x, y, {
                            type: `special_${char}_${room_id}`,
                            colour: colours[char]
                        });
                    } else if (char !== " ") {
                        // what the fuckkkkk
                    }
                    break;
            }
            // if (!block_list.includes([x, y])) {
            
        }
        x++;
    }

    if (room_id == 0) player_lock = false;


    return true;
}

// --- === ≡≡≡ MAIN BODY ≡≡≡ === --- //

let player = new Player();

const max_depth = 3;
const num_rooms = 3;
load_room(player.center_x / tile_size, player.center_y / tile_size, 0);

let player_lock = true;