// Tuning: speeds in m/s, distances in metres, times in seconds.
export const LAPS = 3;
export const HALF = 16;             // half road width (m)
export const TOP = 112;             // top speed m/s (about 400 km/h)
export const BOOST_TOP = 172;
export const ACCEL = 62;
export const BOOST_COST = 20;
export const HOVER = 0.55;

// steering: how fast the nose turns (rad/s) at speed, normally and with the air brake held
export const STEER_RATE = 2.1;
export const AIR_STEER_RATE = 2.75;

// walls: the kart stops this far from the rail, glances off and keeps most of its speed
export const WALL_GAP = 1.4;
export const WALL_CUSHION = 2.5;      // within this distance of the wall the kart is eased away from it
export const WALL_CUSHION_TURN = 0.3; // how hard it's eased (rad/s per metre inside the cushion)
export const WALL_ALIGN = 18;         // how quickly the nose turns to run along the wall
export const WALL_BOUNCE = 0.35;      // sideways speed bounced back, as a share of the hit
export const WALL_BOUNCE_MAX = 5;
export const WALL_SPEED_LOSS = 0.003; // share of forward speed lost per m/s of sideways hit
export const WALL_SPEED_LOSS_MAX = 0.05;
export const WALL_SCRAPE_DRAG = 0.15; // share of speed lost per second while scraping along
export const WALL_ENERGY_FREE = 6;    // sideways hits slower than this cost no energy
export const WALL_ENERGY = 0.2;       // energy lost per m/s of hit above that
export const WALL_SOUND_MIN = 6;      // only hits harder than this make a sound

// energy: it slowly recharges on its own, and much faster in the pit lane
export const ENERGY_REGEN = 5;        // per second while racing (a boost every 4 s)
export const PIT_REFILL = 32;         // per second in the pit lane

// blaster: a limited clip of bolts that recharges; a hit drains the target's energy
export const AMMO_MAX = 6;
export const AMMO_RECHARGE = 3;       // seconds to get one bolt back
export const FIRE_COOLDOWN = 0.22;    // seconds between shots while the key is held
export const BOLT_SPEED = 90;         // m/s faster than the kart that fired it
export const BOLT_LIFE = 1.6;         // seconds before a bolt fizzles out
export const BOLT_DAMAGE = 15;        // energy a hit takes
export const BOLT_SLOW = 0.08;        // share of speed a hit takes
export const SHIELD_DOWN_SLOW = 0.35; // share of speed a hit takes when the target has no energy left
export const AI_FIRE_RANGE = [20, 140]; // metres ahead a rival will shoot at someone
