"""
ICD-11 Code Mapping and Disease Classification for Fraud Detection
Maps ICD-9/ICD-10 codes to ICD-11 and extracts risk features
"""

# ICD-11 Chapter Categories (for feature extraction)
ICD11_CHAPTERS = {
    "01": "Infectious diseases",
    "02": "Neoplasms",
    "03": "Blood diseases",
    "04": "Immune system diseases",
    "05": "Endocrine diseases",
    "06": "Mental disorders",
    "07": "Sleep-wake disorders",
    "08": "Nervous system diseases",
    "09": "Visual system diseases",
    "10": "Ear diseases",
    "11": "Circulatory diseases",
    "12": "Respiratory diseases",
    "13": "Digestive diseases",
    "14": "Skin diseases",
    "15": "Musculoskeletal diseases",
    "16": "Genitourinary diseases",
    "17": "Sexual health conditions",
    "18": "Pregnancy conditions",
    "19": "Perinatal conditions",
    "20": "Developmental anomalies",
    "21": "Symptoms not classified",
    "22": "Injury/poisoning",
    "23": "External causes",
    "24": "Factors influencing health",
    "25": "Traditional medicine",
    "26": "Supplementary codes",
}

# Common ICD-9/10 to ICD-11 mappings (subset for fraud detection)
ICD_MAPPING = {
    # Cardiovascular
    "4019": {"icd11": "BA00", "chapter": "11", "risk_weight": 1.2},
    "4280": {"icd11": "BD10", "chapter": "11", "risk_weight": 1.3},
    "41401": {"icd11": "BA80", "chapter": "11", "risk_weight": 1.4},
    "41400": {"icd11": "BA80", "chapter": "11", "risk_weight": 1.4},
    "4111": {"icd11": "BA41", "chapter": "11", "risk_weight": 1.5},
    "412": {"icd11": "BA41", "chapter": "11", "risk_weight": 1.5},
    "431": {"icd11": "8B01", "chapter": "08", "risk_weight": 1.6},
    "43491": {"icd11": "8B11", "chapter": "08", "risk_weight": 1.5},
    
    # Respiratory
    "486": {"icd11": "CA40", "chapter": "12", "risk_weight": 1.1},
    "49121": {"icd11": "CA22", "chapter": "12", "risk_weight": 1.2},
    "49122": {"icd11": "CA22", "chapter": "12", "risk_weight": 1.2},
    "496": {"icd11": "CA22", "chapter": "12", "risk_weight": 1.2},
    "51881": {"icd11": "CB41", "chapter": "12", "risk_weight": 1.4},
    
    # Diabetes
    "25000": {"icd11": "5A10", "chapter": "05", "risk_weight": 1.1},
    "25002": {"icd11": "5A11", "chapter": "05", "risk_weight": 1.2},
    "25060": {"icd11": "5A14", "chapter": "05", "risk_weight": 1.3},
    "25062": {"icd11": "5A14", "chapter": "05", "risk_weight": 1.3},
    
    # Kidney
    "5849": {"icd11": "GB60", "chapter": "16", "risk_weight": 1.4},
    "5853": {"icd11": "GB61", "chapter": "16", "risk_weight": 1.5},
    "5856": {"icd11": "GB61", "chapter": "16", "risk_weight": 1.6},
    "5990": {"icd11": "GC00", "chapter": "16", "risk_weight": 1.1},
    
    # Mental health
    "29590": {"icd11": "6A20", "chapter": "06", "risk_weight": 1.0},
    "29623": {"icd11": "6A60", "chapter": "06", "risk_weight": 1.0},
    "30000": {"icd11": "6B00", "chapter": "06", "risk_weight": 1.0},
    "30391": {"icd11": "6C40", "chapter": "06", "risk_weight": 1.1},
    
    # Musculoskeletal
    "71590": {"icd11": "FA00", "chapter": "15", "risk_weight": 1.0},
    "71536": {"icd11": "FA01", "chapter": "15", "risk_weight": 1.8},  # Hip replacement
    "72283": {"icd11": "FA80", "chapter": "15", "risk_weight": 1.2},
    "73300": {"icd11": "FB80", "chapter": "15", "risk_weight": 1.1},
    
    # Digestive
    "53081": {"icd11": "DA22", "chapter": "13", "risk_weight": 1.0},
    "5601": {"icd11": "DB30", "chapter": "13", "risk_weight": 1.3},
    "5679": {"icd11": "DB90", "chapter": "13", "risk_weight": 1.2},
    "56212": {"icd11": "DB10", "chapter": "13", "risk_weight": 1.1},
    
    # Infections
    "0380": {"icd11": "1G40", "chapter": "01", "risk_weight": 1.3},
    "0388": {"icd11": "1G41", "chapter": "01", "risk_weight": 1.3},
    "0389": {"icd11": "1G41", "chapter": "01", "risk_weight": 1.3},
    "03842": {"icd11": "1G41", "chapter": "01", "risk_weight": 1.5},
    "042": {"icd11": "1C60", "chapter": "01", "risk_weight": 1.4},
    
    # Neoplasms
    "1536": {"icd11": "2B60", "chapter": "02", "risk_weight": 1.8},
    "1970": {"icd11": "2D40", "chapter": "02", "risk_weight": 1.9},
    
    # Injury
    "82021": {"icd11": "NC72", "chapter": "22", "risk_weight": 1.7},
    "82100": {"icd11": "NC72", "chapter": "22", "risk_weight": 1.7},
    "920": {"icd11": "NA00", "chapter": "22", "risk_weight": 1.0},
}

# High-cost procedure indicators (for fraud risk)
HIGH_COST_PROCEDURES = {
    "3612": 1.8,  # CABG
    "3950": 1.7,  # Vessel surgery
    "3995": 1.6,  # Hemodialysis
    "4139": 1.5,  # Coronary procedures
    "66": 1.3,    # Cardioversion
    "7935": 1.6,  # Fracture reduction
    "8151": 2.0,  # Hip replacement
    "8801": 1.4,  # Ultrasound
    "8872": 1.3,  # Echocardiography
    "9671": 1.5,  # Mechanical ventilation
    "9672": 1.5,  # Mechanical ventilation
    "9904": 1.2,  # Transfusion
}

ICD11_RISK_MAPPING = {
    mapping['icd11']: mapping['risk_weight']
    for mapping in ICD_MAPPING.values()
    if mapping.get('icd11')
}


def get_icd11_category(icd_code: str) -> str:
    """Return the mapped ICD-11 code for an ICD-9/10 diagnosis code."""
    mapping = map_to_icd11(icd_code)
    return mapping.get('icd11')


def map_to_icd11(icd_code: str) -> dict:
    """Map ICD-9/10 code to ICD-11 with risk features"""
    if not icd_code or icd_code == "NA":
        return {"icd11": None, "chapter": None, "risk_weight": 1.0}
    
    # Clean the code
    code = str(icd_code).strip().upper().replace(".", "")
    
    # Look up mapping
    if code in ICD_MAPPING:
        return ICD_MAPPING[code]
    
    # Try partial match (first 3-4 chars)
    for length in [4, 3]:
        partial = code[:length]
        if partial in ICD_MAPPING:
            return ICD_MAPPING[partial]
    
    # Default: assign chapter based on code range
    try:
        num = int(code[:3])
        if num < 140:
            chapter = "01"
        elif num < 240:
            chapter = "02"
        elif num < 280:
            chapter = "03"
        elif num < 290:
            chapter = "04"
        elif num < 320:
            chapter = "06"
        elif num < 390:
            chapter = "08"
        elif num < 460:
            chapter = "11"
        elif num < 520:
            chapter = "12"
        elif num < 580:
            chapter = "13"
        elif num < 630:
            chapter = "16"
        elif num < 680:
            chapter = "18"
        elif num < 710:
            chapter = "14"
        elif num < 740:
            chapter = "15"
        elif num < 760:
            chapter = "20"
        elif num < 780:
            chapter = "19"
        else:
            chapter = "21"
        return {"icd11": None, "chapter": chapter, "risk_weight": 1.0}
    except ValueError:
        return {"icd11": None, "chapter": None, "risk_weight": 1.0}


def get_procedure_risk(proc_code: str) -> float:
    """Get risk weight for procedure code"""
    if not proc_code or proc_code == "NA":
        return 1.0
    code = str(proc_code).strip()
    return HIGH_COST_PROCEDURES.get(code, 1.0)


def extract_diagnosis_features(diagnosis_codes: list) -> dict:
    """Extract features from a list of diagnosis codes"""
    features = {
        "num_diagnoses": 0,
        "has_cardiovascular": 0,
        "has_respiratory": 0,
        "has_diabetes": 0,
        "has_kidney": 0,
        "has_mental": 0,
        "has_musculoskeletal": 0,
        "has_cancer": 0,
        "has_infection": 0,
        "has_injury": 0,
        "total_risk_weight": 0.0,
        "max_risk_weight": 1.0,
        "unique_chapters": 0,
    }
    
    chapters_seen = set()
    valid_codes = [c for c in diagnosis_codes if c and c != "NA"]
    features["num_diagnoses"] = len(valid_codes)
    
    for code in valid_codes:
        mapping = map_to_icd11(code)
        chapter = mapping.get("chapter")
        risk = mapping.get("risk_weight", 1.0)
        
        features["total_risk_weight"] += risk
        features["max_risk_weight"] = max(features["max_risk_weight"], risk)
        
        if chapter:
            chapters_seen.add(chapter)
            if chapter == "11":
                features["has_cardiovascular"] = 1
            elif chapter == "12":
                features["has_respiratory"] = 1
            elif chapter == "05":
                features["has_diabetes"] = 1
            elif chapter == "16":
                features["has_kidney"] = 1
            elif chapter == "06":
                features["has_mental"] = 1
            elif chapter == "15":
                features["has_musculoskeletal"] = 1
            elif chapter == "02":
                features["has_cancer"] = 1
            elif chapter == "01":
                features["has_infection"] = 1
            elif chapter == "22":
                features["has_injury"] = 1
    
    features["unique_chapters"] = len(chapters_seen)
    
    return features


def extract_procedure_features(procedure_codes: list) -> dict:
    """Extract features from procedure codes"""
    features = {
        "num_procedures": 0,
        "total_procedure_risk": 0.0,
        "max_procedure_risk": 1.0,
        "has_high_cost_procedure": 0,
    }
    
    valid_codes = [c for c in procedure_codes if c and c != "NA"]
    features["num_procedures"] = len(valid_codes)
    
    for code in valid_codes:
        risk = get_procedure_risk(code)
        features["total_procedure_risk"] += risk
        features["max_procedure_risk"] = max(features["max_procedure_risk"], risk)
        if risk > 1.3:
            features["has_high_cost_procedure"] = 1
    
    return features
