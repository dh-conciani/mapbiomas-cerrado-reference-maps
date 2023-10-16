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

// set reference year
var year = 2020;

// import sample points
var samples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_samplePoints_v1');

// compute aditional bands for thye sentinel-2 mosaic
var geo_coordinates = ee.Image.pixelLonLat().clip(carta);
// get latitude
var lat = geo_coordinates.select('latitude').add(5).multiply(-1).multiply(1000).toInt16();
// get longitude
var lon_sin = geo_coordinates.select('longitude').multiply(Math.PI).divide(180)
  .sin().multiply(-1).multiply(10000).toInt16().rename('longitude_sin');
// longitude cosine
var lon_cos = geo_coordinates.select('longitude').multiply(Math.PI).divide(180)
  .cos().multiply(-1).multiply(10000).toInt16().rename('longitude_cos');

// get heigth above nearest drainage
var hand = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().toInt16()
  .clip(carta).rename('hand');
  
// get the sentinel mosaic for the classification year
var mosaic_i = mosaic.filterMetadata('year', 'equals', year).mosaic();

// plot sentinel mosaic
Map.addLayer(mosaic, {'bands': ['swir1_median', 'nir_median', 'red_median'],
  'gain': [0.08, 0.07, 0.2], 'gamma': 0.85}, 'Sentinel ' + year, true);
  
// build mosaic with complementary bands
mosaic_i = mosaic_i.addBands(lat).addBands(lon_sin).addBands(lon_cos).addBands(hand);

// apply style over the points
var paletteMapBiomas = require('users/mapbiomas/modules:Palettes.js').get('classification8');
var newSamplesStyled = samples.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(paletteMapBiomas)
                .get(feature.get('reference')),
            'width': 1,
        });
    }
).style(
    {
        'styleProperty': 'style'
    }
);

Map.addLayer(newSamplesStyled, {}, 'trainingSamples');

// get training samples
var training_i = mosaic_i.sampleRegions({'collection': samples,
                                         'scale': 10,
                                         'geometries': true,
                                         'tileScale': 2});
// export as GEE asset
Export.table.toAsset({'collection': training_i,
                      'description': id_carta + '_training_v' + version_output,
                      'assetId':  output_dir + '/' + id_carta + '_training_v' + version_output});
