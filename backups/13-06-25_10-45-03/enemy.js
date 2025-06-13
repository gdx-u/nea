class Bullet {
    constructor(x, y, angle, speed, origin) {
        this.x = x;
        this.y = y;

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
    }

    tick() {
        this.lifetime++;
        if (this.lifetime > 150) {
            window.clearInterval(this.tick_interval);
            this.el.parentElement.removeChild(this.el);
        }

        this.x += this.dx;
        this.y += this.dy;

        let vis_x = this.x - player_x + this.opx;
        let vis_y = this.y - player_y + this.opy;

        this.el.style.left = `${vis_x}px`;
        this.el.style.top = `${vis_y}px`;

        for (let entity of entities) {
            if (entity.type == this.origin) continue; // Friendly fire disabled

            if (entity.type == "player") {
                if (collides(
                    vis_x, vis_y, tile_size / 8, tile_size / 8,
                    entity.tlx, entity.tly, player_size, player_size
                )) {
                    entity.damage();
                }
            } else {
                if (collides(
                    vis_x, vis_y, tile_size / 8, tile_size / 8,
                    entity.x, entity.y, tile_size, tile_size
                )) {
                    entity.damage(this);
                }
            }
        }

        for (let tile of Tile.tiles) {
            if (collides(
                vis_x, vis_y, tile_size / 8, tile_size / 8,
                tile.x * tile_size - player_x, tile.y * tile_size - player_y, tile_size, tile_size
            )) {
                window.clearInterval(this.tick_interval);
                this.el.parentElement.removeChild(this.el);
            }
        }
    }
}

document.onclick = e => {
    let bullet = new Bullet(
        player.indicator_x, 
        player.indicator_y,
        player.indicator_angle,
        4,
        "player"
    );

    console.log("Created bullet!!");
}




class Enemy {
    constructor(x, y, information) {
        this.x = x;
        this.y = y;
        this.information = information;
        this.colours = {
            "ghost": ""
        }
    }
}