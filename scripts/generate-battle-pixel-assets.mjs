import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve("src/assets/battle-pixel");
const dirs = ["weapons", "projectiles", "relics", "monsters", "bosses"];

for (const dir of dirs) fs.mkdirSync(path.join(root, dir), { recursive: true });

const palette = {
  outline: "#273044",
  deep: "#111827",
  white: "#fff7df",
  cream: "#ffe8ad",
  yellow: "#ffc84a",
  orange: "#e97831",
  pink: "#ff8fbe",
  red: "#d94a55",
  blue: "#5fc8ff",
  darkBlue: "#286da8",
  purple: "#8d6bff",
  green: "#5ac86d",
  darkGreen: "#2e7d47",
  gold: "#ffd45e",
  gray: "#8fa0b7",
  darkGray: "#475569",
  black: "#172033",
};

function rgba(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255,
  ];
}

function makePng(size) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  return png;
}

function put(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (Math.floor(y) * png.width + Math.floor(x)) * 4;
  const [r, g, b, a] = Array.isArray(color) ? color : rgba(color);
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function rect(png, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) put(png, xx, yy, color);
  }
}

function circle(png, cx, cy, r, color) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rr) put(png, x, y, color);
    }
  }
}

function ellipse(png, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(png, x, y, color);
    }
  }
}

function line(png, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    put(png, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), color);
  }
}

function diamond(png, cx, cy, r, color) {
  for (let y = -r; y <= r; y += 1) {
    const span = r - Math.abs(y);
    for (let x = -span; x <= span; x += 1) put(png, cx + x, cy + y, color);
  }
}

function star(png, cx, cy, color) {
  put(png, cx, cy - 2, color);
  put(png, cx, cy - 1, color);
  put(png, cx - 2, cy, color);
  put(png, cx - 1, cy, color);
  put(png, cx, cy, color);
  put(png, cx + 1, cy, color);
  put(png, cx + 2, cy, color);
  put(png, cx, cy + 1, color);
  put(png, cx, cy + 2, color);
}

function cake(png, x, y, scale, rainbow = false) {
  const o = palette.outline;
  rect(png, x, y + 7 * scale, 15 * scale, 8 * scale, o);
  rect(png, x + scale, y + 8 * scale, 13 * scale, 6 * scale, rainbow ? palette.pink : palette.yellow);
  rect(png, x + 3 * scale, y + 5 * scale, 10 * scale, 3 * scale, o);
  rect(png, x + 4 * scale, y + 6 * scale, 8 * scale, 2 * scale, palette.cream);
  if (rainbow) {
    rect(png, x + 2 * scale, y + 10 * scale, 11 * scale, scale, palette.blue);
    rect(png, x + 2 * scale, y + 12 * scale, 11 * scale, scale, palette.green);
  } else {
    put(png, x + 5 * scale, y + 10 * scale, palette.white);
    put(png, x + 10 * scale, y + 11 * scale, palette.orange);
  }
}

function milkshake(png, x, y, scale, storm = false) {
  const o = palette.outline;
  rect(png, x + 4 * scale, y + 6 * scale, 8 * scale, 11 * scale, o);
  rect(png, x + 5 * scale, y + 7 * scale, 6 * scale, 9 * scale, storm ? palette.purple : palette.pink);
  rect(png, x + 3 * scale, y + 4 * scale, 10 * scale, 3 * scale, o);
  rect(png, x + 4 * scale, y + 4 * scale, 8 * scale, 2 * scale, palette.white);
  rect(png, x + 8 * scale, y + scale, scale, 4 * scale, palette.red);
  put(png, x + 7 * scale, y + 9 * scale, palette.white);
  if (storm) star(png, x + 13 * scale, y + 6 * scale, palette.blue);
}

function plane(png, x, y, scale, galaxy = false) {
  const o = palette.outline;
  line(png, x + 2 * scale, y + 12 * scale, x + 15 * scale, y + 4 * scale, o);
  line(png, x + 15 * scale, y + 4 * scale, x + 10 * scale, y + 15 * scale, o);
  line(png, x + 10 * scale, y + 15 * scale, x + 2 * scale, y + 12 * scale, o);
  line(png, x + 5 * scale, y + 12 * scale, x + 13 * scale, y + 6 * scale, galaxy ? palette.purple : palette.blue);
  line(png, x + 8 * scale, y + 13 * scale, x + 13 * scale, y + 6 * scale, palette.white);
  put(png, x + scale, y + 14 * scale, galaxy ? palette.purple : palette.blue);
  put(png, x - scale, y + 15 * scale, palette.blue);
}

function clover(png, x, y, scale, wheel = false) {
  const leaf = wheel ? palette.gold : palette.green;
  const o = palette.outline;
  circle(png, x + 6 * scale, y + 6 * scale, 3 * scale, o);
  circle(png, x + 10 * scale, y + 6 * scale, 3 * scale, o);
  circle(png, x + 6 * scale, y + 10 * scale, 3 * scale, o);
  circle(png, x + 10 * scale, y + 10 * scale, 3 * scale, o);
  circle(png, x + 6 * scale, y + 6 * scale, 2 * scale, leaf);
  circle(png, x + 10 * scale, y + 6 * scale, 2 * scale, leaf);
  circle(png, x + 6 * scale, y + 10 * scale, 2 * scale, leaf);
  circle(png, x + 10 * scale, y + 10 * scale, 2 * scale, leaf);
  rect(png, x + 8 * scale, y + 10 * scale, scale, 5 * scale, o);
  if (wheel) {
    rect(png, x + 3 * scale, y + 3 * scale, 11 * scale, scale, palette.outline);
    rect(png, x + 3 * scale, y + 13 * scale, 11 * scale, scale, palette.outline);
  }
}

function bookmark(png, x, y, scale, full = false) {
  const o = palette.outline;
  rect(png, x + 5 * scale, y + 2 * scale, 7 * scale, 14 * scale, o);
  rect(png, x + 6 * scale, y + 3 * scale, 5 * scale, 11 * scale, full ? palette.blue : palette.darkBlue);
  put(png, x + 8 * scale, y + 15 * scale, full ? palette.white : palette.blue);
  line(png, x + 12 * scale, y + 4 * scale, x + 15 * scale, y + scale, full ? palette.white : palette.blue);
  if (full) circle(png, x + 3 * scale, y + 5 * scale, 2 * scale, palette.cream);
}

function pulse(png, x, y, scale, evolved = false) {
  const o = palette.outline;
  circle(png, x + 8 * scale, y + 8 * scale, 7 * scale, o);
  circle(png, x + 8 * scale, y + 8 * scale, 5 * scale, evolved ? palette.purple : palette.darkBlue);
  circle(png, x + 8 * scale, y + 8 * scale, 2 * scale, palette.white);
  line(png, x + 2 * scale, y + 8 * scale, x + 14 * scale, y + 8 * scale, palette.blue);
  line(png, x + 8 * scale, y + 2 * scale, x + 8 * scale, y + 14 * scale, palette.blue);
}

function writePng(relativePath, size, draw) {
  const png = makePng(size);
  draw(png);
  fs.writeFileSync(path.join(root, relativePath), PNG.sync.write(png, { colorType: 6 }));
}

const weapons = [
  ["weapons/w001_mango_cake_weapon.png", 32, (p) => cake(p, 2, 4, 2, false)],
  ["projectiles/w001_mango_cake_projectile.png", 16, (p) => cake(p, 1, 0, 1, false)],
  ["weapons/w001_rainbow_layer_cake_weapon.png", 32, (p) => cake(p, 2, 4, 2, true)],
  ["projectiles/w001_rainbow_layer_cake_projectile.png", 24, (p) => cake(p, 4, 3, 1, true)],
  ["weapons/w002_strawberry_milkshake_weapon.png", 32, (p) => milkshake(p, 2, 0, 2, false)],
  ["projectiles/w002_strawberry_milkshake_orbit.png", 16, (p) => milkshake(p, 0, 0, 1, false)],
  ["weapons/w002_sweet_dream_milkshake_storm_weapon.png", 32, (p) => milkshake(p, 2, 0, 2, true)],
  ["projectiles/w002_sweet_dream_milkshake_storm_orbit.png", 24, (p) => milkshake(p, 4, 3, 1, true)],
  ["weapons/w003_starlight_paper_plane_weapon.png", 32, (p) => plane(p, 1, 0, 2, false)],
  ["projectiles/w003_starlight_paper_plane_projectile.png", 16, (p) => plane(p, 0, 0, 1, false)],
  ["weapons/w003_galaxy_messenger_weapon.png", 32, (p) => plane(p, 1, 0, 2, true)],
  ["projectiles/w003_galaxy_messenger_projectile.png", 24, (p) => plane(p, 4, 3, 1, true)],
  ["weapons/w004_lucky_clover_weapon.png", 32, (p) => clover(p, 0, 0, 2, false)],
  ["projectiles/w004_lucky_clover_projectile.png", 16, (p) => clover(p, 0, 0, 1, false)],
  ["weapons/w004_wheel_of_fortune_weapon.png", 32, (p) => clover(p, 0, 0, 2, true)],
  ["projectiles/w004_wheel_of_fortune_projectile.png", 24, (p) => clover(p, 4, 3, 1, true)],
  ["weapons/w005_moonlight_bookmark_weapon.png", 32, (p) => bookmark(p, 2, 0, 2, false)],
  ["projectiles/w005_moonlight_bookmark_projectile.png", 16, (p) => bookmark(p, 0, 0, 1, false)],
  ["weapons/w005_full_moon_bookmark_array_weapon.png", 32, (p) => bookmark(p, 2, 0, 2, true)],
  ["projectiles/w005_full_moon_bookmark_projectile.png", 24, (p) => bookmark(p, 4, 3, 1, true)],
  ["weapons/w006_star_orbit_pulse_weapon.png", 32, (p) => pulse(p, 0, 0, 2, false)],
  ["projectiles/w006_star_orbit_pulse_marker.png", 32, (p) => pulse(p, 0, 0, 2, false)],
  ["weapons/w006_celestial_judgement_weapon.png", 32, (p) => pulse(p, 0, 0, 2, true)],
  ["projectiles/w006_celestial_judgement_pillar.png", 48, (p) => pulse(p, 8, 8, 2, true)],
];

const relics = [
  ["relics/r001_xingli_hairpin.png", (p) => { star(p, 16, 9, palette.gold); rect(p, 9, 18, 14, 3, palette.outline); rect(p, 10, 19, 12, 1, palette.pink); }],
  ["relics/r002_cafe_membership_card.png", (p) => { rect(p, 6, 9, 20, 14, palette.outline); rect(p, 7, 10, 18, 12, palette.cream); rect(p, 10, 14, 6, 5, palette.orange); rect(p, 17, 15, 4, 2, palette.blue); star(p, 22, 11, palette.gold); }],
  ["relics/r003_dream_album.png", (p) => { rect(p, 8, 6, 17, 21, palette.outline); rect(p, 9, 7, 15, 19, palette.purple); rect(p, 12, 11, 8, 7, palette.blue); star(p, 20, 21, palette.gold); }],
  ["relics/r004_moonlight_bookmark_relic.png", (p) => bookmark(p, 2, 0, 2, true)],
  ["relics/r005_lucky_charm.png", (p) => { rect(p, 15, 4, 2, 7, palette.outline); circle(p, 16, 16, 8, palette.outline); circle(p, 16, 16, 6, palette.gold); clover(p, 8, 8, 1, false); }],
  ["relics/r006_strawberry_milkshake_cup.png", (p) => milkshake(p, 2, 0, 2, false)],
];

function drawDango(p, boss = false) {
  const s = boss ? 2 : 1;
  circle(p, 24 * s, 26 * s, 16 * s, palette.outline);
  circle(p, 24 * s, 26 * s, 14 * s, palette.cream);
  rect(p, 18 * s, 25 * s, 3 * s, 3 * s, palette.black);
  rect(p, 28 * s, 25 * s, 3 * s, 3 * s, palette.black);
  rect(p, 22 * s, 33 * s, 5 * s, 2 * s, palette.red);
  if (boss) {
    rect(p, 34, 16, 18, 8, palette.gold);
    rect(p, 36, 12, 3, 5, palette.gold);
    rect(p, 43, 10, 4, 7, palette.gold);
    rect(p, 50, 12, 3, 5, palette.gold);
    rect(p, 58, 46, 18, 5, palette.outline);
    rect(p, 70, 26, 5, 24, palette.gold);
  } else {
    rect(p, 22, 5, 5, 9, palette.outline);
    rect(p, 23, 6, 3, 7, palette.pink);
    put(p, 26, 3, palette.outline);
  }
}

function drawRobot(p, color, alert = false, boss = false) {
  const s = boss ? 2 : 1;
  rect(p, 12 * s, 13 * s, 24 * s, 20 * s, palette.outline);
  rect(p, 14 * s, 15 * s, 20 * s, 16 * s, color);
  rect(p, 18 * s, 20 * s, 4 * s, 4 * s, alert ? palette.red : palette.blue);
  rect(p, 27 * s, 20 * s, 4 * s, 4 * s, alert ? palette.red : palette.blue);
  rect(p, 10 * s, 35 * s, 28 * s, 5 * s, palette.darkGray);
  rect(p, 20 * s, 7 * s, 8 * s, 5 * s, alert ? palette.red : palette.gold);
  if (boss) {
    rect(p, 12, 56, 24, 11, palette.darkGray);
    rect(p, 62, 30, 14, 8, palette.red);
    rect(p, 70, 34, 12, 4, palette.blue);
  }
}

function drawGhost(p) {
  ellipse(p, 24, 24, 15, 18, palette.outline);
  ellipse(p, 24, 24, 13, 16, palette.white);
  rect(p, 18, 22, 5, 4, palette.darkGray);
  rect(p, 27, 22, 5, 4, palette.darkGray);
  rect(p, 15, 33, 18, 6, palette.cream);
}

function drawCloud(p) {
  circle(p, 17, 25, 9, palette.outline);
  circle(p, 27, 22, 12, palette.outline);
  circle(p, 33, 29, 8, palette.outline);
  circle(p, 17, 25, 7, palette.gray);
  circle(p, 27, 22, 10, palette.gray);
  circle(p, 33, 29, 6, palette.gray);
  line(p, 23, 35, 18, 43, palette.gold);
  line(p, 24, 35, 29, 36, palette.gold);
  line(p, 29, 36, 23, 45, palette.gold);
}

function drawCatBoss(p) {
  ellipse(p, 48, 52, 30, 26, palette.outline);
  ellipse(p, 48, 52, 27, 23, palette.purple);
  line(p, 25, 31, 34, 12, palette.outline);
  line(p, 62, 12, 72, 31, palette.outline);
  rect(p, 37, 45, 6, 8, palette.gold);
  rect(p, 54, 45, 6, 8, palette.gold);
  rect(p, 46, 61, 8, 3, palette.black);
  circle(p, 66, 28, 5, palette.cream);
}

function drawShadowBoss(p) {
  ellipse(p, 48, 56, 24, 32, palette.outline);
  ellipse(p, 48, 56, 21, 29, palette.deep);
  rect(p, 40, 42, 5, 5, palette.blue);
  rect(p, 52, 42, 5, 5, palette.blue);
  for (const [x, y] of [[30, 30], [68, 38], [36, 78], [60, 82]]) star(p, x, y, palette.gold);
}

function drawConductorBoss(p) {
  drawRobot(p, palette.darkBlue, false, true);
  rect(p, 30, 8, 36, 10, palette.outline);
  rect(p, 33, 9, 30, 7, palette.blue);
  rect(p, 20, 70, 56, 8, palette.darkBlue);
  rect(p, 28, 72, 8, 4, palette.white);
  rect(p, 54, 72, 8, 4, palette.white);
}

function drawDawnCore(p) {
  circle(p, 48, 48, 30, palette.outline);
  circle(p, 48, 48, 25, palette.darkBlue);
  circle(p, 48, 48, 12, palette.gold);
  circle(p, 48, 48, 6, palette.white);
  line(p, 12, 48, 84, 48, palette.blue);
  line(p, 48, 12, 48, 84, palette.blue);
  star(p, 30, 30, palette.white);
  star(p, 66, 66, palette.white);
}

const monsters = [
  ["monsters/m001_lost_dango.png", 48, drawDango],
  ["monsters/m002_patrol_robot.png", 48, (p) => drawRobot(p, palette.blue)],
  ["monsters/m003_repair_robot.png", 48, (p) => drawRobot(p, palette.yellow)],
  ["monsters/m004_alert_robot.png", 48, (p) => drawRobot(p, palette.red, true)],
  ["monsters/m005_sleepless_ghost.png", 48, drawGhost],
  ["monsters/m006_storm_cloud_sprite.png", 48, drawCloud],
];

const bosses = [
  ["bosses/b001_giant_dango_king.png", 96, (p) => drawDango(p, true)],
  ["bosses/b002_rogue_robot_mk01.png", 96, (p) => drawRobot(p, palette.gray, true, true)],
  ["bosses/b003_nightmare_cat.png", 96, drawCatBoss],
  ["bosses/b004_forgotten_shadow.png", 96, drawShadowBoss],
  ["bosses/b005_star_rail_conductor.png", 96, drawConductorBoss],
  ["bosses/b006_dawn_core.png", 96, drawDawnCore],
];

for (const [file, size, draw] of [...weapons, ...relics.map(([file, draw]) => [file, 32, draw]), ...monsters, ...bosses]) {
  writePng(file, size, draw);
}

const manifest = {
  weapons: {
    W001: {
      baseIcon: "weapons/w001_mango_cake_weapon.png",
      evolvedIcon: "weapons/w001_rainbow_layer_cake_weapon.png",
      baseProjectile: "projectiles/w001_mango_cake_projectile.png",
      evolvedProjectile: "projectiles/w001_rainbow_layer_cake_projectile.png",
    },
    W002: {
      baseIcon: "weapons/w002_strawberry_milkshake_weapon.png",
      evolvedIcon: "weapons/w002_sweet_dream_milkshake_storm_weapon.png",
      baseProjectile: "projectiles/w002_strawberry_milkshake_orbit.png",
      evolvedProjectile: "projectiles/w002_sweet_dream_milkshake_storm_orbit.png",
    },
    W003: {
      baseIcon: "weapons/w003_starlight_paper_plane_weapon.png",
      evolvedIcon: "weapons/w003_galaxy_messenger_weapon.png",
      baseProjectile: "projectiles/w003_starlight_paper_plane_projectile.png",
      evolvedProjectile: "projectiles/w003_galaxy_messenger_projectile.png",
    },
    W004: {
      baseIcon: "weapons/w004_lucky_clover_weapon.png",
      evolvedIcon: "weapons/w004_wheel_of_fortune_weapon.png",
      baseProjectile: "projectiles/w004_lucky_clover_projectile.png",
      evolvedProjectile: "projectiles/w004_wheel_of_fortune_projectile.png",
    },
    W005: {
      baseIcon: "weapons/w005_moonlight_bookmark_weapon.png",
      evolvedIcon: "weapons/w005_full_moon_bookmark_array_weapon.png",
      baseProjectile: "projectiles/w005_moonlight_bookmark_projectile.png",
      evolvedProjectile: "projectiles/w005_full_moon_bookmark_projectile.png",
    },
    W006: {
      baseIcon: "weapons/w006_star_orbit_pulse_weapon.png",
      evolvedIcon: "weapons/w006_celestial_judgement_weapon.png",
      baseProjectile: "projectiles/w006_star_orbit_pulse_marker.png",
      evolvedProjectile: "projectiles/w006_celestial_judgement_pillar.png",
    },
  },
  relics: {
    R001: "relics/r001_xingli_hairpin.png",
    R002: "relics/r002_cafe_membership_card.png",
    R003: "relics/r003_dream_album.png",
    R004: "relics/r004_moonlight_bookmark_relic.png",
    R005: "relics/r005_lucky_charm.png",
    R006: "relics/r006_strawberry_milkshake_cup.png",
  },
  monsters: {
    M001: "monsters/m001_lost_dango.png",
    M002: "monsters/m002_patrol_robot.png",
    M003: "monsters/m003_repair_robot.png",
    M004: "monsters/m004_alert_robot.png",
    M005: "monsters/m005_sleepless_ghost.png",
    M006: "monsters/m006_storm_cloud_sprite.png",
  },
  bosses: {
    B001: "bosses/b001_giant_dango_king.png",
    B002: "bosses/b002_rogue_robot_mk01.png",
    B003: "bosses/b003_nightmare_cat.png",
    B004: "bosses/b004_forgotten_shadow.png",
    B005: "bosses/b005_star_rail_conductor.png",
    B006: "bosses/b006_dawn_core.png",
  },
};

fs.writeFileSync(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Generated 42 battle pixel assets and manifest.json");
