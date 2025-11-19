export interface OverseaNodeCoord {
  type: OverseaCoordType.NODE;
  id: number;
  lat: number;
  lon: number;
}

export enum OverseaCoordType {
  NODE = 'node',
  WAY = 'way',
}

export interface OverseaWayType {
  type: OverseaCoordType.WAY;
  id: number;
  nodes: number[];
  tags: {
    highway?: string;
    lanes?: string;
    lit?: string;
    name?: string;
    'name:en'?: string;
    surface?: string;
    source?: string;
  };
}
