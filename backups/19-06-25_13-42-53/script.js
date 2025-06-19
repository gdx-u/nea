let cached_files = {};

const maze_gen_test = false;

let tile_size = 32;
let max_depth = 3;
let num_rooms = 3;
let sleep_time = 1;

const pxl = 1 / tile_size;

if (maze_gen_test) {
    tile_size = 1;
    max_depth = 20;
    num_rooms = 5;
    sleep_time = 1;
}

const fps = 144;             // Frames per second
const mspf = 1000 / fps;    // Milliseconds per frame
let frame = 0;

// const slowdown = 60 / fps;
const slowdown = 0.6;

let fps_history = [];
let prev_tick;

let curr_room_id = 0;

function get_relevant_tiles(x, y, range, transform) {
    transform = transform || ((a, b) => {a, b});
    return Tile.tiles.filter(e => {return Math.hypot(...transform(e, x, y)) <= range});
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
        this.width = (information.width * tile_size) || tile_size;
        this.height = (information.height * tile_size) || tile_size;
        this.classes = information.classes || [];
        this.information = information;
        this.colours = {
            // "wall": "#949396" // Taupe gray if you're interested
            "wall": "#414a4c",
            "lava": "#ff7f27"
        }

        this.el = create_tile_div(this.x, this.y, {
            colour: this.information.colour || this.colours[this.information.type]
        });

        if (this.width !== tile_size) console.log(this.width);
        this.el.style.width = `${this.width}px`;
        this.el.style.height = `${this.height}px`;
        for (let class_ of this.classes) {
            this.el.classList.add(class_);
        }
        if (this.append) {
            document.getElementById("tiles").appendChild(this.el);
            if (!maze_gen_test) Tile.tiles.push(this);
        }

        this.type = "tile";
        this.active = true;
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

        this.invulnerable = false;

    }

    tick() {
        let dt;
        let relevant_tiles = get_relevant_tiles(
            this.center_x, this.center_y, 100,
            (tile, px, py) => {return [tile.x * tile_size - player_x - px + tile.width / 2, tile.y * tile_size - player_y - py + tile.height / 2]}
        );

        for (let tile of relevant_tiles) {
            if (tile.information.is_gate) {
                tile.active = false;
                tile.information.become_active = false;
                tile.el.classList.add("open");
                if (!tile.information.timeout_active) {
                    tile.information.timeout_active = true;
                    tile.information.active_interval = window.setInterval(() => {
                        tile.information.become_active = true;
                    }, 50);
                }
            }
        }

        for (let tile of Tile.tiles.filter(e => e.information.become_active == true)) {
            tile.el.classList.remove("open");
            tile.information.timeout_active = false;
            tile.active = true;
            tile.information.become_active = false;
            window.clearInterval(tile.information.active_interval);
        }

        // let relevant_tiles = [];
        
        if (!prev_tick) {
            prev_tick = Date.now()
            dt = 1;
        } else {
            let curr = Date.now();
            let elapsed = curr - prev_tick;
            prev_tick = curr;
            let curr_fps = 1000 / elapsed;
            if (curr_fps != Infinity) {
                curr_fps = Math.round(curr_fps);
                fps_history.push(curr_fps);
                if (fps_history.length > 500) fps_history = fps_history.slice(1);
                
                let fps_value = Math.round(fps_history.reduce((cur, val) => cur + val, 0) / fps_history.length);
                
                document.getElementById("fps").innerText = `${fps_value}FPS`;
                
            }
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
            
        if (player_lock) v = 0;
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
            for (let enemy of Enemy.enemies) {
                if (collides(
                    this.tlx,
                    this.tly,
                    player_size,
                    player_size,
                    enemy.x * tile_size - player_x,
                    enemy.y * tile_size - player_y,
                    tile_size,
                    tile_size
                ) && !this.dashing) {
                    this.damage(enemy);
                    enemy.remove();
                }
            }

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
                    tile.width,
                    tile.height
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
                            if (tile_properties[tile.information.type].solid && tile.active) {
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
                    tile.width,
                    tile.height
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
                            if (tile_properties[tile.information.type].solid && tile.active) {
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

    boom_loop(x, y) {
        console.log(x, y);
        player_lock = true;
        this.invulnerable = true;
        let interval = window.setInterval(() => {
            x /= 1.1;
            y /= 1.1;
            if (Math.abs(x) + Math.abs(y) < 0.2) {
                window.clearInterval(interval);
                player_lock = false;
                this.invulnerable = false;
                return;
            }

            let relevant_tiles = get_relevant_tiles(
                this.center_x, this.center_y, 100,
                (tile, px, py) => {return [tile.x * tile_size - player_x - px + tile.width / 2, tile.y * tile_size - player_y - py + tile.height / 2]}
            );
            // let relevant_tiles = [];
            player_x += x;
            player_x = Math.round(player_x);
            
            if (x) {
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
                        tile.width,
                        tile.height
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
                                if (tile_properties[tile.information.type].solid && tile.active) {
                                    player_x -= Math.sign(x);
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
            player_y += y;
            player_y = Math.round(player_y);

            if (y) {
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
                        tile.width,
                        tile.height
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
                                if (tile_properties[tile.information.type].solid && tile.active) {
                                    player_y -= Math.sign(y);
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
        
        }, mspf);
    }

    damage(origin, bypasses_dash) {
        bypasses_dash = bypasses_dash || false;
        if (!bypasses_dash && this.dashing || this.invulnerable) return;
        let ox = origin.x * tile_size - player_x + tile_size / 2;
        let oy = origin.y * tile_size - player_y + tile_size / 2;

        let dys = Math.sign(this.center_y - oy);
        let dxs = Math.sign(this.center_x - ox);

        if (origin.type == "bullet") {
            dys = Math.sign(origin.dy);
            dxs = Math.sign(origin.dx);
        } else if (origin.information?.dx || origin.information?.dy) {
            dys = Math.sign(origin.information.dy);
            dxs = Math.sign(origin.information.dx);
        }

        if (["enemy", "bullet"].includes(origin.type)) this.boom_loop(dxs * 8, dys * 8);

        document.body.classList.add("flash");
        window.setTimeout(() => {
            document.body.classList.remove("flash");
        }, 10);

        switch (origin.type) {
            case "tile":
                switch (origin.information.type) {
                    case "lava":
                        let x = origin.x;
                        let y = origin.y;
                        // TODO
                        return true;
                }
                break;

            default:
                return true;
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

    const hallway_length = random(5, 9);
    // const hallway_length = 3;
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

async function load_room(off_x, off_y, room_id, entrance, depth, from_id) {
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
    // if (depth == max_depth) {
    //     room_id = 1; // Dead end room
    // }

    if (max_depth - depth <= 1 && room_id == 1) return false;

    const file_name = `./rooms/${room_id}.txt`;
    let full_text
    if (!Object.keys(cached_files).includes(file_name)) {
        let file = await fetch(file_name);
        full_text = await file.text();
        cached_files[file_name] = full_text;
    } else {
        full_text = cached_files[file_name];
    }

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

    let or_off_x = off_x;
    let or_off_y = off_y;

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
        )) {
            if (room_id == 1) return false
            return load_room(or_off_x, or_off_y, 1, entrance, depth, room_id);
        }
    }

    let or_x = x;
    let or_y = y;
    
    rooms.push([or_x, or_y, width, height, curr_room_id++]);

    if (entrance && room_id !== 1) {
        let gate = document.createElement("div");
        gate.className = "entrance_gate";
        let gx, gy, gw, gh;
        switch (entrance) {
            case "left":
                gate.style.left = `${(or_off_x - 1) * tile_size - draw_x}px`;
                gate.style.top = `${(or_off_y - (door_width - 1) / 2) * tile_size - draw_y}px`;
                gate.style.width = `${tile_size}px`;
                gate.style.height = `${door_width * tile_size}px`;

                gx = (or_off_x - 1);
                gy = (or_off_y - (door_width - 1) / 2);
                gw = 1;
                gh = door_width;
                break;
            case "right":
                gate.style.left = `${(or_off_x + 1) * tile_size - draw_x}px`;
                gate.style.top = `${(or_off_y - (door_width - 1) / 2) * tile_size - draw_y}px`;
                gate.style.width = `${tile_size}px`;
                gate.style.height = `${door_width * tile_size}px`;

                gx = (or_off_x + 1);
                gy = (or_off_y - (door_width - 1) / 2);
                gw = 1;
                gh = door_width;
                break;
            
            case "top":
                gate.style.left = `${(or_off_x - (door_width - 1) / 2) * tile_size - draw_x}px`;
                gate.style.top = `${(or_off_y - 1) * tile_size - draw_y}px`;
                gate.style.width = `${door_width * tile_size}px`;
                gate.style.height = `${tile_size}px`;

                gx = (or_off_x - (door_width - 1) / 2);
                gy = (or_off_y - 1);
                gw = door_width;
                gh = 1;
                break;
            case "bottom":
                gate.style.left = `${(or_off_x - (door_width - 1) / 2) * tile_size - draw_x}px`;
                gate.style.top = `${(or_off_y + 1) * tile_size - draw_y}px`;
                gate.style.width = `${door_width * tile_size}px`;
                gate.style.height = `${tile_size}px`;
                
                gx = (or_off_x - (door_width - 1) / 2);
                gy = (or_off_y + 1);
                gw = door_width;
                gh = 1;
                break;
        }

        // document.getElementById("tiles").append(gate);
        let _ = new Tile(gx + (gw < gh ? 4 * pxl : 0), gy + (gw > gh ? 4 * pxl : 0), {
            type: "wall",
            width: gw - (gw < gh ? 8 * pxl : 0),
            height: gh - (gw > gh ? 8 * pxl : 0),
            is_gate: true,
            colour: "#bbb",
            classes: ["gate", gw === door_width ? "horizontal" : "vertical"]
        });
    }

    let block_list = get_door_tiles(width, height, x_mid, y_mid, entrance);    

    // let num_exits = random(1, 3);
    num_exits = room_id !== 0 ? 3 : 4;
    let available_exits = directions.slice();
    available_exits = remove(available_exits, entrance);

    let exits = random_choice_multiple(available_exits, num_exits);

    // Add entrance gate
    if (entrance) {
        let gate_tiles = get_door_tiles()
    }

    for (let exit of exits) {
        let removed_tiles = get_door_tiles(width, height, x_mid, y_mid, exit);
        let start_x = removed_tiles[(door_width - 1) / 2][0] + off_x;
        let start_y = removed_tiles[(door_width - 1) / 2][1] + off_y;
        let [prop_x, prop_y, tiles_] = create_hallway(exit, start_x, start_y);
        if (depth < max_depth && random(1, 10) !== 6) {
            await load_room(prop_x, prop_y, random(1, num_rooms), opposites[exit], depth + 1, room_id).then(res => {
                if (res) {
                    block_list = block_list.concat(removed_tiles);
                    if (room_id !== 1) {
                        let gate = document.createElement("div");
                        gate.className = "in_gate";
                        let gx, gy, gw, gh;
                        switch (exit) {
                            case "left":
                            case "right":
                                gate.style.left = `${start_x * tile_size - draw_x}px`;
                                gate.style.top = `${(start_y - (door_width - 1) / 2) * tile_size - draw_y}px`;
                                gate.style.width = `${tile_size}px`;
                                gate.style.height = `${door_width * tile_size}px`;

                                gx = start_x;
                                gy = start_y - (door_width - 1) / 2;
                                gw = 1;
                                gh = door_width;
                                break;
                            
                            case "top":
                            case "bottom":
                                gate.style.left = `${(start_x - (door_width - 1) / 2) * tile_size - draw_x}px`;
                                gate.style.top = `${start_y * tile_size - draw_y}px`;
                                gate.style.width = `${door_width * tile_size}px`;
                                gate.style.height = `${tile_size}px`;
                                
                                gx = start_x - (door_width - 1) / 2;
                                gy = start_y;
                                gw = door_width;
                                gh = 1;
                                break;
                        }
                        // document.getElementById("tiles").append(gate);
                        let _ = new Tile(gx + (gw < gh ? 4 * pxl : 0), gy + (gw > gh ? 4 * pxl : 0), {
                            type: "wall",
                            width: gw - ((gw < gh) ? 8 * pxl : 0),
                            height: gh - ((gw > gh) ? 8 * pxl : 0),
                            is_gate: true,
                            colour: "#bbb",
                            classes: ["gate", gw === door_width ? "horizontal" : "vertical"]
                        });
                    }
                            
                    for (let tile_ of tiles_) tile_.append_el();
                }
            });
            await sleep(sleep_time);
        } else {
            // block_list = block_list.concat(removed_tiles);
            // for (let tile_ of tiles_) tile_.append_el();
        }
    }


    if (maze_gen_test) {
        let background_el = document.createElement("div");
        background_el.className = "background";
        background_el.style.left = `${-draw_x + or_x * tile_size - player_x}px`;
        background_el.style.top = `${-draw_y + or_y * tile_size - player_y}px`;
        background_el.style.width = `${width * tile_size}px`;
        background_el.style.height = `${height * tile_size}px`;
        let r = 255 * Math.pow(depth / max_depth, 0.3);
        let g = 255 * Math.pow((1 - depth / max_depth), 0.3);

        // background_el.style.backgroundColor = `rgb(${r}, ${g}, 51)`;
        document.getElementById("tiles").appendChild(background_el);
    }
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
                    if (maze_gen_test) break;
                    let lava = new Tile(x, y, {
                        type: "lava"
                    });
                    break;
                case "T":
                    if (maze_gen_test) break;
                    let turret = new Enemy(x, y, {
                        type: "turret"
                    });
                    break;
                case "X":
                    if (maze_gen_test) break;
                    let ghost = new Enemy(x, y, {
                        type: "ghost"
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

load_room(player.center_x / tile_size, player.center_y / tile_size, 0);

let player_lock = true;