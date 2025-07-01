const random_enemies = [
    "ghost",
    "juggernaut"
];

let player_max_ammo = 20;
let player_ammo = player_max_ammo;
let can_shoot = true;
let cooldown = 100;

let reload_time = 1000;

function init_bullets() {
    let holder = document.getElementById("ammo_container");
    holder.innerHTML = "";
    let bullet_width = Math.min((window.innerWidth * 0.2 - 20) / (player_max_ammo) - 3, 20);
    for (let i = 0; i < player_max_ammo; i++) {
        let bullet = document.createElement("div");
        bullet.className = "bullet-gui hidden";
        bullet.style.left = `${(3 + bullet_width) * i + 16}px`;
        bullet.style.width = `${bullet_width}px`;
        holder.appendChild(bullet);
    };
}

init_bullets();

function load_bullets() {
    let holder = document.getElementById("ammo_container");
    document.getElementById("ammo").innerText = `${player_ammo} / ${player_max_ammo}`;
    if (player_ammo < 10) {
        document.getElementById("ammo").innerHTML = "&nbsp;" + document.getElementById("ammo").innerHTML;
    }
    [...holder.children].forEach(e => e.classList.add("hidden"));
    for (let i = 0; i < player_ammo; i++) {
        holder.children[i].classList.remove("hidden");
    };
}

load_bullets();

class Bullet {
    constructor(x, y, angle, speed, origin, range) {
        this.x = x;
        this.y = y;

        this.ox = x;
        this.oy = y;

        this.opx = player_x;
        this.opy = player_y;


        this.angle = angle;
        this.speed = speed;
        this.dx = speed * Math.cos(angle);
        this.dy = speed * Math.sin(angle);

        this.origin = origin;
        this.type = "bullet";

        this.tick_interval = window.setInterval(() => {this.tick()}, mspf);

        this.el = document.createElement("div");
        this.el.className = "bullet";
        document.body.appendChild(this.el);

        this.lifetime = 0;
        this.distance_traveled = 0;
        this.range = range;
    }

    remove() {
        window.clearInterval(this.tick_interval);
        this.el.parentElement?.removeChild(this.el);
    }

    tick() {
        this.lifetime++;


        this.distance_traveled = Math.hypot(this.ox - this.x, this.oy - this.y);
        if (this.lifetime > 500 || this.distance_traveled > this.range) {
            this.remove();
            return;
        }

        this.x += this.dx;
        this.y += this.dy;

        let vis_x = this.x - player_x + this.opx;
        let vis_y = this.y - player_y + this.opy;

        this.el.style.transform = `translate(${vis_x}px, ${vis_y}px)`;

        for (let entity of Enemy.enemies.concat(player)) {
            if (entity.type == this.origin) continue; // Friendly fire disabled

            if (entity.type == "player") {
                if (collides(
                    vis_x, vis_y, tile_size / 4, tile_size / 4,
                    entity.tlx, entity.tly, player_size, player_size
                )) {
                    entity.damage(this);
                    this.remove();
                    return;
                }
            } else {
                if (collides(
                    vis_x, vis_y, tile_size / 4, tile_size / 4,
                    entity.x * tile_size - player_x, entity.y * tile_size - player_y, tile_size, tile_size
                )) {
                    entity.damage(this);
                    this.remove();
                    return;
                }
            }
        }

        for (let tile of Tile.tiles) {
            if (tile_properties[tile.information.type].solid && tile.active && collides(
                vis_x, vis_y, tile_size / 8, tile_size / 8,
                tile.x * tile_size - player_x, tile.y * tile_size - player_y, tile.width, tile.height
            )) {
                window.clearInterval(this.tick_interval);
                this.el.parentElement?.removeChild(this.el);
            }
        }
    }
}

async function reload() {
    player.information.reload_background.hidden = false;
    player.information.reload_bar.hidden = false;

    let bar = player.information.reload_bar;
    let portion = player_ammo / player_max_ammo;
    let coverage = portion * player_size;
    bar.style.width = `${coverage}px`;
    can_shoot = false;
    await sleep(300);
    let o_player_ammo = player_ammo;
    for (let i = 0; i < player_max_ammo - o_player_ammo; i++) {
        player_ammo++;
        let portion = player_ammo / player_max_ammo;
        let coverage = portion * player_size;
        bar.style.width = `${coverage}px`;
        load_bullets();
        await sleep(reload_time / player_max_ammo);
    }
    can_shoot = true;
    player.information.reload_background.hidden = true;
    player.information.reload_bar.hidden = true;
}

document.onmousedown = e => {
    if (player_ammo > 0 && can_shoot) {
        let bullet = new Bullet(
            player.indicator_x - tile_size / 8, 
            player.indicator_y - tile_size / 8,
            player.indicator_angle,
            4,
            "player",
            200 * tile_size / 32
        );
        player_ammo--;
        if (player_ammo == 0) {
            can_shoot = false;
            window.setTimeout(() => {
                reload();
            }, 200)
        } else {
            can_shoot = false;
            window.setTimeout(() => {
                can_shoot = true;
            }, cooldown);
        }
        load_bullets();
    } 
    
}

document.onkeydown = e => {
    if (e.key.toLowerCase() == "r" && can_shoot && player_ammo < player_max_ammo) {
        reload();
    }
}

class Enemy {
    static enemies = [];
    constructor(x, y, information) {
        this.x = x;
        this.y = y;
        this.information = information;
        this.tick_times = {
            "turret": 1400,
            "ghost": 3000
        };

        this.colours = {
            "turret": "url('img/turret.png')",
            "ghost": "url('img/ghost.png')"
        };

        this.ranges = {
            "turret": 400 * tile_size / 32,
            "ghost": 600 * tile_size / 32,
            "juggernaut": 1000 * tile_size / 32
        };

        this.tick_count = 0;
        this.el = document.createElement("div");
        this.el.className = `${this.information.type} enemy`;
        if (this.colours[this.information.type].includes("url")) {
            this.el.style.backgroundImage = this.colours[this.information.type];
        } else {
            this.el.style.background = this.colours[this.information.type];
        }
        this.update_position();
        this.tick_interval = window.setInterval(() => {this.tick()}, 30);


        this.type = "enemy"; 
        Enemy.enemies.push(this);
        document.getElementById("tiles").appendChild(this.el);
        this.removed = false;
    }

    remove() {
        window.clearInterval(this.tick_interval);
        this.el.parentElement?.removeChild(this.el);
        Enemy.enemies = remove(Enemy.enemies, this);
        this.removed = true;
    }

    update_position() {
        this.el.style.left = `${-draw_x + this.x * tile_size}px`;
        this.el.style.top = `${-draw_y + this.y * tile_size}px`;
    }

    async tick() {
        this.tick_count++;
        if (this.removed) return;
        this.update_position();

        let px = player.center_x;
        let py = player.center_y;

        let x = this.x * tile_size - player_x + tile_size / 2;
        let y = this.y * tile_size - player_y + tile_size / 2;

        let dx = px - x;
        let dy = y - py;

        if (Math.hypot(dx, dy) > this.ranges[this.information.type]) return; // Stop execution if player out of range

        if (get_room(this) !== get_player_room()) return; // Stop execution if not in the same room as player

        switch (this.information.type) {
            case "turret":
                if (this.tick_count % Math.floor(this.tick_times[this.information.type] / 30) != 0) return;
                // Calculate angle from turret to player
                let angle = Math.atan2(dx, dy);

                this.el.style.transform = `rotate(${angle}rad)`;

                await sleep(450);

                x = this.x * tile_size - player_x + tile_size / 2;
                y = this.y * tile_size - player_y + tile_size / 2;
                let bullet = new Bullet(
                    x + Math.cos(angle - Math.PI / 2) * tile_size,
                    y + Math.sin(angle - Math.PI / 2) * tile_size,
                    angle - Math.PI / 2,
                    4,
                    "enemy",
                    400 * tile_size / 32
                );
                break;

            case "ghost":
                if (!this.information.first) {
                    this.information.first = true;
                    this.tick_count = 0;
                }
                if (this.tick_count % Math.floor(this.tick_times[this.information.type] / 30) != 0) return;
                let step_x = clamp(dx / 50 / tile_size + random(1, 10) / 500, -0.2, 0.2);
                let step_y = clamp(-dy / 50 / tile_size + random(1, 10) / 500, -0.2, 0.2);

                this.information.dx = step_x;
                this.information.dy = step_y;

                
                for (let i = 0; i < 50; i++) {
                    if (this.removed) return;
                    this.x += step_x;
                    this.y += step_y;
                    x = this.x * tile_size - player_x + tile_size / 2;
                    y = this.y * tile_size - player_y + tile_size / 2;
                    this.update_position();
                    await sleep(random(10, 50));

                    if (collides(x, y, tile_size, tile_size, px, py, player_size, player_size)) {
                        if (player.damage(this)) {
                            this.remove();
                            return;
                        }
                    }
                }

                delete this.information.dx;
                delete this.information.dy;
                break;

            case "juggernaut":
                

        }
    }

    damage() {
        Enemy.enemies = remove(Enemy.enemies, this); 
        this.remove();
    }
}

let curtains = 10;

function setup_curtain() {
    // let i = 0;
    let n = curtains;
    let width = window.innerWidth / n;
    for (let i = 0; i < n; i++) {
        let el = document.createElement("div");
        el.className = "death-curtain-segment";
        el.style.left = `${i * width}px`;
        el.style.width = `${width}px`;
        document.body.append(el);
    }
}

async function die() {
    setup_curtain();
    for (let el of document.getElementsByClassName("death-curtain-segment")) {
        el.style.top = "0";
        await sleep(30 * 20 / curtains);
    }

    document.getElementById("death-curtain").style.top = "0";
}

function health(P) {
    const percent = P.health;
    if (P.health <= 0) {
        // document.getElementById("death-curtain").style.top = "0";
        die();
    }
    const circle = document.getElementById("health-circle");
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    if (percent < 20 && !P.information.vignette_interval) {
        P.information.vignette_interval = window.setInterval(async () => {
            vignette_flash();
            await sleep(150);
            vignette_flash();

            if (P.health > 20) {
                window.clearInterval(P.information.vignette_interval);
                delete P.information.vignette_interval;
            }
        }, 1000)
    }
}

function stamina(P) {
    const percent = P.stamina;
    const circle = document.getElementById("stamina-circle");
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}