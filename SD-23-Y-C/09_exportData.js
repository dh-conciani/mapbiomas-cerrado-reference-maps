// export data to perform manual inspection 
// dhemerson.costa@ipam.org.br

// read tile
var tile = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/selected_subTile');

// set output
var output = 'mapa-ref-tile';

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

// sentinel mosaic
var mosaic_prev = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filter(ee.Filter.eq('year', 2019))
  .mosaic()
  .updateMask(mode);

var mosaic_post = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filter(ee.Filter.eq('year', 2021))
  .mosaic()
  .updateMask(mode);

// planet
var analytic_202009 = ee.Image('projects/planet-nicfi/assets/basemaps/americas/planet_medres_normalized_analytic_2020-09_mosaic')
  .updateMask(mode);
  
var analytic_202012 = ee.Image('projects/planet-nicfi/assets/basemaps/americas/planet_medres_normalized_analytic_2020-12_mosaic')
  .updateMask(mode);


var analytic_202109 = ee.Image('projects/planet-nicfi/assets/basemaps/americas/planet_medres_normalized_analytic_2021-09_mosaic')
  .updateMask(mode);
  
var analytic_202111 = ee.Image('projects/planet-nicfi/assets/basemaps/americas/planet_medres_normalized_analytic_2021-11_mosaic')
  .updateMask(mode);




Map.addLayer(analytic_202109, {min:[200,200,50],max:[1700,1400,1100],gamma: 1.35, bands:["R", "G", "B"]}, 'PLANET 2020-09', false);
Map.addLayer(analytic_202111, {min:[200,200,50],max:[1700,1400,1100],gamma: 1.35, bands:["R", "G", "B"]}, 'PLANET 2020-12', false);

Export.image.toDrive({
		image: analytic_202009,
    description: 'SD-23-Y-C_planet2020-09_v1',
    folder: output,
    region: tile.geometry(),
    scale: 4.77,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: analytic_202012,
    description: 'SD-23-Y-C_planet2020-12_v1',
    folder: output,
    region: tile.geometry(),
    scale: 4.77,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});


Export.image.toDrive({
		image: analytic_202109,
    description: 'SD-23-Y-C_planet2021-09_v1',
    folder: output,
    region: tile.geometry(),
    scale: 4.77,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: analytic_202111,
    description: 'SD-23-Y-C_planet2021-11_v1',
    folder: output,
    region: tile.geometry(),
    scale: 4.77,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});


// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', 'SD-23-Y-C')
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
  });
  
// split into subgrids 
var subcarta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_subgrids')
    .filterMetadata('grid', 'equals', 'SD-23-Y-C');
    

// areas protegidas
var aps = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/areas-protegidas')
  .filterBounds(carta)




Export.table.toDrive({
		collection: aps,
    description: 'SD-23-Y-C_protectedAreas',
    folder: output,
    fileFormat: 'SHP',
});


Export.table.toDrive({
		collection: carta,
    description: 'SD-23-Y-C_Carta',
    folder: output,
    fileFormat: 'SHP',
});

Export.table.toDrive({
		collection: subcarta,
    description: 'SD-23-Y-C_subCarta',
    folder: output,
    fileFormat: 'SHP',
});

// export 
Export.image.toDrive({
		image:mode,
    description: 'SD-23-Y-C_segmentsMode_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: raw,
    description: 'SD-23-Y-C_classification_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: segments,
    description: 'SD-23-Y-C_segments_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: terra_class,
    description: 'SD-23-Y-C_terraClass_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: df_ref,
    description: 'SD-23-Y-C_refDistritoFederal_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median', 'nir_median', 'red_median']),
    description: 'SD-23-Y-C_sentinelMedian_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_prev.select(['swir1_median', 'nir_median', 'red_median']),
    description: 'SD-23-Y-C_sentinelMedianPrev_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_post.select(['swir1_median', 'nir_median', 'red_median']),
    description: 'SD-23-Y-C_sentinelMedianPost_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_prev.select(['swir1_median_wet', 'nir_median_wet', 'red_median_wet']),
    description: 'SD-23-Y-C_sentinelMedianWetPrev_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_post.select(['swir1_median_wet', 'nir_median_wet', 'red_median_wet']),
    description: 'SD-23-Y-C_sentinelMedianWetPost_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median_wet', 'nir_median_wet', 'red_median_wet']),
    description: 'SD-23-Y-C_sentinelMedianWet_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic.select(['swir1_median_dry', 'nir_median_dry', 'red_median_dry']),
    description: 'SD-23-Y-C_sentinelMedianDry_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_prev.select(['swir1_median_dry', 'nir_median_dry', 'red_median_dry']),
    description: 'SD-23-Y-C_sentinelMedianDryPrev_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});

Export.image.toDrive({
		image: mosaic_post.select(['swir1_median_dry', 'nir_median_dry', 'red_median_dry']),
    description: 'SD-23-Y-C_sentinelMedianDryPost_v1',
    folder: output,
    region: tile.geometry(),
    scale: 10,
    maxPixels: 1e13,
    skipEmptyTiles: true,
    fileFormat: 'GeoTIFF',
});
