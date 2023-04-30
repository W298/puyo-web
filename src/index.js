const SPEED = 60;

function keydownevent(event) {
  if (!double_puyo || double_puyo.end) return;
  switch (event.key) {
    case "ArrowDown":
      double_puyo.moveDown();
      break;
    case "ArrowLeft":
      double_puyo.moveLeft();
      break;
    case "ArrowRight":
      double_puyo.moveRight();
      break;
    case "r":
      double_puyo.rotate(1);
      break;
    case "e":
      double_puyo.rotate(-1);
      break;
    case "d":
      double_puyo.instant_drop();
      break;
  }
}

function instant_drop() {
  for (let i = 0; i < grid.n.x; i++) {
    let col = [];
    for (let j = grid.n.y - 1; j >= 0; j--) {
      let p = find_puyo(new Vector(i, j), false);
      if (p) col.push(p);
    }

    for (let k = 0; k < col.length; k++) {
      col[k].instant_drop();
    }
  }
}

function update_chain() {
  Chain.CHAINS = [];

  Puyo.PUYOS.forEach((p) => {
    if (p.HEAD) {
      let chain_ary = [];
      p.check_chain(chain_ary);

      let err = false;
      chain_ary.forEach((p) => {
        if (!p.STATUS) err = true;
      });

      if (!err) {
        let simple_chain_ary = [];
        chain_ary.forEach((cp) => {
          simple_chain_ary.push(convertToSimple(cp));
        });

        if (simple_chain_ary.length != 0) {
          let chain = new Chain(simple_chain_ary);
          chain_ary.forEach((c) => {
            if (c != p) {
              c.HEAD = false;
            }
          });
        }
      }
    }
  });

  Puyo.PUYOS.forEach((p) => (p.HEAD = true));
}

function update() {
  if (double_puyo != null) double_puyo.update();

  update_chain();

  Chain.CHAINS.forEach((c) => {
    if (c.STATUS && c.len >= 4) {
      c.blast();
    }
  });

  if (blast_log.length == 1) {
    if (Engine.TICK - blast_log[0] > 50) {
      blast_log = [];
      continuous_chain = 0;
      color_log = [];
    }
  }

  update_score();
  update_chain_score();
}

function find_puyo(index, include_double = true) {
  for (let i = 0; i < Puyo.PUYOS.length; i++) {
    if (Puyo.PUYOS[i].index.equal(index)) {
      if (!include_double) {
        if (
          Puyo.PUYOS[i] == double_puyo.up ||
          Puyo.PUYOS[i] == double_puyo.down
        ) {
          continue;
        }
      }
      return Puyo.PUYOS[i];
    }
  }
  return null;
}

function create_dummy(parent_grid) {
  let c1 = Math.floor(Math.random() * 5) * 3;
  while (c1 == parent_grid.unSelected_color) {
    c1 = Math.floor(Math.random() * 5) * 3;
  }

  let c2 = Math.floor(Math.random() * 5) * 3;
  while (c2 == parent_grid.unSelected_color) {
    c2 = Math.floor(Math.random() * 5) * 3;
  }

  return { up: c1, down: c2 };
}

function update_dummy() {
  for (let i = 0; i < 3; i++) {
    let q = double_puyo_que[i];
    let dummy_up = new DummyPuyo(new Vector(i, 0), q["up"]);
    let dummy_down = new DummyPuyo(new Vector(i, 1), q["down"]);
  }
}

function update_chain_score() {
  if (continuous_chain == 0) {
    chainText.text = "";
  } else {
    chainText.text = continuous_chain + " CHAIN!";
  }
}

function update_score() {
  document.querySelector("#score").innerText = "Score: " + score;
}

function game_end() {
  Engine.unloop();
  double_puyo = null;
  document.querySelector("#game-title").innerText = "GAME OVER!";
}

// Variables ------------------------------------ //

let blast_log = [];
let continuous_chain = 0;
let color_log = [];

let scaler = 0;
let border = null;
let border_obj = null;
let border_right = null;
let border_right_obj = null;
let grid = null;
let chainText = null;
let chainObj = null;
let double_puyo_que = null;
let double_puyo = null;
let score = 0;

// Graphic Setup --------------------------------------------- //

let kakaoFont = new FontFace("kakao", "url(./css/KakaoRegular.woff)");
kakaoFont.load().then((font) => {
  document.fonts.add(font);
  console.log("Font Loaded!");

  Load();
});

function Load() {
  scaler = innerHeight / 16.5;

  border = new Rect(Transform.default(), {
    fill: false,
    stroke: true,
    stroke_weight: 5,
    stroke_color: "white",
  });

  border.transform.scale = new Vector(scaler * 6 + 15, scaler * 13 + 15);

  border_obj = new GameObject(Transform.default(), [border]);
  border_obj.transform.location = new Vector(
    (scaler * 6) / 2 + 15,
    (scaler * 13) / 2 + 15
  );

  border_right = new Rect(Transform.default(), {
    fill: false,
    stroke: true,
    stroke_weight: 5,
    stroke_color: "white",
  });
  border_right.transform.scale = new Vector(scaler * 3 + 15, scaler * 2 + 15);

  border_right_obj = new GameObject(Transform.default(), [border_right]);
  border_right_obj.transform.location = new Vector(
    (scaler * 3) / 2 + 15 + scaler * 6 + 15 + 15,
    (scaler * 2) / 2 + 15
  );

  grid = new Grid(new Vector(6, 13));

  chainText = new Text(
    Transform.default(),
    {
      fill_color: "white",
      align_hori: "center",
      align_vert: "middle",
      font_family: "kakao",
    },
    ""
  );
  chainText.transform.scale = new Vector(40, 40);

  chainObj = new GameObject(Transform.default(), [chainText]);
  chainObj.transform.location = new Vector(
    (scaler * 3) / 2 + 15 + scaler * 6 + 15 + 15,
    (scaler * 6) / 2 + 15
  );
  chainObj.layer = 1;

  // Game system Init ------------------------------------------ //

  Engine.init(innerWidth / 1.1, innerHeight / 1.22);
  Engine.ctx.imageSmoothingEnabled = false;

  add_input({ keydown: keydownevent });
  Engine.update_func = update;

  double_puyo_que = [
    create_dummy(grid),
    create_dummy(grid),
    create_dummy(grid),
    create_dummy(grid),
  ];
  double_puyo = new DoublePuyo();

  score = 0;
}
