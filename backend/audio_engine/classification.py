CLASSIFICATION_RANGES = [
    (-10, 25,  'Normal',             'طبيعي'),
    (26,  40,  'Mild',               'خفيف'),
    (41,  55,  'Moderate',           'متوسط'),
    (56,  70,  'Moderately Severe',  'متوسط-شديد'),
    (71,  90,  'Severe',             'شديد'),
    (91,  120, 'Profound',           'عميق'),
]


def classify_hearing(thresholds: dict) -> dict:
    # Use the four main speech frequencies for PTA calculation
    main_freqs = [500, 1000, 2000, 4000]
    available = [
        thresholds[f] for f in main_freqs
        if f in thresholds and thresholds[f] is not None
    ]
    if not available:
        return {'error': 'Insufficient thresholds for classification'}

    # Compute pure-tone average
    pta = sum(available) / len(available)
    classification = 'Unknown'
    classification_ar = 'غير معروف'

    # Match PTA to classification range
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
        'disclaimer': 'This is a preliminary assessment, not a medical diagnosis',
    }


def classify_loss_type(
    air_thresholds: dict,
    bone_thresholds: dict
) -> dict:
    """
    Determine hearing loss type based on air-bone gap:
    - Conductive: bone normal + air impaired
    - Sensorineural: bone and air equally impaired
    - Mixed: bone impaired + air impaired at higher severity
    """
    common_freqs = set(air_thresholds.keys()) & set(bone_thresholds.keys())
    if not common_freqs:
        return {'error': 'No common frequencies to compare'}

    # Compute air-bone gap per frequency
    gaps = {}
    for freq in common_freqs:
        air = air_thresholds[freq]
        bone = bone_thresholds[freq]
        if air is not None and bone is not None:
            gaps[freq] = round(air - bone, 1)

    if not gaps:
        return {'error': 'Insufficient data'}

    avg_gap = sum(gaps.values()) / len(gaps)

    # Classify loss type based on average gap
    if avg_gap <= 10:
        loss_type = 'Sensorineural'
        loss_type_ar = 'حسي عصبي'
        description_ar = 'Bone and air equally impaired'
    elif avg_gap > 10:
        # Check if bone is normal
        bone_pta = sum(bone_thresholds.values()) / len(bone_thresholds)
        if bone_pta <= 25:
            loss_type = 'Conductive'
            loss_type_ar = 'توصيلي'
            description_ar = 'Bone normal, air impaired'
        else:
            loss_type = 'Mixed'
            loss_type_ar = 'مختلط'
            description_ar = 'Bone impaired, air impaired at higher severity'
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