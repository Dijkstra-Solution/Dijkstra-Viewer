abstract class AEntity {
  readonly guid: string;
  constructor(guid: string) {
    this.guid = guid;
  }
  Parent: AEntity | null = null;
}

export { AEntity };
