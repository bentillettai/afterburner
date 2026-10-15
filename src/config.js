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
