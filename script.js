const fps = 60;             // Frames per second
const mspf = 1000 / fps;    // Milliseconds per frame
let frame = 0;

class Tile {
    static tiles = [];

    /**
    * @param {Object} information Everything to do with the tile: type, etc.
    * @param {Number} x The tile's position on the X-axis (right positive)
    * @param {Number} y The tile's position on the Y-axis (down positive)
    */
    constructor(x, y, information) {
        this.x = x;
        this.y = y;
        this.information = information;
        this.colours = {
            "wall": "#949396" // Taupe gray if you're interested
        }

        this.el = create_tile_div(this.x, this.y, {
            colour: this.colours[this.information.type]
        });
        document.body.appendChild(this.el);

        Tile.tiles.push(this);
    }

    tick() {
        this.el.style.left = `${this.x * tile_size - player_x}px`;
        this.el.style.top = `${this.y * tile_size - player_y}px`;
    }
}

class Player {
    constructor() {
        this.terminal = 4; // Max speed
        this.base_speed = 1; // For dashing
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
        document.body.appendChild(this.indicator);


        let bound = this.el.getBoundingClientRect();
        this.center_x = bound.left + bound.width / 2;
        this.center_y = bound.top + bound.height / 2;
    }

    tick() {
        frame++;

        // Update position

        for (const key of Object.keys(this.keys)) {
            this.keys[key].held_for++;
        }

        let held_keys = Object.keys(this.keys);

        let v = 1;
        if (
            (held_keys.includes("a") || held_keys.includes("d")) &&
            (held_keys.includes("w") || held_keys.includes("s"))
        ) v = 1 / Math.SQRT2;

        if (held_keys.includes(" ") && this.keys[" "].held_for == 1 && this.base_speed == 1) {
            this.base_speed = 4;
        } else {
            this.base_speed = Math.max(1, this.base_speed * 0.95);
        }

        v *= this.base_speed;

        let prev_x = player_x;
        let prev_y = player_y;

        let x_movement = 0;
        let y_movement = 0;

        const static_player_x = window.innerWidth / 2 - tile_size / 2;
        const static_player_y = window.innerHeight / 2 - tile_size / 2;

        if (held_keys.includes("a")) {
            x_movement = -1 * v * Math.min(this.keys["a"].held_for, this.terminal);
        } else if (held_keys.includes("d")) {
            x_movement = v * Math.min(this.keys["d"].held_for, this.terminal);
        }
        player_x += x_movement;
        player_x = Math.round(player_x);
        
        if (x_movement) {
            for (let tile of Tile.tiles) {
                let changed = false;
                while (tiles_collide(static_player_x, static_player_y, tile.x * tile_size - player_x, tile.y * tile_size - player_y)) {
                    player_x -= Math.sign(x_movement);
                    changed = true;
                }
                if (changed) break;
            }
        }


        if (held_keys.includes("w")) {
            y_movement = -1 * v * Math.min(this.keys["w"].held_for, this.terminal);
        } else if (held_keys.includes("s")) {
            y_movement = v * Math.min(this.keys["s"].held_for, this.terminal);
        }
        player_y += y_movement;
        player_y = Math.round(player_y);

        if (y_movement) {
            for (let tile of Tile.tiles) {
                let changed = false;
                while (tiles_collide(static_player_x, static_player_y, tile.x * tile_size - player_x, tile.y * tile_size - player_y)) {
                    player_y -= Math.sign(y_movement);
                    changed = true;
                }
                if (changed) break;
            }
        }

        // Update tiles

        for (let tile of Tile.tiles) tile.tick();


        // --- Indicator ---

        const dx = mouse_x - this.center_x;
        const dy = mouse_y - this.center_y;
        const angle = Math.atan2(dy, dx);
        const angleDeg = angle * 180 / Math.PI;

        const bound = this.el.getBoundingClientRect();
        const radius = (bound.width / 2) + 10; // adjust “20” as needed

        const indicator_bound = this.indicator.getBoundingClientRect();
        const iw = indicator_bound.width / 2;
        const ih = indicator_bound.height / 2;

        const cx = this.center_x + Math.cos(angle) * radius;
        const cy = this.center_y + Math.sin(angle) * radius;

        this.indicator.style.left = (cx - iw) + 'px';
        this.indicator.style.top = (cy - ih) + 'px';

        this.indicator.style.transform = `rotate(${angleDeg}deg)`;

    }
}

let tile_map = {};
const tile_size = 16;
let player_x = 0; // Used to shift the tile grid
let player_y = 0; // ^                         ^

const css_root = document.querySelector(":root");
css_root.style.setProperty("--tile-size", `${tile_size}px`);

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

    tile.style.left = `${x * tile_size - player_y}px`;
    tile.style.top = `${y * tile_size - player_x}px`;
    // Note that not multiplying px/py by tile_size allows the map to go off-grid.

    tile.style.background = information.colour;

    tile_map[(x, y)] = information;
    // TODO: explain

    return tile;
}

/**
 * 
 * @param {Number} px Point's X co-ordinate
 * @param {Number} py Point's Y co-ordinate
 * @param {Number} cx Center X co-ordinate
 * @param {Number} cy Center Y co-ordinate
 * @param {Number} theta Angle in radians
 */

function rotate(px, py, cx, cy, theta) {
    return [
        (px - cx) * Math.cos(theta) - (py - cy) * Math.sin(theta) + cx,
        (px - cx) * Math.sin(theta) + (py - cy) * Math.cos(theta) + cy
    ];
}

function tiles_collide(x1, y1, x2, y2) {
    return y1 + tile_size > y2 
        && y1 < y2 + tile_size
        && x1 + tile_size > x2
        && x1 < x2 + tile_size;
}

function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}



async function load_level(level_id, entrance) {
    let file = await fetch(`./levels/${level_id}.txt`);
    let text = await file.text();
    let x = 0;
    let y = 0;
    for (let char of text) {
        if (char == "\n") {
            y += 1;
            x = -1;
        } else if (char == "#") {
            let tile = new Tile(x, y, {
                type: "wall"
            });
        }
        x++;
    }

    return;
}

// --- === ≡≡≡ MAIN BODY ≡≡≡ === --- //

let player = new Player();
load_level(1);