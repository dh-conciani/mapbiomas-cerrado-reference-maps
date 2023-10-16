// export spectral signatures
// dhemerson.costa@ipam.org.br

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// input metadata
var version_output = 1;

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
});

// read sentinel-2 mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filterBounds(carta);
  
  Map.addLayer(mosaic)
  


// import sample points
samples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_samplePoints_v1');

// compute aditional bands for thye sentinel-2 mosaic
//var geo_coordinates =ee.Image.pixelLonLat().clip(carta)
//    ## get latitude
//    lat <- geo_coordinates$select('latitude')$add(5)$multiply(-1)$multiply(1000)$toInt16()
//    ## get longitude
//    lon_sin <- geo_coordinates$select('longitude')$multiply(pi)$divide(180)$
//      sin()$multiply(-1)$multiply(10000)$toInt16()$rename('longitude_sin')
//    ## cosine
//    lon_cos <- geo_coordinates$select('longitude')$multiply(pi)$divide(180)$
//      cos()$multiply(-1)$multiply(10000)$toInt16()$rename('longitude_cos')
