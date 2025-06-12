function rotate(px, py, cx, cy, theta) {
    return [
        (px - cx) * Math.cos(theta) - (py - cy) * Math.sin(theta) + cx,
        (px - cx) * Math.sin(theta) + (py - cy) * Math.cos(theta) + cy
    ];
}

function collides(x1, y1, w1, h1, x2, y2, w2, h2) {
    return y1 + h1 > y2 
        && y1 < y2 + h2
        && x1 + w1 > x2
        && x1 < x2 + w2;
}

function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}

function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

function includes(arr, el) {
    // Function to check if array contains sub-array, as in javascript array equality is weird
    for (let e of arr) {
        let i = 0;
        let valid = true;
        if (e.length != el.length) continue;
        // for (let s of e) {
        //     if (s !== el[i]) {
        //         valid = false;
        //         break;
        //     }
        //     i++;
        // }
        if (e.reduce((cur, elm, idx) => cur && (elm == el[idx]), true)) return true;
    }
    return false;
}

function random_choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function random_choice_multiple(arr, n) {
    let out = [];
    new_arr = arr.slice();
    for (let i = 0; i < n; i++) {
        if (new_arr.length == 0) return false;
        out.push(random_choice(new_arr));
        // new_arr.pop(new_arr.indexOf(out[out.length - 1])); // Remove selected from array
        new_arr = remove(new_arr, out[out.length - 1])
    }

    return out;
}

function pop(arr, idx) {
    return arr.slice(0, idx).concat(arr.slice(idx + 1));
}

function random(a, b) {
    return Math.round(Math.random() * (b - a)) + a
}

function remove(arr, val, num) {
    num = num || 1;
    let new_ = arr.slice();
    for (let i = 0; i < num; i++) {
        if (!arr.includes(val)) return new_;
        new_ = pop(new_, new_.indexOf(val));
    }

    return new_;
}