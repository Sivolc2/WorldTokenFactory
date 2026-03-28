declare module 'georaster' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseGeoraster(input: ArrayBuffer | string): Promise<any>;
  export default parseGeoraster;
}

declare module 'georaster-layer-for-leaflet' {
  import { Layer, LayerOptions } from 'leaflet';
  interface GeoRasterLayerOptions extends LayerOptions {
    georaster: unknown;
    opacity?: number;
    resolution?: number;
    pixelValuesToColorFn?: (values: number[]) => string | null | undefined;
  }
  class GeoRasterLayer extends Layer {
    constructor(options: GeoRasterLayerOptions);
  }
  export default GeoRasterLayer;
}
