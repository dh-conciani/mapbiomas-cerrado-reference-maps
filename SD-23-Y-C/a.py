#=======================================#
#========== SAD-CERRADO ================#
#=======================================#
# Calculo de rasters de desmatamento
# autor: Juan Doblas (juandb@gmail.com)
#=======================================#
#
import ee, sys
from lib import add_date_band, mask_fire_col_nmonths, getMaskedS2SR, get_normalized_s2_band,computeS2indexes,add_vegetation_band, mark_current_warnings
from get_config import get_config
from dl_utils import create_ee_folder

ee.Initialize()
USAGE = f"Usage: python {sys.argv[0]} initial_tile final_tile detection_month_YYMM [output_asset_collection]"

#=====================================================================
# LEITURA DE PARAMETROS DE USUÁRIO
# =====================================================================
# Configurações gerais
config              = get_config()
aois_asset          = config['GENERAL']['SECTORS_ASSET']
AOIs                = ee.FeatureCollection(aois_asset)
ROOT_PATH           = config['GENERAL']['ROOT_FOLDER'] 
MMU                 = eval(config['GENERAL']['MMU'])
biome_limits_asset  = config['GENERAL']['BIOME_ASSET']
biome_limits        = ee.Feature(ee.FeatureCollection(biome_limits_asset).first()).geometry()

if ROOT_PATH[-1] != '/': ROOT_PATH += '/'

# Configurações de fatiamento
tconfig                     = config['THRESHOLDING']
INDEX                       = tconfig['INDEX']
warning_col_asset_name      = ROOT_PATH+'anomaly_rasters'
general_scale               = eval(tconfig['PIXEL_SIZE'])
buffer_dist                 = eval(tconfig['NORM_BUFFER'])
norm_scale                  = eval(tconfig['NORM_SCALE'])
norm_reducer_perc           = eval(tconfig['NORM_PERCENTILE'])
compute_daily_mosaics       = eval(tconfig['COMPUTE_DAILY_MOSAICS'])
mask_negative_index_values  = eval(tconfig['MASK_NEGATIVE_VALUES'])
norm_reducer                = ee.Reducer.percentile([norm_reducer_perc])
threshold_sn                = ee.Image(tconfig['THRESHOLD_NORMALIZED'])
threshold_absolute          = ee.Image(tconfig['THRESHOLD_ABSOLUTE'])
nivel_confirmacao           = eval(tconfig['THRESHOLD_CONFIRMATION'])
detection_collection_length_months = eval(tconfig['DETECTION_COL_LENGTH_MNTH'])
collection_gap_months       = eval(tconfig['DETECTION_COL_GAP_MNTH'])
learning_collection_length_years = eval(tconfig['REF_COL_LENGTH_YRS'])
months_after_fire           = eval(tconfig['EMBARGO_FIRE_MNTH'])
fire_col                    = tconfig['FIRE_COLS']
tipo_vegetacao              = ee.Image(tconfig['VEGETATION_TYPE_ASSET'])
asset_geomorfologia         = ee.Image(tconfig['GEOMORPHOLOGY_TYPE_ASSET'])
asset_agua                   = ee.Image(tconfig['WATER_ASSET'])

# FUNÇÃO PRINCIPAL DE DETECÇAO
def get_warnings_data(date_ref,AOI):
     
    date_end    = ee.Date(date_ref)
    date_begin  = date_end.advance(-detection_collection_length_months,'months')
    
    # Determina área de interesse como sendo o setor do grid selecionado
    AOI = ee.Feature(AOI).geometry()#.intersection(biome_limits,1)
 
    #==============================================================================================
    # 1 - Calcula coleção de referencia
    date_ref_end   = date_begin.advance(-collection_gap_months,'months')
    date_ref_begin = date_ref_end.advance(-learning_collection_length_years,'years')
    # pega as imagens
    col_nonorm = getMaskedS2SR(date_ref_begin,date_end,AOI.buffer(buffer_dist),general_scale)
    # Calcula indices
    col_nonorm = computeS2indexes(col_nonorm)
    # Seleciona banda a ser normalizada
    col_nonorm = col_nonorm.select(INDEX)

    # Mascaramento mes a mes por fogo
    col_nonorm = mask_fire_col_nmonths(col_nonorm,months_after_fire,fire_col)
    
    # Adiciona banda de tipo de vegetacao, marcando áreas já desmatadas detectadas pelo PRODES
    col_nonorm = add_vegetation_band(col_nonorm, tipo_vegetacao)
    
    # Trata áreas já detectadas pelo sistema
    previous_warnings_folder = f'{ROOT_PATH}REFINADOS'
    initial_masking_date = ee.Date('2021-06-01')
    col_nonorm = mark_current_warnings(col_nonorm,previous_warnings_folder,initial_masking_date,date_end)

    # Definição de mascara de vegetação incluindo desmatamentos detectados pelo sistema (marcados como veg_type = 0)
    veg_mask = col_nonorm.select('type_veg').min().gt(0).selfMask()

    #print(col_ref_nonorm.size().getInfo())
    print (f'Normalizing {INDEX}...')
    # Normalizacao
    def normalization_function(img):
        return get_normalized_s2_band(INDEX,img,norm_reducer,norm_scale,buffer_dist)  
    
    col_norm = col_nonorm.map(normalization_function)
    
    # Mascaramento usando mascara de vegetação atualizada
    col_norm = col_norm.map(lambda img: img.updateMask(veg_mask))
    
    # Definição de imagem de referencia
    col_ref_norm = col_norm.filterDate(date_ref_begin,date_ref_end)
    ref_median = col_ref_norm.select('NDVI_N').median()
    # Mascaramento por declividade
    slope = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003"))
    slope_mask = slope.gt(25).focal_max(2)
    ref_median = ref_median.updateMask(slope_mask.unmask(0,False).Not())

    # Mascara geomorfologia
    geomorfologia_raster = asset_geomorfologia
    mask_geom = geomorfologia_raster.remap([23,28,29,32,36,37],[1,1,1,1,1,1]).unmask(0,False).Not().selfMask()
    ref_median = ref_median.updateMask(mask_geom)
    
    # Mascara agua
    # TODO: avaliar Mapbiomas agua
    mask_agua = asset_agua.select('max_extent').unmask(0,False).Not().selfMask()
    ref_median = ref_median.updateMask(mask_agua)
    
    #==============================================================
    # 2 - Definição de coleção de detecção, adição de banda de data
    col_detect = col_norm.filterDate(date_begin,date_end)\
        .map(add_date_band)\
        .sort('system:time_start')
    #==============================================================
    # 3- Filtro fogo (comentado pq foi aplicado sobre toda a colecao)
    #col_detect =  mask_fire_col(col_detect)
    
    #==============================================================
    # 4 - Normalização temporal
    col_detect = col_detect\
        .select('NDVI_N')\
        .map(lambda img: img.subtract(ref_median).copyProperties(img,['system:time_start'])) \
        .combine(col_detect.select(['NDVI','date']))

    # =========================================================
    # 5 - Fatiamento
    def double_thresholding (img):
        return img.select('NDVI_N').lt(threshold_sn).multiply(
           img.select('NDVI').lt(threshold_absolute)
           ).copyProperties(img,['system:time_start'])
                
    def acum(inew, i0):
        inew = ee.Image(inew)
        date = ee.Image.constant(ee.Number.parse(inew.date().format('YYDDD')).toInt16()).updateMask(inew.mask())
        max = ee.Image(i0).select(0)
        cum = ee.Image(i0).select(1)
        date_first = ee.Image(i0).select(2)
        date_max1 = ee.Image(i0).select(3)
        date_max2 = ee.Image(i0).select(4)
        cum = cum.where(inew.eq(1),cum.add(1))
        cum = cum.where(inew.eq(0), 0)
        max = max.where(cum.gt(max), cum)
    
        date_first = date_first.where(cum.eq(1),date).rename('date_first')
        date_max1 = date_max1.where(cum.eq(nivel_confirmacao),date_first).rename('date_max1')
        date_max2 = date_max2.where(date_max1.lt(date_max2),date_max1).rename('date_max2')
        return max.addBands(cum).addBands(date_first).addBands(date_max1).addBands(date_max2)
    
    max_m = 32767
    detection = ee.Image(col_detect.map(double_thresholding).iterate(acum, ee.Image([0,0,0,max_m,max_m])))
    count = detection.select(0)
    detection_date = detection.select(4)
    
    flag_img = count.gte(nivel_confirmacao).selfMask()
    detection_date = detection_date.updateMask(flag_img.mask())
    
    # =========================================================
    # 6 - Elimina pequenos patches
    min_number_of_pixels = MMU*10000/(general_scale*general_scale)
    little_ones = flag_img\
          .connectedPixelCount(eightConnected = False, maxSize = min_number_of_pixels+1)\
          .lte(min_number_of_pixels)
    flag_img_clean = flag_img.updateMask(little_ones.unmask(0,False).Not()).toByte().rename('flag')
    
    # =========================================================
    # 7 - Calcula raster final com camadas de informação
    warning_raster = flag_img_clean\
        .addBands(ee.Image(ee.Number.parse(date_end.advance(-1,'month').format('YYMM'))).rename('detect_month').toInt16())\
        .addBands(count.rename('count').toInt16())\
        .addBands(detection_date.rename('date_detect').toInt64())\
        .updateMask(flag_img_clean.gt(0))
        
    # =========================================================
    # 8 - Retorna resultados com data de detecção
    return warning_raster.set('system:time_start',date_end.advance(-1,'month').millis()).clip(AOI)

#======================================================================
def main():
    global warning_col_asset_name
    args = sys.argv[1:]
    if not args:
        raise SystemExit(USAGE)
    if args[0] != "debug":
        debug = False
        if len(args) < 3:
            raise SystemExit(USAGE)
        else:
            initial_tile = int(args[0])
            final_tile   = int(args[1])
            detect_month = int(args[2])
        if len(args)>3:
                warning_col_asset_name = args[3]
                print(f"Using output asset collection = {args[3]}")
    else:
        print ('Entering in debug mode. May the force be with you!')
        debug = True
        initial_tile = 10
        final_tile = 10
     
    # Initialize folders
    #create_ee_folder(root_asset_folder)
    create_ee_folder(ROOT_PATH+'CANDIDATOS')
    create_ee_folder(ROOT_PATH+'VALIDADOS')
    create_ee_folder(ROOT_PATH+'REFINADOS')
   # Check if warning asset collection exists. If not, create it
    try:
        ee.data.getAsset(warning_col_asset_name)
    except Exception as excp:
        print(excp)
        print ("Trying to create asset")
        try:
            ee.data.createAsset({'type': 'ImageCollection'}, warning_col_asset_name)
            print ('Done.')
        except:
            print ("Unable to create warning asset.")
            sys.exit()

    # BEGIN EXECUTION
    # Compute area to be used
    AOIs_ids = AOIs.aggregate_array('id').sort()
    AOIs_to_process = AOIs_ids.slice(initial_tile-1,final_tile).getInfo()
    # DETECTION BEGINS HERE
    # Detection loop
    # DETECÇÃO Sequencial
    for AOI_number in AOIs_to_process:
        # Calcula área de detecção
        AOI = ee.Feature(AOIs.filterMetadata('id','equals',AOI_number).first())
        if debug: 
            detect_month= 2208
            #AOI_number = 'TEST'
            #detect_date = ee.Date('2021-08-01')
            AOI = ee.Feature(ee.Geometry.Point([-59.41615,-13.33377]).buffer(10000).bounds(),{"system:index": "0"})
        print (f'Processing tile {AOI_number}...')
        # Calcula datas de detecção
        detect_month_ee = ee.Date.parse('yyMM',ee.Number(detect_month).format())
        detect_date = detect_month_ee.advance(1,'month')
        # Calcula raster de detecção
        warning_raster = get_warnings_data(detect_date,AOI)
        export_name = f'warning_raster_{detect_month}_{AOI_number}'
        if debug: export_name = 'test_anomaly'
        task = ee.batch.Export.image.toAsset(**{
            'image': warning_raster.toInt16(),
            'description': export_name,
            'assetId': warning_col_asset_name + '/'+export_name,
            'region': AOI.geometry(),
            'scale': general_scale,
            'maxPixels': 18151716390
        })
        task.start()
        print("Done.")


if __name__ == '__main__':
    main()
