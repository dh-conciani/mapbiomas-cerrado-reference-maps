// export spectral signatures
// dhemerson.costa@ipam.org.br

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// define platform 
var platform = 'MAPBIOMAS';

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

// read 
// set reference year
var year = 2020;

// Load collection.
var mosaic = ee.ImageCollection('users/dh-conciani/embeddings/ref-carta');

// import sample points
var samples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_LANDSAT_training_v1');

// get the sentinel mosaic for the classification year
var mosaic_i = mosaic
  .filterBounds(carta)
  .mosaic();

// Visualize three axes of the embedding space as an RGB.
var visParams = {min: 0, max: 150, bands: ['b1', 'b2', 'b3']};
Map.addLayer(mosaic_i, visParams, year + ' embeddings');

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
