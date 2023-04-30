class DummyPuyo extends GameObject {
  constructor(index, color) {
    super(Transform.default(), []);
    this.index = index;
    this.TYPE = NORMAL;
    this.COLOR = color;
    this.create_img();

    this.grid_lt = new Vector(
      (scaler * 2) / 2 + 15 + scaler * 6 + 15 + 15 - scaler / 2,
      (scaler * 2) / 2 + 15 - scaler / 2
    );
    this.transform.location = this.grid_lt.add(
      new Vector(this.index.x * scaler, this.index.y * scaler)
    );
  }

  create_img() {
    let img = new Img(Transform.default(), {}, "./puyo/new_puyo.png");

    img.style = {
      map_index: this.TYPE.add(new Vector(this.COLOR, 0)).mul(16),
      map_scale: new Vector(16, 16),
    };
    img.transform.scale = new Vector(scaler, scaler);
    this.add_component(img);
  }
}

class Puyo extends GameObject {
  static PUYOS = [];
  constructor(index, parent_grid, color) {
    super(Transform.default(), []);
    this.index = index;
    this.STATUS = 1;
    this.TYPE = NORMAL;
    this.COLOR = color;
    this.HEAD = true;
    this.adjs = [];
    this.parent_grid = parent_grid;
    this.autoFall = true;

    this.disable_collision = true;

    this.create_img();
    this.transform.location = this.parent_grid.get_gridbox(
      this.index
    ).transform.location;
    Puyo.PUYOS.push(this);
  }

  get on_ground() {
    let newx = this.index.x;
    let newy = this.index.y + 1;

    let target = find_puyo(new Vector(newx, newy));
    if (target) {
      if (target != double_puyo.up && target != double_puyo.down) {
        return true;
      } else {
        if (target.on_ground) {
          return true;
        }
      }
    }

    if (0 > newy || newy >= this.parent_grid.n.y) {
      return true;
    }

    return false;
  }

  blocking_RL(dir) {
    let newx = this.index.x + dir.x;
    if (0 > newx || newx >= this.parent_grid.n.x) return true;

    let pu = find_puyo(new Vector(newx, this.index.y));
    if (pu) {
      if (pu == double_puyo.up || pu == double_puyo.down) {
        let newx_pu = pu.index.x + dir.x;
        if (0 > newx_pu || newx_pu >= this.parent_grid.n.x) return true;
      } else {
        return true;
      }
    }

    return false;
  }

  create_img() {
    let img = new Img(Transform.default(), {}, "./puyo/new_puyo.png");

    img.style = { map_index: this.TYPE.mul(16), map_scale: new Vector(16, 16) };
    img.transform.scale = new Vector(scaler, scaler);
    this.add_component(img);
  }

  move(dir) {
    if (!this.on_ground) {
      this.index.y = this.index.y + dir.y;
    }

    if (!this.blocking_RL(dir)) {
      this.index.x = this.index.x + dir.x;
    }
  }

  instant_drop() {
    let vpuyos = [];
    Puyo.PUYOS.forEach((p) => {
      if (p.index.x == this.index.x) {
        if (p.index.y > this.index.y) {
          vpuyos.push(p);
        }
      }
    });

    if (vpuyos.length == 0) {
      this.index.y = this.parent_grid.n.y - 1;
    } else {
      this.index.y = this.parent_grid.n.y - vpuyos.length - 1;
    }
  }

  update() {
    super.update();
    if (Engine.TICK % SPEED == 0 && this.autoFall) {
      this.move(new Vector(0, 1));
    }
    this.transform.location = this.parent_grid.get_gridbox(
      this.index
    ).transform.location;
    this.check_sticky();
  }

  update_img() {
    this.component_ary[0].style["map_index"] = this.TYPE.mul(16);
  }

  check_sticky() {
    this.adjs = [];
    let mod = [
      new Vector(-1, 0),
      new Vector(1, 0),
      new Vector(0, 1),
      new Vector(0, -1),
    ];
    let normal = true;
    let enabled = [false, false, false, false];

    for (let i = 0; i < mod.length; i++) {
      let target_index = this.index.add(mod[i]);
      let target_puyo = find_puyo(target_index);
      if (target_puyo != null && target_puyo.COLOR == this.COLOR) {
        enabled[i] = true;
        normal = false;

        if (!this.adjs.includes(target_puyo)) {
          this.adjs.push(target_puyo);
        }
      }
    }

    if (normal) {
      this.TYPE = new Vector(NORMAL.x + this.COLOR, NORMAL.y);
      this.update_img();
      return;
    }

    let new_type = new Vector(-100, -100);

    if (enabled[0] && enabled[1]) {
      new_type.x = 1;
    } else if (enabled[0] && !enabled[1]) {
      new_type.x = 2;
    } else if (!enabled[0] && enabled[1]) {
      new_type.x = 0;
    }

    if (enabled[2] && enabled[3]) {
      new_type.y = 1;
    } else if (enabled[2] && !enabled[3]) {
      new_type.y = 0;
    } else if (!enabled[2] && enabled[3]) {
      new_type.y = 2;
    }

    if (new_type.x == -100) {
      if (new_type.y == 1) {
        new_type.x = 2;
        new_type.y = 3;
      } else {
        new_type.x = 1;
        new_type.y += 3;
      }
    } else if (new_type.y == -100) {
      new_type.y = 4;
    }

    if (this.STATUS) {
      new_type.x += this.COLOR;
      this.TYPE = new_type;
      this.update_img();
    }
  }

  check_chain(chain) {
    for (let i = 0; i < this.adjs.length; i++) {
      if (!chain.includes(this.adjs[i])) {
        chain.push(this.adjs[i]);
        this.adjs[i].check_chain(chain);
      }
    }
  }

  blast() {
    this.STATUS = 0;

    this.TYPE = new Vector(this.TYPE.x, this.TYPE.y + 6);
    this.update_img();

    let blast_timer = new Timer(35, () => {
      this.destroy();
      instant_drop();
    });
  }

  destroy() {
    super.destroy();

    let index = Puyo.PUYOS.indexOf(this);
    Puyo.PUYOS.splice(index, 1);
  }
}

class DoublePuyo {
  constructor() {
    let colors = double_puyo_que.shift();
    update_dummy();
    double_puyo_que.push(create_dummy(grid));
    this.up = new Puyo(new Vector(2, 0), grid, colors["up"]);
    this.down = new Puyo(new Vector(2, 1), grid, colors["down"]);
    this.up.autoFall = false;
    this.down.autoFall = false;
    this.end = false;
  }

  update() {
    if (Engine.TICK % SPEED == 0) {
      this.down.move(new Vector(0, 1));
      this.up.move(new Vector(0, 1));
    }

    if ((this.up.on_ground || this.down.on_ground) && !this.end) {
      this.up.autoFall = true;
      this.down.autoFall = true;
      this.up.instant_drop();
      this.down.instant_drop();

      this.end = true;

      let timer = new Timer(SPEED / 2, () => {
        if (!find_puyo(new Vector(2, 0)) && !find_puyo(new Vector(2, 1))) {
          double_puyo = new DoublePuyo();
        } else {
          game_end();
        }
      });
    }
  }

  rotate(ccw = 1) {
    let current = -1;
    if (this.down.index.x == this.up.index.x) {
      if (this.down.index.y > this.up.index.y) current = 0;
      else current = 2;
    } else {
      if (this.down.index.x > this.up.index.x) current = 3;
      else current = 1;
    }

    let adder = Vector.default();
    if (ccw == 1) {
      switch (current) {
        case 0:
          adder = new Vector(1, 1);
          break;
        case 1:
          adder = new Vector(-1, 1);
          break;
        case 2:
          adder = new Vector(-1, -1);
          break;
        case 3:
          adder = new Vector(1, -1);
          break;
      }
    } else {
      switch (current) {
        case 0:
          adder = new Vector(-1, 1);
          break;
        case 1:
          adder = new Vector(-1, -1);
          break;
        case 2:
          adder = new Vector(1, -1);
          break;
        case 3:
          adder = new Vector(1, 1);
          break;
      }
    }

    let new_index = this.up.index.add(adder);

    let noWall = 0 <= new_index.x && new_index.x < this.up.parent_grid.n.x;
    let noPuyo = !find_puyo(new_index);

    if (noWall && noPuyo) {
      this.up.index = new_index;
    } else {
      this.rotate(ccw * -1);
      return;
    }
  }

  moveDown() {
    this.down.move(new Vector(0, 1));
    this.up.move(new Vector(0, 1));
  }

  moveLeft() {
    let dir = new Vector(-1, 0);

    if (!this.down.blocking_RL(dir) && !this.up.blocking_RL(dir)) {
      this.down.move(dir);
      this.up.move(dir);
    }
  }

  moveRight() {
    let dir = new Vector(1, 0);

    if (!this.down.blocking_RL(dir) && !this.up.blocking_RL(dir)) {
      this.down.move(dir);
      this.up.move(dir);
    }
  }

  instant_drop() {
    if (double_puyo.down.index.y > double_puyo.up.index.y) {
      double_puyo.down.instant_drop();
      double_puyo.up.instant_drop();
    } else {
      double_puyo.up.instant_drop();
      double_puyo.down.instant_drop();
    }
  }
}

class Chain {
  static CHAINS = [];
  constructor(simple_chain_ary) {
    this.STATUS = 1;
    this.ary = simple_chain_ary;
    Chain.CHAINS.push(this);
  }

  get len() {
    return this.ary.length;
  }

  equal(target) {
    let diff = false;
    this.ary.forEach((cc) => {
      target.ary.forEach((tc) => {
        if (!cc.equal(tc)) diff = true;
      });
    });

    return !diff;
  }

  blast() {
    this.STATUS = 0;

    this.ary.forEach((sp) => {
      let p = find_puyo(sp.index);
      if (p.STATUS) p.blast();
    });

    if (blast_log.length != 0) {
      let last = blast_log.pop();
      if (Engine.TICK - last <= 50) {
        continuous_chain++;
      }
    } else {
      continuous_chain = 1;
    }

    if (!color_log.includes(this.ary[0].color))
      color_log.push(this.ary[0].color);
    blast_log.push(Engine.TICK);

    let chainScore = chain_bonus[continuous_chain - 1];
    let connectScore = this.len < 12 ? connect_bonus[this.len - 4] : 10;
    let colorScore = color_bonus[color_log.length - 1];

    score += this.len * 10 * (chainScore + connectScore + colorScore + 1);

    console.log("Blast Chain");
  }
}

class SimplePuyo {
  constructor(index, color, simpleGrid = null) {
    this.index = index;
    this.color = color;
    this.simpleGrid = simpleGrid;
  }

  equal(target) {
    return this.index.equal(target.index) && this.color == target.color;
  }
}

class SimpleGrid {
  constructor(n) {
    this.n = n;
    this.map = [];

    for (let i = 0; i < this.n.x; i++) {
      let map_row = [];
      for (let j = 0; j < this.n.y; j++) {
        map_row.push(null);
      }
      this.map.push(map_row);
    }
  }
}

function convertToSimple(puyo) {
  return new SimplePuyo(puyo.index, puyo.COLOR);
}

function createSimple() {
  let simpleGrid = new SimpleGrid(new Vector(6, 13));
  Puyo.PUYOS.forEach((p) => {
    let sp = new SimplePuyo(p.index, p.COLOR, simpleGrid);
    simpleGrid.map[p.index.x][p.index.y] = sp;
  });

  return simpleGrid;
}

const chain_bonus = [
  0, 9, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448,
  480, 512,
];
const connect_bonus = [0, 2, 3, 4, 5, 6, 7, 10];
const color_bonus = [0, 3, 6, 12, 24];

const NORMAL = new Vector(0, 3);
const UPLEFT = new Vector(0, 0);
const UPBOTH = new Vector(1, 0);
const UPRIGHT = new Vector(2, 0);
const BOTHLEFT = new Vector(0, 1);
const BOTHBOTH = new Vector(1, 1);
const BOTHRIGHT = new Vector(2, 1);
const DOWNLEFT = new Vector(0, 2);
const DOWNBOTH = new Vector(1, 2);
const DOWNRIGHT = new Vector(2, 2);

const RED = 0;
const PUR = 3;
const YEL = 6;
const GRE = 9;
const BLU = 12;
