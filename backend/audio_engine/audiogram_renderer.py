# audio_engine/audiogram_renderer.py

FREQUENCY_ORDER = [250, 500, 1000, 2000, 4000, 8000]

# حدود الأوديوغرام الطبي
DB_MIN = -10
DB_MAX = 120

# تصنيف مناطق السمع حسب WHO
HEARING_ZONES = [
    {'label': 'Normal',            'label_ar': 'طبيعي',        'min': -10, 'max': 25},
    {'label': 'Mild',              'label_ar': 'خفيف',          'min': 26,  'max': 40},
    {'label': 'Moderate',          'label_ar': 'متوسط',         'min': 41,  'max': 55},
    {'label': 'Moderately Severe', 'label_ar': 'متوسط-شديد',   'min': 56,  'max': 70},
    {'label': 'Severe',            'label_ar': 'شديد',          'min': 71,  'max': 90},
    {'label': 'Profound',          'label_ar': 'عميق',          'min': 91,  'max': 120},
]


def render_audiogram(thresholds: dict, ear: str) -> dict:
    """
    تحويل العتبات السمعية إلى بيانات جاهزة للرسم البياني

    :param thresholds: {250: 30, 500: 35, 1000: 40, ...}
    :param ear: 'L' أو 'R'
    :return: بيانات الأوديوغرام كاملة
    """
    if not thresholds:
        return {'error': 'لا توجد عتبات للرسم'}

    # نقاط الرسم البياني
    points = []
    for freq in FREQUENCY_ORDER:
        if freq in thresholds and thresholds[freq] is not None:
            points.append({
                'frequency': freq,
                'threshold_db': thresholds[freq],
                'symbol': 'O' if ear == 'R' else 'X',
                'color': '#FF0000' if ear == 'R' else '#0000FF',
            })

    if not points:
        return {'error': 'لا توجد نقاط كافية للرسم'}

    # حساب PTA
    pta = _calculate_pta(thresholds)

    # تحديد منطقة السمع
    zone = _get_hearing_zone(pta) if pta is not None else None

    return {
        'ear': ear,
        'ear_label': 'الأذن اليمنى' if ear == 'R' else 'الأذن اليسرى',
        'points': points,
        'pta': pta,
        'hearing_zone': zone,
        'x_axis': {
            'label': 'Frequency (Hz)',
            'values': FREQUENCY_ORDER,
        },
        'y_axis': {
            'label': 'Hearing Level (dB HL)',
            'min': DB_MIN,
            'max': DB_MAX,
            'inverted': True,  # الأوديوغرام مقلوب — الأسوأ في الأسفل
        },
        'zones': HEARING_ZONES,
    }


def render_combined(air_thresholds: dict, bone_thresholds: dict, ear: str) -> dict:
    """
    يجمع مسار الهوائي والعظمي في مخطط واحد جاهز للرسم.

    :param air_thresholds:  {250: 50, 500: 55, ...}
    :param bone_thresholds: {250: 20, 500: 25, ...}
    :param ear: 'R' أو 'L'
    """
    is_right = ear == 'R'
    color = '#FF0000' if is_right else '#0000FF'

    air_points = []
    for freq in FREQUENCY_ORDER:
        db = air_thresholds.get(freq)
        if db is not None:
            air_points.append({
                'frequency': freq,
                'threshold_db': db,
                'symbol': 'O' if is_right else 'X',
                'color': color,
                'line_style': 'solid',
            })

    bone_points = []
    for freq in FREQUENCY_ORDER:
        db = bone_thresholds.get(freq)
        if db is not None:
            bone_points.append({
                'frequency': freq,
                'threshold_db': db,
                'symbol': ']' if is_right else '[',
                'color': color,
                'line_style': 'dashed',
            })

    air_pta = _calculate_pta(air_thresholds)
    bone_pta = _calculate_pta(bone_thresholds)

    return {
        'ear': ear,
        'ear_label': 'الأذن اليمنى' if is_right else 'الأذن اليسرى',
        'air_conduction': {
            'points': air_points,
            'pta': air_pta,
            'hearing_zone': _get_hearing_zone(air_pta) if air_pta else None,
        },
        'bone_conduction': {
            'points': bone_points,
            'pta': bone_pta,
            'hearing_zone': _get_hearing_zone(bone_pta) if bone_pta else None,
        },
        'x_axis': {'label': 'Frequency (Hz)', 'values': FREQUENCY_ORDER},
        'y_axis': {'label': 'Hearing Level (dB HL)', 'min': DB_MIN, 'max': DB_MAX, 'inverted': True},
        'zones': HEARING_ZONES,
    }


def render_both_ears(left_thresholds: dict, right_thresholds: dict) -> dict:
    """
    رسم أوديوغرام لكلتا الأذنين معاً
    """
    return {
        'right': render_audiogram(right_thresholds, 'R'),
        'left': render_audiogram(left_thresholds, 'L'),
        'comparison': _compare_ears(left_thresholds, right_thresholds),
    }


def _calculate_pta(thresholds: dict) -> float | None:
    """
    حساب Pure Tone Average للترددات الأربعة الرئيسية
    """
    main_freqs = [500, 1000, 2000, 4000]
    available = [thresholds[f] for f in main_freqs if f in thresholds and thresholds[f] is not None]

    if not available:
        return None

    return round(sum(available) / len(available), 1)


def _get_hearing_zone(pta: float) -> dict | None:
    """
    تحديد منطقة السمع بناءً على PTA
    """
    for zone in HEARING_ZONES:
        if zone['min'] <= pta <= zone['max']:
            return zone
    return None


def _compare_ears(left: dict, right: dict) -> dict:
    """
    مقارنة بسيطة بين الأذنين
    """
    pta_left = _calculate_pta(left)
    pta_right = _calculate_pta(right)

    if pta_left is None or pta_right is None:
        return {'error': 'لا تتوفر بيانات كافية للمقارنة'}

    diff = round(abs(pta_left - pta_right), 1)

    return {
        'pta_left': pta_left,
        'pta_right': pta_right,
        'difference': diff,
        'symmetric': diff <= 10,  # فرق أقل من 10dB = متماثل
        'worse_ear': 'L' if pta_left > pta_right else 'R' if pta_right > pta_left else 'equal',
    }