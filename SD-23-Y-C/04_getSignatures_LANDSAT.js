// export spectral signatures
// dhemerson.costa@ipam.org.br

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// define platform 
var platform = 'LANDSAT';

// input metadata
var version_output = 1;

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/embeddings';

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
});

// read sentinel-2 mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/BRAZIL/mosaics-2')
  .filterBounds(carta);

// set reference year
var year = 2020;

// import sample points
var samples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_samplePoints_v1');

// get heigth above nearest drainage
var hand = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().toInt16()
  .clip(carta).rename('hand');
  
// get the sentinel mosaic for the classification year
var mosaic_i = mosaic.filterMetadata('year', 'equals', year)
  .mosaic()
  .clip(carta);

// plot sentinel mosaic
Map.addLayer(mosaic_i, {'bands': ['swir1_median', 'nir_median', 'red_median'],
  'gain': [0.08, 0.07, 0.2], 'gamma': 0.85}, 'Sentinel ' + year, true);
  
// build mosaic with complementary bands
mosaic_i = mosaic_i.addBands(hand);

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
                      'description': id_carta + '_' + platform + '_training_v' + version_output,
                      'assetId':  output_dir + '/'  + id_carta + '_' + platform + '_training_v' + version_output});
