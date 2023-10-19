// export data to perform manual inspection 
// dhemerson.costa@ipam.org.br

// read input data 

// raw classification
var raw = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_classification_v1');

// segments
var segments = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_segments_v1');

// classification mode by segment
var mode = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_segmentsMode_v1');

// read terra class
var terra_class = ee.Image('projects/barbaracosta-ipam/assets/base/TERRACLASS_cerrado_2020')
  // remap to mapbiomas legend
  .remap([1, 2, 9, 10, 12, 13, 14, 15, 16, 17, 19, 20, 22, 51, 52],
         [3, 3, 9, 21, 21, 21, 21, 21, 30, 24, 21, 33, 27, 21, 24]);

// mapa do DF
var df_ref = ee.Image('projects/barbaracosta-ipam/assets/base/DF_cobertura-do-solo_2019_img')
  .select('classification_DF_2019');

// sentinel mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filter(ee.Filter.eq('year', 2020))
  .mosaic()
  .updateMask(mode);

// export 
Export.image.toDrive({
		image:mode,
    description: 'SD-23-Y-C_segmentsMode_v1',
    folder: 'MAPA_REFERENCIA',
    region: segments.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: raw,
    description: 'SD-23-Y-C_classification_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: segments,
    description: 'SD-23-Y-C_segments_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: terra_class,
    description: 'SD-23-Y-C_terraClass_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: df_ref,
    description: 'SD-23-Y-C_refDistritoFederal_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median', 'nir_median', 'red_median']),
    description: 'SD-23-Y-C_sentinelMedian_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median_wet', 'nir_median_wet', 'red_median_wet']),
    description: 'SD-23-Y-C_sentinelMedianWet_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median_dry', 'nir_median_dry', 'red_median_dry']),
    description: 'SD-23-Y-C_sentinelMedianDry_v1',
    folder: 'MAPA_REFERENCIA',
    region: raw.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});
