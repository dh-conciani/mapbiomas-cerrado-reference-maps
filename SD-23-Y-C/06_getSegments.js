// apply segmentation over sentinel mosaic to refine a pixe-based classificaiton  
// dhemerson.costa@ipam.org.br

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// define output version
var output_version = 1; 

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read input classification 
var classification = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_classification_v1');

// read sentinel mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filter(ee.Filter.eq('year', 2020))
  .mosaic()
  .updateMask(classification);

// plot sentinel mosaic
Map.addLayer(mosaic, {'bands': ['swir1_median', 'nir_median', 'red_median'],
  'gain': [0.08, 0.07, 0.2], 'gamma': 0.85}, 'Sentinel 2020', true);

// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// plot classification
Map.addLayer(classification, vis, 'classification', false);

// perform segmentation
  // define function to compute segments
  var getSegments = function (image, size) {
    // define seed
    var seeds = ee.Algorithms.Image.Segmentation.seedGrid(
        {
            size: size,
            gridType: 'square'
        }
    );
    
    // create segments by using SNIC
    var snic = ee.Algorithms.Image.Segmentation.SNIC({
        image: image,
        size: size,
        compactness: 0.1,
        connectivity: 8,
        neighborhoodSize: 2 * size,
        seeds: seeds
    });
    
    // paste proerties
    snic = ee.Image(
        snic.copyProperties(image)
            .copyProperties(image, ['system:footprint'])
            .copyProperties(image, ['system:time_start']));

    return snic.select(['clusters'], ['segments']);
  };
  
// create segments
var segments = getSegments(
  // set input image to be segmented:
  mosaic.select(["red_median", "nir_median", "swir1_median"]), 
  // set segment size:
  10
).reproject('EPSG:4326', null, 10);

// plot on the map
Map.addLayer(segments.randomVisualizer(), {}, 'segments', false);
print('segments', segments);

// Export segments
Export.image.toAsset({
	image: segments,
  description: id_carta + '_segments_v' + output_version,
  assetId: output_dir + id_carta + '_segments_v' + output_version,
  pyramidingPolicy: 'mode',
  region: classification.geometry(),
  scale: 10,
  maxPixels: 1e13,
});
