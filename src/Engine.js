"use strict";

class Vector {
  static default() {
    return new Vector(0, 0);
  }

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  size() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
  add(target) {
    return new Vector(this.x + target.x, this.y + target.y);
  }
  sub(target) {
    return new Vector(this.x - target.x, this.y - target.y);
  }
  mul(value) {
    return new Vector(this.x * value, this.y * value);
  }
  equal(target, tor = 0) {
    return this.distance(target) <= tor;
  }
  distance(target) {
    return this.sub(target).size();
  }
  normalize() {
    return new Vector(this.x / this.size(), this.y / this.size());
  }
  copy() {
    return new Vector(this.x, this.y);
  }
}

class Transform {
  static default() {
    return new Transform(Vector.default(), 0, new Vector(1, 1));
  }

  constructor(location, rotation, scale) {
    this.location = location;
    this.rotation = rotation;
    this.scale = scale;
  }

  copy() {
    return new Transform(
      this.location.copy(),
      this.rotation,
      this.scale.copy()
    );
  }
}

class EngineObject {
  static OBJECTS = [];
  constructor(transform) {
    this.transform = transform.copy();
    this.layer = 0;

    this.movement_controllers = [];
    this.predefined_movement_controllers = [];
    this.lerp_controller = null;

    this.max_speed = 500;
    this.acc_speed = 1000;
    this.velocity = Vector.default();

    this.disable_collision = false;

    EngineObject.OBJECTS.push(this);
  }

  update() {
    if (this.lerp_controller != null && this.lerp_controller.ENABLED) {
      this.lerp_controller.update();
      this.transform.location = this.lerp_controller.value.copy();
    }

    this.velocity = Vector.default();
    for (let i = 0; i < this.predefined_movement_controllers.length; i++) {
      this.predefined_movement_controllers[i].update();
      this.velocity = this.velocity.add(
        this.predefined_movement_controllers[i].vel
      );
    }
    for (let i = 0; i < this.movement_controllers.length; i++) {
      this.movement_controllers[i].update();
      this.velocity = this.velocity.add(this.movement_controllers[i].vel);
    }
  }

  collision_check() {
    if (this.disable_collision) return false;
  }

  lerpMove(dest, dur) {
    this.lerp_controller = new LerpController(
      this.transform.location,
      dest,
      dur
    );
  }

  move(acc) {
    let mc = new MovementController(this);
    this.movement_controllers.push(mc);
    mc.move(acc);
  }

  stop() {
    this.movement_controllers.forEach((mc) => mc.reverse());
  }

  enable_default_movement(
    forward = "ArrowUp",
    back = "ArrowDown",
    left = "ArrowLeft",
    right = "ArrowRight"
  ) {
    for (let i = 0; i < 4; i++) {
      this.predefined_movement_controllers.push(new MovementController(this));
    }

    add_input({
      keydown: (event) => {
        switch (event.key) {
          case forward:
            this.predefined_movement_controllers[0].moveForward();
            break;
          case back:
            this.predefined_movement_controllers[1].moveBack();
            break;
          case left:
            this.predefined_movement_controllers[2].moveLeft();
            break;
          case right:
            this.predefined_movement_controllers[3].moveRight();
            break;
        }
      },
      keyup: (event) => {
        switch (event.key) {
          case forward:
            this.predefined_movement_controllers[0].reverse();
            break;
          case back:
            this.predefined_movement_controllers[1].reverse();
            break;
          case left:
            this.predefined_movement_controllers[2].reverse();
            break;
          case right:
            this.predefined_movement_controllers[3].reverse();
            break;
        }
      },
    });
  }

  destroy() {
    let index = EngineObject.OBJECTS.indexOf(this);
    EngineObject.OBJECTS.splice(index, 1);
  }
}

class Camera extends EngineObject {
  static instance = null;
  static init() {
    Camera.instance = new Camera(Transform.default());
    Camera.instance.transform.location = new Vector(
      Engine.canvas.width / 2,
      Engine.canvas.height / 2
    );
  }
}

class Component extends EngineObject {
  constructor(transform, parent = null) {
    super(transform);
    this.parent = parent;
    this.local_transform = Transform.default();
  }

  draw() {
    if (this.parent == null) return;
    this.transform.location = this.parent.transform.location.add(
      this.local_transform.location
    );
    this.transform.scale.x =
      this.parent.transform.scale.x * this.local_transform.scale.x;
    this.transform.scale.y =
      this.parent.transform.scale.y * this.local_transform.scale.y;
  }

  bind_to(parent, convert_to_local = true) {
    this.parent = parent;
    if (convert_to_local) {
      this.local_transform = this.transform.copy();
    }
  }
}

class DrawComponent extends Component {
  constructor(transform, style = {}, parent = null) {
    super(transform, parent);
    this.style = {
      fill: true,
      fill_color: "black",
      stroke: false,
      stroke_color: "black",
      stroke_weight: 1,
      font_family: "consolas",
      align_hori: "center",
      align_vert: "middle",
    };

    let keys = Object.keys(this.style);
    keys.forEach((key) => {
      if (style[key] != undefined) this.style[key] = style[key];
    });
  }

  draw() {
    super.draw();
    this.transform.location = this.transform.location.sub(
      Camera.instance.transform.location.sub(
        new Vector(Engine.canvas.width / 2, Engine.canvas.height / 2)
      )
    );

    Engine.ctx.beginPath();
    this._rotate();
    this._draw_path();
    Engine.ctx.closePath();
    Engine.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _rotate() {
    Engine.ctx.translate(this.transform.location.x, this.transform.location.y);
    Engine.ctx.rotate(this.transform.rotation);
    Engine.ctx.translate(
      -this.transform.location.x,
      -this.transform.location.y
    );

    Engine.ctx.translate(
      this.parent.transform.location.x,
      this.parent.transform.location.y
    );
    Engine.ctx.rotate(this.parent.transform.rotation);
    Engine.ctx.translate(
      -this.parent.transform.location.x,
      -this.parent.transform.location.y
    );
  }

  _draw_path() {}
}

class Rect extends DrawComponent {
  constructor(transform, style = {}, parent = null) {
    super(transform, style, parent);
  }

  _draw_path() {
    Engine.ctx.rect(
      this.transform.location.x - this.transform.scale.x / 2,
      this.transform.location.y - this.transform.scale.y / 2,
      this.transform.scale.x,
      this.transform.scale.y
    );

    if (this.style["fill"]) {
      Engine.ctx.fillStyle = this.style["fill_color"];
      Engine.ctx.fill();
    }

    if (this.style["stroke"]) {
      Engine.ctx.strokeStyle = this.style["stroke_color"];
      Engine.ctx.lineWidth = this.style["stroke_weight"];
      Engine.ctx.stroke();
    }
  }

  collision_check(check_location) {
    super.collision_check();

    let hsx = this.transform.scale.x / 2;
    let hsy = this.transform.scale.y / 2;

    return (
      this.transform.location.x - hsx <= check_location.x &&
      check_location.x <= this.transform.location.x + hsx &&
      this.transform.location.y - hsy <= check_location.y &&
      check_location.y <= this.transform.location.y + hsy
    );
  }
}

class Circle extends DrawComponent {
  constructor(transform, style = {}, parent = null) {
    super(transform, style, parent);
  }

  _draw_path() {
    Engine.ctx.arc(
      this.transform.location.x,
      this.transform.location.y,
      this.transform.scale.x,
      0,
      Math.PI * 2,
      false
    );

    if (this.style["fill"]) {
      Engine.ctx.fillStyle = this.style["fill_color"];
      Engine.ctx.fill();
    }

    if (this.style["stroke"]) {
      Engine.ctx.strokeStyle = this.style["stroke_color"];
      Engine.ctx.stroke();
    }
  }

  collision_check(check_location) {
    super.collision_check();

    return (
      this.transform.location.distance(check_location) <= this.transform.scale.x
    );
  }
}

class Text extends DrawComponent {
  constructor(transform, style = {}, text = "Example Text", parent = null) {
    super(transform, style, parent);
    this.text = text;
  }

  _draw_path() {
    var px = this.transform.scale.x;
    let font =
      this.style["font_family"] == undefined
        ? "consolas"
        : this.style["font_family"];
    var str = px + "px " + font;
    Engine.ctx.font = str;
    Engine.ctx.fillStyle = this.style["fill_color"];
    Engine.ctx.textAlign = this.style["align_hori"];
    Engine.ctx.textBaseline = this.style["align_vert"];
    Engine.ctx.fillText(
      this.text,
      this.transform.location.x,
      this.transform.location.y
    );
  }
}

class Img extends DrawComponent {
  constructor(transform, style = {}, src = "...", parent = null) {
    super(transform, style, parent);
    this.style = {
      map_index: Vector.default(),
      map_scale: this.transform.scale.copy(),
    };

    let keys = Object.keys(this.style);
    keys.forEach((key) => {
      if (style[key] != undefined) this.style[key] = style[key];
    });

    this.image = new Image(transform.scale.x, transform.scale.y);
    this.image.src = src;
  }

  _draw_path() {
    Engine.ctx.drawImage(
      this.image,
      this.style.map_index.x,
      this.style.map_index.y,
      this.style.map_scale.x,
      this.style.map_scale.y,
      this.transform.location.x - this.transform.scale.x / 2,
      this.transform.location.y - this.transform.scale.y / 2,
      this.transform.scale.x,
      this.transform.scale.y
    );
  }
}

class GameObject extends EngineObject {
  static GAMEOBJECTS = [];
  static GameObject_Loop() {
    for (let ly = 0; ly < 10; ly++) {
      for (let i = 0; i < GameObject.GAMEOBJECTS.length; i++) {
        if (GameObject.GAMEOBJECTS[i].layer == ly)
          GameObject.GAMEOBJECTS[i].update();
      }
    }
  }

  constructor(transform, comp_ary = []) {
    super(transform);
    this.component_ary = [];

    this.init_components(comp_ary);
    GameObject.GAMEOBJECTS.push(this);
  }

  update() {
    super.update();

    for (let i = 0; i < this.component_ary.length; i++) {
      this.component_ary[i].draw();
    }
  }

  init_components(comp_ary) {
    for (let i = 0; i < comp_ary.length; i++) {
      comp_ary[i].bind_to(this);
      this.component_ary.push(comp_ary[i]);
    }
  }

  add_component(component) {
    component.bind_to(this);
    this.component_ary.push(component);
  }

  remove_component(component) {
    component.parent = null;
    let index = this.component_ary.indexOf(component);
    this.component_ary.splice(index, 1);
  }

  destroy() {
    super.destroy();

    this.component_ary.forEach((comp) => (comp.parent = null));
    this.component_ary = [];

    let index = GameObject.GAMEOBJECTS.indexOf(this);
    GameObject.GAMEOBJECTS.splice(index, 1);
  }
}

class LerpController {
  constructor(start, end, dur) {
    this.ENABLED = true;
    this.t = 0;
    this.start = start;
    this.end = end;
    this.dur = dur;
    this.func = this.Expo;
    this.value = start;
  }

  update() {
    if (!this.ENABLED) return;

    let x = this.func(
      this.t,
      this.start.x,
      this.end.x - this.start.x,
      this.dur
    );
    let y = this.func(
      this.t,
      this.start.y,
      this.end.y - this.start.y,
      this.dur
    );

    if (this.t > this.dur) this.ENABLED = false;
    else this.value = new Vector(x, y);

    this.t += 1 / 60;
  }

  Linear(t, b, c, d) {
    return (c * t) / d + b;
  }

  Quad(t, b, c, d) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
    return (-c / 2) * (--t * (t - 2) - 1) + b;
  }

  Expo(t, b, c, d) {
    if (t == 0) return b;
    if (t == d) return b + c;
    if ((t /= d / 2) < 1) return (c / 2) * Math.pow(2, 10 * (t - 1)) + b;
    return (c / 2) * (-Math.pow(2, -10 * --t) + 2) + b;
  }

  Quint(t, b, c, d) {
    if ((t /= d / 2) < 1) return (c / 2) * t * t * t * t * t + b;
    return (c / 2) * ((t -= 2) * t * t * t * t + 2) + b;
  }
}

class MovementController {
  constructor(parent) {
    this.STATUS = 0;
    this.vel = Vector.default();
    this.acc = Vector.default();
    this.parent = parent;
  }

  move(acc) {
    this.STATUS = 1;
    this.acc = acc;
  }

  reverse(frag = this.acc.size()) {
    this.STATUS = 2;
    this.acc = new Vector(
      -1 * Math.sign(this.acc.x) * frag,
      -1 * Math.sign(this.acc.y) * frag
    );
  }

  moveForward() {
    this.STATUS = 1;
    this.acc = new Vector(0, -this.parent.acc_speed);
  }
  moveBack() {
    this.STATUS = 1;
    this.acc = new Vector(0, this.parent.acc_speed);
  }
  moveRight() {
    this.STATUS = 1;
    this.acc = new Vector(this.parent.acc_speed, 0);
  }
  moveLeft() {
    this.STATUS = 1;
    this.acc = new Vector(-this.parent.acc_speed, 0);
  }

  update() {
    if (this.STATUS == 0) return;

    let new_vel = this.vel.add(this.acc.mul(1 / 60));

    if (
      this.STATUS == 2 &&
      (Math.sign(new_vel.x) != Math.sign(this.vel.x) ||
        Math.sign(new_vel.y) != Math.sign(this.vel.y))
    ) {
      this.acc = new Vector(0, 0);
      this.STATUS = 0;
      this.destroy();
    }

    if (new_vel.size() < this.parent.max_speed) this.vel = new_vel;

    this.parent.transform.location = this.parent.transform.location.add(
      this.vel.mul(1 / 60)
    );
  }

  destroy() {
    let index = this.parent.movement_controllers.indexOf(this);
    this.parent.movement_controllers.splice(index, 1);
  }
}

class Timer {
  static TIMERS = [];
  constructor(time, callback) {
    this.start_time = Engine.TICK;
    this.time = time;
    this.callback = callback;
    this.ENABLED = true;
    Timer.TIMERS.push(this);
  }

  update() {
    if (!this.ENABLED) return;

    if (Engine.TICK - this.start_time >= this.time) {
      this.callback();
      this.ENABLED = false;
      Timer.TIMERS.splice(Timer.TIMERS.indexOf(this), 1);
    }
  }
}

class Engine {
  static canvas = null;
  static ctx = null;
  static TICK = 0;
  static isLoop = true;
  static update_func = null;
  static init(canvas_w = innerWidth - 20, canvas_h = innerHeight - 20) {
    if (document.querySelector("canvas") == null) {
      Engine.canvas = document.createElement("canvas");
      document.body.appendChild(Engine.canvas);
    } else {
      Engine.canvas = document.querySelector("canvas");
    }

    Engine.ctx = Engine.canvas.getContext("2d");

    Engine.canvas.width = canvas_w;
    Engine.canvas.height = canvas_h;

    Camera.init();
    Engine.animate();
  }

  static animate() {
    if (!Engine.isLoop) return;

    requestAnimationFrame(Engine.animate);
    Engine.ctx.clearRect(0, 0, Engine.canvas.width, Engine.canvas.height);

    GameObject.GameObject_Loop();
    Camera.instance.update();

    if (Engine.update_func != null) Engine.update_func();
    Timer.TIMERS.forEach((t) => t.update());

    Engine.TICK++;
  }

  static loop() {
    Engine.isLoop = true;
  }

  static unloop() {
    Engine.isLoop = false;
  }
}

function add_input(binding_dict) {
  let keys = Object.keys(binding_dict);
  keys.forEach((key) => {
    addEventListener(key, binding_dict[key]);
  });
}
