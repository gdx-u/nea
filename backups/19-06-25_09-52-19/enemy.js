const random_enemies = [
    "ghost",
    "juggernaut"
];

let player_ammo = 40;
let can_shoot = true;

function load_bullets() {
    let holder = document.getElementById("ammo_container");
    holder.innerHTML = "";
    for (let i = 0; i < player_ammo; i++) {
        let bullet = document.createElement("div");
        bullet.className = "bullet-gui";
        bullet.style.left = `${9 * i + 16}px`;
        holder.appendChild(bullet);
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

        this.el.style.opacity = `${1 - (this.distance_traveled / this.range)}`;

        this.distance_traveled = Math.hypot(this.ox - this.x, this.oy - this.y);
        if (this.lifetime > 500 || this.distance_traveled > this.range) {
            this.remove();
            return;
        }

        this.x += this.dx;
        this.y += this.dy;

        let vis_x = this.x - player_x + this.opx;
        let vis_y = this.y - player_y + this.opy;

        this.el.style.left = `${vis_x}px`;
        this.el.style.top = `${vis_y}px`;

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


document.onclick = async function (e) {
    if (player_ammo > 0 && can_shoot) {
        let bullet = new Bullet(
            player.indicator_x, 
            player.indicator_y,
            player.indicator_angle,
            4,
            "player",
            200
        );
        player_ammo--;
        load_bullets();
    } 
    
    if (player_ammo == 0) {
        can_shoot = false;
        for (let i = 0; i < 40; i++) {
            player_ammo++;
            load_bullets();
            await sleep(50);
        }
        can_shoot = true;
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
            "turret": 400,
            "ghost": 600,
            "juggernaut": 1000
        };

        this.el = document.createElement("div");
        this.el.className = `${this.information.type} enemy`;
        this.el.style.background = this.colours[this.information.type];
        // if (this.information.type == "ghost") {
        //     this.el.style.opacity = "0";
        // }
        this.update_position();
        this.tick_interval = window.setInterval(() => {this.tick()}, this.tick_times[this.information.type]);


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
                    400
                );
                break;

            case "ghost":
                let step_x = dx / 50 / tile_size + random(1, 10) / 500;
                let step_y = -dy / 50 / tile_size + random(1, 10) / 500;
                this.information.dx = step_x;
                this.information.dy = step_y;

                
                for (let i = 0; i < 50; i++) {
                    // let dx = px - x;
                    // let dy = y - py;
                    // this.el.style.opacity = String(Math.pow(1 - Math.hypot(dx, dy) / this.ranges[this.information.type], 1));
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
        // this.el.parentElement.removeChild(this.el);
        Enemy.enemies = remove(Enemy.enemies, this); 
        this.remove();
        // window.clearInterval(this.tick_interval);
    }
}
