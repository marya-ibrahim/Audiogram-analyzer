CLASSIFICATION_RANGES = [
    (-10, 25,  'Normal',             'طبيعي'),
    (26,  40,  'Mild',               'خفيف'),
    (41,  55,  'Moderate',           'متوسط'),
    (56,  70,  'Moderately Severe',  'متوسط-شديد'),
    (71,  90,  'Severe',             'شديد'),
    (91,  120, 'Profound',           'عميق'),
]


def classify_hearing(thresholds: dict) -> dict:
    main_freqs = [500, 1000, 2000, 4000]
    available = [
        thresholds[f] for f in main_freqs
        if f in thresholds and thresholds[f] is not None
    ]
    if not available:
        return {'error': 'لا توجد عتبات كافية للتصنيف'}

    pta = sum(available) / len(available)
    classification = 'Unknown'
    classification_ar = 'غير معروف'

    for low, high, eng, ar in CLASSIFICATION_RANGES:
        if low <= pta <= high:
            classification = eng
            classification_ar = ar
            break

    return {
        'pta': round(pta, 1),
        'classification': classification,
        'classification_ar': classification_ar,
        'thresholds': thresholds,
        'needs_bone_conduction': pta > 25,
        'disclaimer': 'هذا تقييم أولي وليس تشخيصاً طبياً',
    }


def classify_loss_type(
    air_thresholds: dict,
    bone_thresholds: dict
) -> dict:
    """
    تحديد نوع فقدان السمع بناءً على رد الدكتور:
    - توصيلي: العظمي طبيعي + الهوائي ضعيف
    - حسي عصبي: العظمي والهوائي مصابان بنفس الشدة
    - مختلط: العظمي مصاب + الهوائي مصاب بشدة أعلى
    """
    common_freqs = set(air_thresholds.keys()) & set(bone_thresholds.keys())
    if not common_freqs:
        return {'error': 'لا توجد ترددات مشتركة للمقارنة'}

    gaps = {}
    for freq in common_freqs:
        air = air_thresholds[freq]
        bone = bone_thresholds[freq]
        if air is not None and bone is not None:
            gaps[freq] = round(air - bone, 1)

    if not gaps:
        return {'error': 'لا توجد بيانات كافية'}

    avg_gap = sum(gaps.values()) / len(gaps)

    # تصنيف نوع الفقدان حسب الدكتور
    if avg_gap <= 10:
        loss_type = 'Sensorineural'
        loss_type_ar = 'حسي عصبي'
        description_ar = 'العظمي والهوائي مصابان بنفس الشدة'
    elif avg_gap > 10:
        # فحص إذا كان العظمي طبيعي
        bone_pta = sum(bone_thresholds.values()) / len(bone_thresholds)
        if bone_pta <= 25:
            loss_type = 'Conductive'
            loss_type_ar = 'توصيلي'
            description_ar = 'العظمي طبيعي والهوائي ضعيف'
        else:
            loss_type = 'Mixed'
            loss_type_ar = 'مختلط'
            description_ar = 'العظمي مصاب والهوائي مصاب بشدة أعلى'
    else:
        loss_type = 'Unknown'
        loss_type_ar = 'غير محدد'
        description_ar = ''

    return {
        'loss_type': loss_type,
        'loss_type_ar': loss_type_ar,
        'description_ar': description_ar,
        'average_gap': round(avg_gap, 1),
        'gaps_per_frequency': gaps,
    }