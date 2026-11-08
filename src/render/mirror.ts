interface Hideable {
  setVisible(value: boolean): unknown;
}

/**
 * Mirrors a core pool's dense `active` array onto reusable display objects, by index.
 * Objects are created on demand, never destroyed; extras are just hidden.
 */
export class Mirror<T, G extends Hideable> {
  private readonly objects: G[] = [];
  private shown = 0;

  constructor(
    private readonly create: () => G,
    private readonly apply: (obj: G, item: T) => void,
  ) {}

  sync(items: readonly T[]): void {
    const n = items.length;
    while (this.objects.length < n) this.objects.push(this.create());
    for (let i = 0; i < n; i++) {
      const obj = this.objects[i] as G;
      if (i >= this.shown) obj.setVisible(true);
      this.apply(obj, items[i] as T);
    }
    for (let i = n; i < this.shown; i++) (this.objects[i] as G).setVisible(false);
    this.shown = n;
  }
}
