class GridBox extends GameObject {
  constructor(index, parent_grid) {
    super(Transform.default(), []);
    this.index = index;
    this.parent_grid = parent_grid;

    this.create_rect();

    this.transform.location = this.parent_grid.anchor.add(
      new Vector(
        this.index.x *
          (this.parent_grid.gap + this.component_ary[0].transform.scale.x),
        this.index.y *
          (this.parent_grid.gap + this.component_ary[0].transform.scale.y)
      )
    );
    this.transform.location = this.transform.location.add(
      this.component_ary[0].transform.scale.mul(0.5)
    );
  }

  create_rect() {
    let rect = new Rect(Transform.default());
    rect.transform.scale = this.parent_grid.box_size;
    rect.style = {
      fill: false,
      stroke: false,
      stroke_weight: 2,
      stroke_color: "white",
    };
    this.add_component(rect);
  }
}

class Grid {
  constructor(n) {
    this.gap = 0;
    this.anchor = new Vector(15, 15);
    this.box_size = new Vector(scaler, scaler);
    this.n = n;
    this.unSelected_color = Math.floor(Math.random() * 5) * 3;
    this.map = [];

    this.create_gridbox();
  }

  create_gridbox() {
    for (let i = 0; i < this.n.x; i++) {
      let map_row = [];
      for (let j = 0; j < this.n.y; j++) {
        let new_gridbox = new GridBox(new Vector(i, j), this);
        map_row.push(new_gridbox);
      }
      this.map.push(map_row);
    }
  }

  get_gridbox(index) {
    return this.map[index.x][index.y];
  }
}
