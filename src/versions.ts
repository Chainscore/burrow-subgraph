
export class VersionsClass {
  getSchemaVersion(): string {
    return "2.0.1";;
  }

  getSubgraphVersion(): string {
    return "1.0.0";;
  }

  getMethodologyVersion(): string {
    return "1.0.0";;
  }
}


export const Versions = new VersionsClass();
